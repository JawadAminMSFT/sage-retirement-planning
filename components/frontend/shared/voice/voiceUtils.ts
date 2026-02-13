/**
 * Audio utility functions for voice sessions
 * Handles PCM conversion, buffering, and Web Audio API operations
 */

/**
 * Convert Float32 audio samples to PCM16 Base64
 * Uses chunked String.fromCharCode for O(n) encoding instead of O(n^2) concatenation
 */
export function float32ToPCM16Base64(float32Array: Float32Array): string {
  const pcm16 = new Int16Array(float32Array.length)

  for (let i = 0; i < float32Array.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32Array[i]))
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
  }

  const uint8 = new Uint8Array(pcm16.buffer)

  // Chunked encoding — O(n) instead of O(n^2) string concatenation
  const chunks: string[] = []
  const CHUNK_SIZE = 8192
  for (let i = 0; i < uint8.length; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, uint8.length)
    chunks.push(String.fromCharCode.apply(null, Array.from(uint8.subarray(i, end))))
  }

  return btoa(chunks.join(''))
}

/**
 * Convert PCM16 Base64 to Float32 audio samples
 */
export function pcm16Base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64)
  const uint8 = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    uint8[i] = binary.charCodeAt(i)
  }

  const pcm16 = new Int16Array(uint8.buffer)

  const float32 = new Float32Array(pcm16.length)
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff)
  }

  return float32
}

/**
 * Calculate RMS audio level from Float32 samples
 * Returns value in range [0, 1]
 */
export function calculateAudioLevel(float32Array: Float32Array): number {
  if (float32Array.length === 0) return 0

  let sumSquares = 0
  for (let i = 0; i < float32Array.length; i++) {
    sumSquares += float32Array[i] * float32Array[i]
  }

  const rms = Math.sqrt(sumSquares / float32Array.length)

  // Normalize and clamp to [0, 1]
  const level = Math.min(1, rms * 5)

  return level
}

/**
 * Audio buffer queue for seamless playback
 * Uses proactive scheduling to eliminate gaps between chunks
 */
export class AudioBufferQueue {
  private audioContext: AudioContext
  private nextStartTime: number = 0
  private sampleRate: number
  private scheduledSources: AudioBufferSourceNode[] = []

  constructor(sampleRate: number = 24000) {
    if (typeof window === 'undefined') {
      throw new Error('AudioContext is only available in browser environment')
    }

    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      throw new Error('Your browser does not support Web Audio API')
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    this.audioContext = new AudioContextClass({ sampleRate })
    this.sampleRate = sampleRate
  }

  /**
   * Add audio buffer and schedule for gapless playback immediately
   */
  async addBuffer(float32Data: Float32Array): Promise<void> {
    if (float32Data.length === 0) return

    const audioBuffer = this.audioContext.createBuffer(
      1,
      float32Data.length,
      this.sampleRate
    )

    audioBuffer.getChannelData(0).set(float32Data)

    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(this.audioContext.destination)

    // Schedule at the next available time (proactive, no gaps)
    const currentTime = this.audioContext.currentTime
    const startTime = Math.max(currentTime, this.nextStartTime)

    source.start(startTime)
    this.nextStartTime = startTime + audioBuffer.duration

    // Track for cleanup
    this.scheduledSources.push(source)
    source.onended = () => {
      const idx = this.scheduledSources.indexOf(source)
      if (idx !== -1) this.scheduledSources.splice(idx, 1)
    }
  }

  /**
   * Clear all queued/playing buffers and stop playback
   */
  clear(): void {
    for (const source of this.scheduledSources) {
      try {
        source.stop()
        source.disconnect()
      } catch {
        // Already stopped
      }
    }
    this.scheduledSources = []
    this.nextStartTime = 0
  }

  /**
   * Resume audio context (required for iOS Safari)
   */
  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  /**
   * Close audio context (cleanup)
   */
  async close(): Promise<void> {
    this.clear()
    await this.audioContext.close()
  }
}

/**
 * Create audio processor node for capturing microphone input
 * Uses AudioWorklet for low latency, falls back to ScriptProcessorNode
 */
export async function createAudioProcessor(
  stream: MediaStream,
  sampleRate: number = 24000,
  onAudioChunk: (chunk: Float32Array) => void,
  onAudioLevel?: (level: number) => void
): Promise<{ audioContext: AudioContext; stop: () => void }> {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext is only available in browser environment')
  }

  if (!window.AudioContext && !(window as any).webkitAudioContext) {
    throw new Error('Your browser does not support Web Audio API')
  }

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
  const audioContext = new AudioContextClass({ sampleRate })
  const source = audioContext.createMediaStreamSource(stream)

  let stopFn: () => void

  // Try AudioWorklet first (lower latency: ~85ms vs ~170ms)
  try {
    await audioContext.audioWorklet.addModule('/audio-worklet-processor.js')

    const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor')

    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audio') {
        const samples = event.data.samples as Float32Array

        // Calculate audio level for waveform visualization
        if (onAudioLevel) {
          onAudioLevel(calculateAudioLevel(samples))
        }

        onAudioChunk(samples)
      }
    }

    source.connect(workletNode)
    // AudioWorklet doesn't need to connect to destination

    stopFn = () => {
      workletNode.disconnect()
      source.disconnect()
      audioContext.close()
      stream.getTracks().forEach((track) => track.stop())
    }

    console.log('[Voice] Using AudioWorklet (low latency)')
  } catch (e) {
    // Fallback to ScriptProcessorNode for older browsers
    console.log('[Voice] AudioWorklet unavailable, falling back to ScriptProcessor:', e)

    const bufferSize = 4096
    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)

    processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0)

      if (onAudioLevel) {
        onAudioLevel(calculateAudioLevel(inputData))
      }

      onAudioChunk(new Float32Array(inputData))
    }

    source.connect(processor)
    processor.connect(audioContext.destination)

    stopFn = () => {
      processor.disconnect()
      source.disconnect()
      audioContext.close()
      stream.getTracks().forEach((track) => track.stop())
    }
  }

  return { audioContext, stop: stopFn }
}

/**
 * Request microphone permission and get audio stream
 */
export async function getMicrophoneStream(
  sampleRate: number = 24000
): Promise<MediaStream> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('Microphone access is only available in browser environment')
  }

  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    throw new Error('Microphone access requires HTTPS. Please access the site using https:// or use localhost for development.')
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Your browser does not support microphone access. Please use a modern browser.')
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: { ideal: sampleRate },
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })

    return stream
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Microphone permission denied. Please allow microphone access.')
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone.')
      }
    }

    throw new Error(`Failed to access microphone: ${error}`)
  }
}

/**
 * Check if microphone permission is granted
 */
export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'denied'
  }

  if (!navigator.permissions || !navigator.permissions.query) {
    return 'prompt'
  }

  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return result.state
  } catch {
    return 'prompt'
  }
}
