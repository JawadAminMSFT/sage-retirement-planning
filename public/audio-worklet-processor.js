/**
 * AudioWorklet processor for low-latency microphone capture.
 * Runs on the audio rendering thread — collects 128-sample frames
 * and batches them into ~2048-sample chunks before posting to main thread.
 *
 * Input:  128 Float32 samples per process() call (@ 24kHz = ~5.3ms)
 * Output: ~2048 Float32 samples per message (@ 24kHz = ~85ms)
 */

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    // Accumulation buffer — batch small 128-sample frames into larger chunks
    this._buffer = new Float32Array(2048)
    this._writeIndex = 0
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const channelData = input[0] // mono channel

    // Copy samples into accumulation buffer
    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._writeIndex++] = channelData[i]

      if (this._writeIndex >= this._buffer.length) {
        // Buffer full — send to main thread
        this.port.postMessage({
          type: 'audio',
          samples: this._buffer.slice(), // copy before resetting
        })
        this._writeIndex = 0
      }
    }

    return true // keep processor alive
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor)
