"""
Voice module for Azure Voice Live integration
Provides WebSocket-based voice session management with gpt-4o-realtime
"""

from .routes import router as voice_router
from .session_manager import VoiceSessionManager
from .realtime_client import AzureRealtimeClient
from .audio_processor import AudioProcessor

__all__ = [
    "voice_router",
    "VoiceSessionManager",
    "AzureRealtimeClient",
    "AudioProcessor",
]
