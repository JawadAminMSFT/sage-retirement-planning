"""
Voice session management
Coordinates WebSocket connections, Azure Realtime API, and conversation storage
"""

import asyncio
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, Callable
from enum import Enum

from .realtime_client import AzureRealtimeClient
from .audio_processor import AudioProcessor


class VoiceSessionStatus(str, Enum):
    """Voice session status states"""
    IDLE = "idle"
    LISTENING = "listening"
    THINKING = "thinking"
    SPEAKING = "speaking"
    ERROR = "error"


class VoiceSessionManager:
    """
    Manages a single voice session lifecycle

    Coordinates between:
    - WebSocket connection to frontend
    - Azure Realtime API for voice processing
    - Conversation storage for transcript persistence
    """

    def __init__(
        self,
        session_id: str,
        conversation_id: Optional[str] = None,
        user_profile: Optional[Dict[str, Any]] = None,
        send_message: Optional[Callable[[Dict[str, Any]], None]] = None,
    ):
        """
        Initialize voice session manager

        Args:
            session_id: Unique session identifier
            conversation_id: Optional conversation ID for persistence
            user_profile: User profile data for context
            send_message: Callback to send messages to frontend via WebSocket
        """
        self.session_id = session_id
        self.conversation_id = conversation_id or str(uuid.uuid4())
        self.user_profile = user_profile or {}
        self.send_message = send_message

        # Ordered message queue — guarantees WebSocket messages reach the
        # frontend in the same order events arrived from Azure (prevents
        # generation_done racing ahead of the last audio chunk).
        self._send_queue: asyncio.Queue = asyncio.Queue()
        self._sender_task: Optional[asyncio.Task] = None

        # Azure Realtime Client
        system_message = self._build_system_message()
        self.realtime_client = AzureRealtimeClient(
            voice=self.user_profile.get("preferred_voice", "alloy"),
            system_message=system_message,
        )

        # Audio processing
        self.audio_processor = AudioProcessor()

        # Session state
        self.status = VoiceSessionStatus.IDLE
        self.current_turn_id: Optional[str] = None
        self.user_transcript = ""
        self.assistant_transcript = ""
        self.turn_start_time: Optional[datetime] = None

        # Setup callbacks
        self._setup_callbacks()

    def _build_system_message(self) -> str:
        """Build system message with user context"""
        base_message = """You are Sage, an AI retirement planning assistant. You provide helpful,
        accurate advice on retirement planning, financial strategies, and investment options.
        Be conversational, empathetic, and clear in your responses."""

        # Add user context if available
        if self.user_profile:
            context_parts = []

            name = self.user_profile.get("name")
            if name:
                context_parts.append(f"You are speaking with {name}.")

            age = self.user_profile.get("age")
            if age:
                context_parts.append(f"They are {age} years old.")

            retirement_age = self.user_profile.get("retirementAge")
            if retirement_age:
                context_parts.append(f"Their planned retirement age is {retirement_age}.")

            if context_parts:
                base_message += "\n\nUser context: " + " ".join(context_parts)

        return base_message

    def _setup_callbacks(self) -> None:
        """Setup callbacks for Azure Realtime Client"""
        self.realtime_client.set_callbacks(
            on_audio_chunk=self._on_audio_chunk,
            on_transcript=self._on_transcript,
            on_status_change=self._on_status_change,
            on_error=self._on_error,
        )

    async def start(self) -> bool:
        """
        Start the voice session

        Returns:
            True if started successfully, False otherwise
        """
        try:
            # Start the ordered message sender
            self._sender_task = asyncio.create_task(self._ordered_sender())

            # Connect to Azure Realtime API
            success = await self.realtime_client.connect()
            if not success:
                return False

            # Update status
            self.status = VoiceSessionStatus.LISTENING
            self._send_status_update()

            # Start new turn
            self._start_new_turn()

            return True

        except Exception as e:
            error_msg = f"Failed to start voice session: {e}"
            print(error_msg)
            self._send_error(error_msg)
            return False

    async def handle_audio_chunk(self, audio_b64: str) -> None:
        """
        Handle incoming audio chunk from user

        Args:
            audio_b64: Base64-encoded PCM16 audio string from frontend
        """
        try:
            # Send base64 directly to Azure (no decode/re-encode roundtrip)
            await self.realtime_client.send_audio(audio_b64)

        except Exception as e:
            print(f"Error handling audio chunk: {e}")

    async def commit_audio(self) -> None:
        """Commit audio buffer and trigger response generation"""
        try:
            await self.realtime_client.commit_audio()
        except Exception as e:
            print(f"Error committing audio: {e}")

    async def interrupt(self) -> None:
        """Interrupt the current AI response (for turn-taking)"""
        try:
            await self.realtime_client.interrupt()

            # Start new turn
            self._start_new_turn()

        except Exception as e:
            print(f"Error interrupting: {e}")

    async def end_turn(self) -> None:
        """End the current turn and save to conversation history"""
        try:
            # Commit any remaining audio
            await self.commit_audio()

            # Calculate turn duration
            duration_ms = 0
            if self.turn_start_time:
                duration_ms = int((datetime.utcnow() - self.turn_start_time).total_seconds() * 1000)

            # Send turn completion to frontend
            if self.send_message:
                await self.send_message({
                    "type": "turn_end",
                    "data": {
                        "turnId": self.current_turn_id,
                        "userTranscript": self.user_transcript,
                        "assistantTranscript": self.assistant_transcript,
                        "durationMs": duration_ms,
                    }
                })

            # Save to conversation history if we have storage access
            await self._save_turn_to_history(duration_ms)

            # Reset turn state and start new turn for continuous listening
            self.user_transcript = ""
            self.assistant_transcript = ""
            self._start_new_turn()

            # Return to listening state for next input
            self.status = VoiceSessionStatus.LISTENING
            self._send_status_update()

        except Exception as e:
            print(f"Error ending turn: {e}")

    async def close(self) -> None:
        """Close the voice session"""
        try:
            # End current turn if any
            if self.current_turn_id:
                await self.end_turn()

            # Disconnect from Azure
            await self.realtime_client.disconnect()

            # Stop the ordered sender task
            if self._sender_task and not self._sender_task.done():
                self._send_queue.put_nowait(None)  # sentinel to stop
                try:
                    await asyncio.wait_for(self._sender_task, timeout=2.0)
                except asyncio.TimeoutError:
                    self._sender_task.cancel()

            # Update status
            self.status = VoiceSessionStatus.IDLE

        except Exception as e:
            print(f"Error closing session: {e}")

    def _start_new_turn(self) -> None:
        """Start a new conversation turn"""
        self.current_turn_id = str(uuid.uuid4())
        self.turn_start_time = datetime.utcnow()
        self.user_transcript = ""
        self.assistant_transcript = ""

    def _on_audio_chunk(self, audio_bytes: bytes) -> None:
        """Callback when audio chunk received from Azure"""
        if self.send_message:
            audio_b64 = self.audio_processor.pcm16_to_base64(audio_bytes)
            self._enqueue({"type": "audio_chunk", "data": {"audio": audio_b64}})

    def _on_transcript(self, text: str, is_final: bool, role: str = "assistant") -> None:
        """Callback when transcript received from Azure Voice Live"""
        if role == "user":
            self.user_transcript = text
        else:
            self.assistant_transcript = text

        if self.send_message:
            self._enqueue({
                "type": "transcript",
                "data": {"text": text, "isFinal": is_final, "role": role}
            })

    def _on_status_change(self, new_status: str) -> None:
        """Callback when status changes"""
        # Map Azure status to our internal status
        status_map = {
            "connected": VoiceSessionStatus.LISTENING,
            "listening": VoiceSessionStatus.LISTENING,
            "thinking": VoiceSessionStatus.THINKING,
            "speaking": VoiceSessionStatus.SPEAKING,
            "interrupted": VoiceSessionStatus.LISTENING,
            "generation_done": VoiceSessionStatus.SPEAKING,  # keep as speaking until frontend drains
            "disconnected": VoiceSessionStatus.IDLE,
        }

        self.status = status_map.get(new_status, VoiceSessionStatus.IDLE)

        # These statuses are forwarded raw to the frontend so it can
        # handle them with client-side audio queue awareness.
        if new_status in ("interrupted", "generation_done"):
            self._send_raw_status(new_status)
        else:
            self._send_status_update()

    def _on_error(self, error_msg: str) -> None:
        """Callback when error occurs"""
        self.status = VoiceSessionStatus.ERROR
        self._send_error(error_msg)

    def _send_status_update(self) -> None:
        """Send status update to frontend"""
        if self.send_message:
            self._enqueue({"type": "status", "data": {"status": self.status.value}})

    def _send_raw_status(self, raw_status: str) -> None:
        """Send a raw status string to the frontend (e.g. 'interrupted')"""
        if self.send_message:
            self._enqueue({"type": "status", "data": {"status": raw_status}})

    def _send_error(self, error_msg: str) -> None:
        """Send error message to frontend"""
        if self.send_message:
            self._enqueue({"type": "error", "data": {"message": error_msg}})

    def _enqueue(self, msg: dict) -> None:
        """Enqueue a message for ordered delivery to the frontend"""
        try:
            self._send_queue.put_nowait(msg)
        except Exception as e:
            print(f"Error enqueueing message: {e}")

    async def _ordered_sender(self) -> None:
        """Background task: sends messages to frontend sequentially in FIFO order"""
        try:
            while True:
                msg = await self._send_queue.get()
                if msg is None:  # shutdown sentinel
                    break
                try:
                    await self.send_message(msg)
                except Exception as e:
                    print(f"Error sending message to frontend: {e}")
        except asyncio.CancelledError:
            pass

    async def _save_turn_to_history(self, duration_ms: int) -> None:
        """
        Save voice turn to conversation history

        Args:
            duration_ms: Turn duration in milliseconds
        """
        try:
            # This would integrate with the existing storage system
            # For now, this is a placeholder

            # Example integration with storage:
            # from storage import storage, ConversationMessage
            #
            # if self.user_transcript:
            #     user_msg = ConversationMessage(
            #         role="user",
            #         content=self.user_transcript,
            #         timestamp=datetime.utcnow().isoformat(),
            #         metadata={
            #             "source": "voice",
            #             "turn_id": self.current_turn_id,
            #             "duration_ms": duration_ms
            #         }
            #     )
            #     # Add to conversation
            #
            # if self.assistant_transcript:
            #     assistant_msg = ConversationMessage(
            #         role="assistant",
            #         content=self.assistant_transcript,
            #         timestamp=datetime.utcnow().isoformat(),
            #         metadata={
            #             "source": "voice",
            #             "turn_id": self.current_turn_id
            #         }
            #     )
            #     # Add to conversation
            #
            # # Save conversation
            # await storage.save_conversation(self.conversation_id, conversation)

            print(f"Turn saved - User: '{self.user_transcript}', Assistant: '{self.assistant_transcript}'")

        except Exception as e:
            print(f"Error saving turn to history: {e}")
