"""
Azure Voice Live real-time voice SDK wrapper
Uses azure-ai-voicelive for real-time speech-to-speech with Azure OpenAI gpt-4o-realtime models.
Handles WebSocket connection, audio streaming, VAD, transcription, and interrupts.
"""

import os
import asyncio
from typing import Optional, Callable

from azure.identity.aio import DefaultAzureCredential
from azure.ai.voicelive.aio import connect
from azure.ai.voicelive.models import (
    AudioInputTranscriptionOptions,
    InputAudioFormat,
    Modality,
    OutputAudioFormat,
    RequestSession,
    ServerEventType,
    ServerVad,
)


class AzureRealtimeClient:
    """
    Azure Voice Live real-time voice client

    Wraps the azure-ai-voicelive SDK for WebSocket-based real-time voice
    interactions with Azure OpenAI gpt-4o-realtime models.

    Uses DefaultAzureCredential (AAD) for authentication.
    Processes events in a background task and dispatches to callbacks.
    """

    def __init__(
        self,
        endpoint: Optional[str] = None,
        credential: Optional[DefaultAzureCredential] = None,
        deployment: Optional[str] = None,
        voice: str = "alloy",
        system_message: Optional[str] = None,
    ):
        """
        Initialize Azure Realtime Client

        Args:
            endpoint: Azure OpenAI endpoint (defaults to AZURE_REALTIME_ENDPOINT env var)
            credential: Async Azure credential (defaults to DefaultAzureCredential)
            deployment: Model deployment name (defaults to VOICE_MODEL_DEPLOYMENT env var)
            voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
            system_message: System prompt for the AI model
        """
        self.endpoint = endpoint or os.getenv("AZURE_REALTIME_ENDPOINT")
        self.credential = credential or DefaultAzureCredential()
        self.deployment = deployment or os.getenv("VOICE_MODEL_DEPLOYMENT", "gpt-4o-realtime-preview")
        self.voice = voice
        self.system_message = system_message or self._default_system_message()

        # Connection state
        self._conn_ctx = None   # The async context manager
        self._conn = None       # The active VoiceLiveConnection
        self._event_task = None  # Background event processing task
        self.is_connected = False

        # Callbacks
        # on_audio_chunk(audio_bytes: bytes)
        self.on_audio_chunk: Optional[Callable[[bytes], None]] = None
        # on_transcript(text: str, is_final: bool, role: str)
        self.on_transcript: Optional[Callable[[str, bool, str], None]] = None
        # on_status_change(status: str)
        self.on_status_change: Optional[Callable[[str], None]] = None
        # on_error(error_msg: str)
        self.on_error: Optional[Callable[[str], None]] = None

        # Transcript buffers for streaming
        self._user_transcript_buffer = ""
        self._assistant_transcript_buffer = ""

        # Track whether the model is currently responding
        self._is_responding = False

    def _default_system_message(self) -> str:
        return (
            "You are Sage, an AI retirement planning assistant. You provide helpful, "
            "accurate advice on retirement planning, financial strategies, and investment options. "
            "Be conversational, empathetic, and clear in your responses."
        )

    async def connect(self) -> bool:
        """
        Connect to Azure Voice Live and start processing events.

        Returns:
            True if connected successfully, False otherwise
        """
        if not self.endpoint:
            raise ValueError("Azure endpoint must be provided via AZURE_REALTIME_ENDPOINT env var")

        try:
            print(f"Connecting to Azure Voice Live: {self.endpoint}")
            print(f"Model: {self.deployment}, Voice: {self.voice}")

            # Create and enter the async connection context
            self._conn_ctx = connect(
                endpoint=self.endpoint,
                credential=self.credential,
                model=self.deployment,
            )
            self._conn = await self._conn_ctx.__aenter__()

            # Configure the session (voice, VAD, audio format, transcription)
            await self._configure_session()

            self.is_connected = True

            # Start background event processing
            self._event_task = asyncio.create_task(self._event_loop())

            if self.on_status_change:
                self.on_status_change("connected")

            print("Voice Live connection established successfully")
            return True

        except Exception as e:
            error_msg = f"Failed to connect to Azure Voice Live: {e}"
            print(error_msg)
            if self.on_error:
                self.on_error(error_msg)
            return False

    async def _configure_session(self) -> None:
        """Configure the voice session with VAD, audio format, and transcription settings"""
        turn_detection_mode = os.getenv("VOICE_TURN_DETECTION_MODE", "server_vad")

        turn_detection = None
        if turn_detection_mode == "server_vad":
            turn_detection = ServerVad(
                threshold=float(os.getenv("VOICE_VAD_THRESHOLD", "0.5")),
                prefix_padding_ms=300,
                silence_duration_ms=int(os.getenv("VOICE_SILENCE_DURATION_MS", "700")),
            )
            print(f"VAD configured: threshold={turn_detection.threshold}, silence={turn_detection.silence_duration_ms}ms")
        else:
            print("Manual turn detection mode (no VAD)")

        session = RequestSession(
            modalities=[Modality.TEXT, Modality.AUDIO],
            instructions=self.system_message,
            voice=self.voice,
            input_audio_format=InputAudioFormat.PCM16,
            output_audio_format=OutputAudioFormat.PCM16,
            turn_detection=turn_detection,
            input_audio_transcription=AudioInputTranscriptionOptions(model="whisper-1"),
        )

        await self._conn.session.update(session=session)
        print(f"Session configured - Voice: {self.voice}")

    async def _event_loop(self) -> None:
        """Background task: process events from Azure Voice Live connection"""
        try:
            async for event in self._conn:
                await self._handle_event(event)
        except asyncio.CancelledError:
            print("Voice Live event loop cancelled")
        except Exception as e:
            error_msg = f"Voice Live event loop error: {e}"
            print(error_msg)
            if self.on_error:
                self.on_error(error_msg)

    async def _handle_event(self, event) -> None:
        """Dispatch a single event from Azure Voice Live to the appropriate callback"""
        try:
            if event.type == ServerEventType.SESSION_UPDATED:
                session_id = getattr(event.session, "id", "unknown") if hasattr(event, "session") else "unknown"
                print(f"Session updated: {session_id}")
                if self.on_status_change:
                    self.on_status_change("listening")

            elif event.type == ServerEventType.INPUT_AUDIO_BUFFER_SPEECH_STARTED:
                # VAD detected user started speaking — cancel any in-progress AI response
                if self._is_responding:
                    try:
                        await self._conn.response.cancel()
                        print("Interrupted AI response (user started speaking)")
                    except Exception as e:
                        print(f"Interrupt during speech: {e}")
                    self._is_responding = False
                if self.on_status_change:
                    self.on_status_change("listening")

            elif event.type == ServerEventType.INPUT_AUDIO_BUFFER_SPEECH_STOPPED:
                # VAD detected user stopped speaking — server will process, show "thinking"
                if self.on_status_change:
                    self.on_status_change("thinking")

            elif event.type == ServerEventType.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_DELTA:
                # Streaming user speech transcript
                delta = getattr(event, "delta", None)
                if delta and self.on_transcript:
                    self._user_transcript_buffer += delta
                    self.on_transcript(self._user_transcript_buffer, False, "user")

            elif event.type == ServerEventType.CONVERSATION_ITEM_INPUT_AUDIO_TRANSCRIPTION_COMPLETED:
                # Final user speech transcript
                transcript = getattr(event, "transcript", None) or self._user_transcript_buffer
                if transcript and self.on_transcript:
                    self.on_transcript(transcript, True, "user")
                self._user_transcript_buffer = ""

            elif event.type == ServerEventType.RESPONSE_CREATED:
                # AI response generation started
                self._is_responding = True
                if self.on_status_change:
                    self.on_status_change("speaking")

            elif event.type == ServerEventType.RESPONSE_AUDIO_DELTA:
                # Audio chunk from AI response
                if self.on_audio_chunk and event.delta:
                    self.on_audio_chunk(event.delta)

            elif event.type == ServerEventType.RESPONSE_AUDIO_TRANSCRIPT_DELTA:
                # Streaming assistant response transcript
                delta = getattr(event, "delta", None)
                if delta:
                    self._assistant_transcript_buffer += delta
                    if self.on_transcript:
                        self.on_transcript(self._assistant_transcript_buffer, False, "assistant")

            elif event.type == ServerEventType.RESPONSE_AUDIO_TRANSCRIPT_DONE:
                # Final assistant response transcript
                transcript = getattr(event, "transcript", None) or self._assistant_transcript_buffer
                if self.on_transcript:
                    self.on_transcript(transcript, True, "assistant")
                self._assistant_transcript_buffer = ""

            elif event.type == ServerEventType.RESPONSE_AUDIO_DONE:
                # Audio playback complete for this response
                pass

            elif event.type == ServerEventType.RESPONSE_DONE:
                # Full response complete - return to listening
                self._is_responding = False
                if self.on_status_change:
                    self.on_status_change("listening")

            elif event.type == ServerEventType.ERROR:
                error_msg = "Unknown error"
                if hasattr(event, "error") and hasattr(event.error, "message"):
                    error_msg = event.error.message
                print(f"Azure Voice Live error: {error_msg}")
                if self.on_error:
                    self.on_error(error_msg)

            elif event.type == ServerEventType.CONVERSATION_ITEM_CREATED:
                # Conversation item added - informational
                pass

            else:
                # Log unhandled event types for debugging
                print(f"Unhandled Voice Live event: {event.type}")

        except Exception as e:
            print(f"Error handling event {getattr(event, 'type', 'unknown')}: {e}")

    async def send_audio(self, audio_b64: str) -> None:
        """
        Send base64-encoded PCM16 audio chunk to Azure Voice Live

        Args:
            audio_b64: Base64-encoded PCM16 audio string (24kHz, mono, 16-bit signed LE)
        """
        if not self.is_connected or not self._conn:
            raise RuntimeError("Not connected to Azure Voice Live")

        await self._conn.input_audio_buffer.append(audio=audio_b64)

    async def commit_audio(self) -> None:
        """
        Commit the audio buffer and trigger response generation.
        Only needed in manual turn detection mode (VOICE_TURN_DETECTION_MODE=none).
        In server_vad mode, the server automatically detects speech boundaries.
        """
        if not self.is_connected or not self._conn:
            return

        try:
            await self._conn.input_audio_buffer.commit()
        except Exception as e:
            print(f"Error committing audio buffer: {e}")

    async def interrupt(self) -> None:
        """
        Interrupt the current AI response (for turn-taking).
        Cancels the in-progress response so the user can speak.
        """
        if not self.is_connected or not self._conn:
            return

        try:
            await self._conn.response.cancel()
            if self.on_status_change:
                self.on_status_change("interrupted")
        except Exception as e:
            # No response to cancel is not an error
            print(f"Interrupt: {e}")

    async def disconnect(self) -> None:
        """Close the connection to Azure Voice Live and clean up resources"""
        # Cancel the background event loop
        if self._event_task and not self._event_task.done():
            self._event_task.cancel()
            try:
                await self._event_task
            except asyncio.CancelledError:
                pass

        # Close the connection context
        if self._conn_ctx:
            try:
                await self._conn_ctx.__aexit__(None, None, None)
            except Exception as e:
                print(f"Error closing Voice Live connection: {e}")

        self._conn = None
        self._conn_ctx = None
        self.is_connected = False
        self._is_responding = False
        self._user_transcript_buffer = ""
        self._assistant_transcript_buffer = ""

        if self.on_status_change:
            self.on_status_change("disconnected")

        print("Voice Live connection closed")

    def set_callbacks(
        self,
        on_audio_chunk: Optional[Callable[[bytes], None]] = None,
        on_transcript: Optional[Callable[[str, bool, str], None]] = None,
        on_status_change: Optional[Callable[[str], None]] = None,
        on_error: Optional[Callable[[str], None]] = None,
    ) -> None:
        """
        Set callback functions for handling events

        Args:
            on_audio_chunk: Called with audio bytes when AI response audio arrives
            on_transcript: Called with (text, is_final, role) where role is "user" or "assistant"
            on_status_change: Called with status string (connected, listening, thinking, speaking, interrupted, disconnected)
            on_error: Called with error message string
        """
        if on_audio_chunk:
            self.on_audio_chunk = on_audio_chunk
        if on_transcript:
            self.on_transcript = on_transcript
        if on_status_change:
            self.on_status_change = on_status_change
        if on_error:
            self.on_error = on_error
