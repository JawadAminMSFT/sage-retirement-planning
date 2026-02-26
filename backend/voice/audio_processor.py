"""
Audio processing utilities for voice sessions
Handles PCM format conversions and audio buffering
"""

import base64
import struct
from typing import List, Tuple


class AudioProcessor:
    """Handles audio format conversions for voice streaming"""

    SAMPLE_RATE = 24000  # 24kHz for Azure Voice Live
    CHANNELS = 1  # Mono
    SAMPLE_WIDTH = 2  # 16-bit PCM

    @staticmethod
    def base64_to_pcm16(base64_audio: str) -> bytes:
        """
        Convert base64-encoded audio to PCM16 bytes

        Args:
            base64_audio: Base64-encoded audio string

        Returns:
            PCM16 bytes (16-bit signed little-endian)
        """
        try:
            return base64.b64decode(base64_audio)
        except Exception as e:
            raise ValueError(f"Failed to decode base64 audio: {e}")

    @staticmethod
    def pcm16_to_base64(pcm_data: bytes) -> str:
        """
        Convert PCM16 bytes to base64 string

        Args:
            pcm_data: PCM16 bytes (16-bit signed little-endian)

        Returns:
            Base64-encoded audio string
        """
        return base64.b64encode(pcm_data).decode('utf-8')

    @staticmethod
    def float32_to_pcm16(float_samples: List[float]) -> bytes:
        """
        Convert Float32 samples (-1.0 to 1.0) to PCM16 bytes

        Args:
            float_samples: List of float samples in range [-1.0, 1.0]

        Returns:
            PCM16 bytes (16-bit signed little-endian)
        """
        # Clamp and convert to 16-bit signed integers
        pcm_samples = []
        for sample in float_samples:
            # Clamp to [-1.0, 1.0]
            clamped = max(-1.0, min(1.0, sample))
            # Convert to 16-bit signed int
            pcm_value = int(clamped * 32767)
            pcm_samples.append(pcm_value)

        # Pack as little-endian 16-bit signed integers
        return struct.pack('<' + 'h' * len(pcm_samples), *pcm_samples)

    @staticmethod
    def pcm16_to_float32(pcm_data: bytes) -> List[float]:
        """
        Convert PCM16 bytes to Float32 samples

        Args:
            pcm_data: PCM16 bytes (16-bit signed little-endian)

        Returns:
            List of float samples in range [-1.0, 1.0]
        """
        # Unpack as little-endian 16-bit signed integers
        num_samples = len(pcm_data) // 2
        pcm_samples = struct.unpack('<' + 'h' * num_samples, pcm_data)

        # Convert to float in range [-1.0, 1.0]
        return [sample / 32767.0 for sample in pcm_samples]

    @staticmethod
    def calculate_audio_level(pcm_data: bytes) -> float:
        """
        Calculate RMS audio level from PCM16 data

        Args:
            pcm_data: PCM16 bytes

        Returns:
            Audio level in range [0.0, 1.0]
        """
        if not pcm_data or len(pcm_data) < 2:
            return 0.0

        # Convert to float samples
        float_samples = AudioProcessor.pcm16_to_float32(pcm_data)

        # Calculate RMS (Root Mean Square)
        if not float_samples:
            return 0.0

        sum_squares = sum(sample ** 2 for sample in float_samples)
        rms = (sum_squares / len(float_samples)) ** 0.5

        # Normalize to [0.0, 1.0]
        return min(1.0, rms * 3.0)  # Multiply by 3 for better visualization

    @staticmethod
    def chunk_audio(audio_data: bytes, chunk_size: int = 4800) -> List[bytes]:
        """
        Split audio data into fixed-size chunks

        Args:
            audio_data: Audio bytes to chunk
            chunk_size: Size of each chunk in bytes (default: 4800 = 100ms at 24kHz 16-bit mono)

        Returns:
            List of audio chunks
        """
        chunks = []
        for i in range(0, len(audio_data), chunk_size):
            chunks.append(audio_data[i:i + chunk_size])
        return chunks

    @staticmethod
    def get_audio_duration_ms(pcm_data: bytes, sample_rate: int = 24000) -> int:
        """
        Calculate audio duration in milliseconds

        Args:
            pcm_data: PCM16 audio data
            sample_rate: Sample rate in Hz (default: 24000)

        Returns:
            Duration in milliseconds
        """
        num_samples = len(pcm_data) // 2  # 2 bytes per sample (16-bit)
        duration_seconds = num_samples / sample_rate
        return int(duration_seconds * 1000)


class AudioBuffer:
    """Circular buffer for audio streaming"""

    def __init__(self, max_size_bytes: int = 480000):  # 10 seconds at 24kHz 16-bit mono
        self.max_size = max_size_bytes
        self.buffer = bytearray()

    def add(self, data: bytes) -> None:
        """Add audio data to buffer"""
        self.buffer.extend(data)

        # Trim if exceeds max size
        if len(self.buffer) > self.max_size:
            self.buffer = self.buffer[-self.max_size:]

    def get_all(self) -> bytes:
        """Get all buffered audio"""
        return bytes(self.buffer)

    def clear(self) -> None:
        """Clear the buffer"""
        self.buffer.clear()

    def get_duration_ms(self, sample_rate: int = 24000) -> int:
        """Get duration of buffered audio in milliseconds"""
        return AudioProcessor.get_audio_duration_ms(bytes(self.buffer), sample_rate)

    def is_empty(self) -> bool:
        """Check if buffer is empty"""
        return len(self.buffer) == 0

    def __len__(self) -> int:
        """Get buffer size in bytes"""
        return len(self.buffer)
