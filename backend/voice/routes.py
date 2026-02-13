"""
WebSocket routes for voice sessions
Handles WebSocket connections for real-time voice chat
"""

import json
import asyncio
import uuid
from typing import Dict, Optional
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.responses import JSONResponse

from .session_manager import VoiceSessionManager


# Create router
router = APIRouter(prefix="/ws/voice", tags=["voice"])

# Active sessions
active_sessions: Dict[str, VoiceSessionManager] = {}


@router.websocket("/session")
async def voice_session_websocket(
    websocket: WebSocket,
    conversation_id: Optional[str] = Query(None),
    token: Optional[str] = Query(None),  # For authentication
):
    """
    WebSocket endpoint for voice sessions

    Protocol:
        Client → Server:
            - {"type": "start_session", "data": {"conversationId": "...", "profile": {...}}}
            - {"type": "audio_chunk", "data": {"audio": "base64_pcm16", "timestamp": 123}}
            - {"type": "interrupt"}
            - {"type": "end_turn"}
            - {"type": "close_session"}

        Server → Client:
            - {"type": "audio_chunk", "data": {"audio": "base64_pcm16"}}
            - {"type": "transcript", "data": {"text": "...", "isFinal": true/false, "role": "user"/"assistant"}}
            - {"type": "status", "data": {"status": "listening"/"thinking"/"speaking"/"idle"}}
            - {"type": "turn_end", "data": {"turnId": "...", "userTranscript": "...", "assistantTranscript": "...", "durationMs": 123}}
            - {"type": "audio_level", "data": {"level": 0.5}}
            - {"type": "error", "data": {"message": "...", "code": "..."}}
    """

    # Accept connection
    await websocket.accept()

    # Generate session ID
    session_id = str(uuid.uuid4())

    # Session manager (will be created on start_session message)
    session_manager: Optional[VoiceSessionManager] = None

    try:
        print(f"Voice WebSocket connected: {session_id}")

        # Message handler function to send to frontend
        async def send_message(message: Dict):
            try:
                await websocket.send_json(message)
            except Exception as e:
                print(f"Error sending message: {e}")

        # Main message loop
        while True:
            # Receive message
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
            except WebSocketDisconnect:
                print(f"WebSocket disconnected: {session_id}")
                break
            except json.JSONDecodeError as e:
                await send_message({
                    "type": "error",
                    "data": {"message": f"Invalid JSON: {e}"}
                })
                continue

            # Handle message type
            message_type = message.get("type")
            message_data = message.get("data", {})

            try:
                if message_type == "start_session":
                    # Create session manager
                    conv_id = message_data.get("conversationId") or conversation_id
                    user_profile = message_data.get("profile", {})

                    session_manager = VoiceSessionManager(
                        session_id=session_id,
                        conversation_id=conv_id,
                        user_profile=user_profile,
                        send_message=send_message,
                    )

                    # Store in active sessions
                    active_sessions[session_id] = session_manager

                    # Start the session
                    success = await session_manager.start()

                    if success:
                        await send_message({
                            "type": "session_started",
                            "data": {"sessionId": session_id}
                        })
                    else:
                        await send_message({
                            "type": "error",
                            "data": {"message": "Failed to start voice session"}
                        })

                elif message_type == "audio_chunk":
                    if not session_manager:
                        await send_message({
                            "type": "error",
                            "data": {"message": "Session not started"}
                        })
                        continue

                    # Pass base64 audio directly through to session manager
                    # (no decode/re-encode roundtrip — SDK expects base64)
                    audio_b64 = message_data.get("audio")
                    if not audio_b64:
                        continue

                    try:
                        await session_manager.handle_audio_chunk(audio_b64)
                    except Exception as e:
                        await send_message({
                            "type": "error",
                            "data": {"message": f"Error processing audio: {e}"}
                        })

                elif message_type == "interrupt":
                    if session_manager:
                        await session_manager.interrupt()

                elif message_type == "end_turn":
                    if session_manager:
                        await session_manager.end_turn()

                elif message_type == "close_session":
                    if session_manager:
                        await session_manager.close()
                        active_sessions.pop(session_id, None)
                        session_manager = None
                    break

                else:
                    await send_message({
                        "type": "error",
                        "data": {"message": f"Unknown message type: {message_type}"}
                    })

            except Exception as e:
                print(f"Error handling message {message_type}: {e}")
                await send_message({
                    "type": "error",
                    "data": {"message": str(e)}
                })

    except Exception as e:
        print(f"WebSocket error: {e}")

    finally:
        # Cleanup
        if session_manager:
            try:
                await session_manager.close()
            except Exception as e:
                print(f"Error closing session: {e}")

        # Remove from active sessions
        active_sessions.pop(session_id, None)

        print(f"Voice session closed: {session_id}")


@router.get("/health")
async def voice_health_check():
    """Health check endpoint for voice service"""
    return JSONResponse({
        "status": "healthy",
        "service": "voice",
        "active_sessions": len(active_sessions),
        "timestamp": datetime.utcnow().isoformat()
    })


@router.get("/sessions")
async def list_active_sessions():
    """List active voice sessions (for debugging)"""
    sessions_info = []
    for session_id, session in active_sessions.items():
        sessions_info.append({
            "sessionId": session_id,
            "conversationId": session.conversation_id,
            "status": session.status.value,
            "currentTurnId": session.current_turn_id,
        })

    return JSONResponse({
        "active_sessions": len(active_sessions),
        "sessions": sessions_info,
        "timestamp": datetime.utcnow().isoformat()
    })
