/**
 * useVoiceSession Hook
 * Manages voice session lifecycle including WebSocket connection,
 * audio capture/playback, and state management
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  getMicrophoneStream,
  createAudioProcessor,
  AudioBufferQueue,
  float32ToPCM16Base64,
  pcm16Base64ToFloat32,
} from './voiceUtils'

export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

interface VoiceMessage {
  type: string
  data: any
}

interface VoiceSessionOptions {
  conversationId?: string
  userProfile?: any
  wsUrl?: string
  onTranscript?: (text: string, isFinal: boolean, role: 'user' | 'assistant') => void
  onTurnEnd?: (userTranscript: string, assistantTranscript: string) => void
  onError?: (error: string) => void
}

export function useVoiceSession(options: VoiceSessionOptions = {}) {
  const {
    conversationId,
    userProfile,
    wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8172',
    onTranscript,
    onTurnEnd,
    onError,
  } = options

  // State
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [interimTranscript, setInterimTranscript] = useState<string>('')
  const [interimRole, setInterimRole] = useState<'user' | 'assistant' | null>(null)

  // Audio level stored as ref to avoid React re-renders on every frame
  const audioLevelRef = useRef(0)

  // Throttle interim transcript updates to ~50ms to avoid excessive re-renders
  const interimTranscriptRef = useRef('')
  const interimRoleRef = useRef<'user' | 'assistant' | null>(null)
  const interimUpdateTimer = useRef<ReturnType<typeof setTimeout>>()

  // Refs
  const wsRef = useRef<WebSocket | null>(null)
  const audioProcessorRef = useRef<{ stop: () => void } | null>(null)
  const audioBufferQueueRef = useRef<AudioBufferQueue | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // Holds the server's latest status when we defer applying it
  // (e.g. server says "listening" but audio is still playing)
  const pendingStatusRef = useRef<VoiceStatus | null>(null)

  /**
   * Send message to WebSocket
   */
  const sendMessage = useCallback((message: VoiceMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: VoiceMessage = JSON.parse(event.data)

        switch (message.type) {
          case 'status': {
            const newStatus = message.data.status as VoiceStatus | 'interrupted' | 'generation_done'

            if (newStatus === 'interrupted') {
              // Server VAD detected barge-in and auto-cancelled the response.
              // Clear queued audio immediately so AI speech stops.
              console.log('[Voice] interrupted — clearing audio queue')
              if (audioBufferQueueRef.current) {
                audioBufferQueueRef.current.clear()
              }
              pendingStatusRef.current = null
              setStatus('listening')
            } else if (newStatus === 'generation_done') {
              // Server finished generating all audio chunks (RESPONSE_DONE).
              // Audio queue likely still has seconds of buffered audio.
              console.log('[Voice] generation_done — buffered ahead:', audioBufferQueueRef.current?.bufferedAhead.toFixed(2), 's')
              pendingStatusRef.current = 'listening'
              if (audioBufferQueueRef.current) {
                audioBufferQueueRef.current.markGenerationComplete()
              }
              // If nothing is scheduled, transition immediately
              if (audioBufferQueueRef.current && !audioBufferQueueRef.current.isPlaying) {
                console.log('[Voice] generation_done — nothing playing, immediate transition')
                pendingStatusRef.current = null
                setStatus('listening')
              }
            } else if (pendingStatusRef.current !== null) {
              // While waiting for audio to drain, ignore stale VAD events.
              // Accept "speaking" (new response) but block everything else.
              if (newStatus === 'speaking') {
                console.log('[Voice] new response while draining — accepting speaking')
                pendingStatusRef.current = null
                if (audioBufferQueueRef.current) {
                  audioBufferQueueRef.current.generationComplete = false
                }
                setStatus('speaking')
              } else {
                console.log('[Voice] ignoring status', newStatus, 'while waiting for audio drain')
              }
            } else {
              pendingStatusRef.current = null

              // Reset generationComplete when a new response starts
              if (newStatus === 'speaking' && audioBufferQueueRef.current) {
                audioBufferQueueRef.current.generationComplete = false
              }

              if (newStatus === 'idle') {
                setInterimTranscript('')
                setInterimRole(null)
              }
              console.log('[Voice] status:', newStatus)
              setStatus(newStatus as VoiceStatus)
            }
            break
          }

          case 'audio_chunk':
            // Received audio from AI - play it
            const audioBase64 = message.data.audio
            if (audioBase64 && audioBufferQueueRef.current) {
              const float32Data = pcm16Base64ToFloat32(audioBase64)
              audioBufferQueueRef.current.addBuffer(float32Data)
            }
            break

          case 'transcript':
            // Handle transcript updates from the server.
            // interimTranscript is used for the live "typing" bubble in the UI.
            // onTranscript callback is used by consumers to add final messages to chat.
            if (message.data.isFinal) {
              // Final transcript — clear the interim display IMMEDIATELY
              // so there's no frame where both the interim bubble and the
              // permanent chat message are visible at the same time.
              interimTranscriptRef.current = ''
              interimRoleRef.current = null
              if (interimUpdateTimer.current) {
                clearTimeout(interimUpdateTimer.current)
                interimUpdateTimer.current = undefined
              }
              setInterimTranscript('')
              setInterimRole(null)
            } else {
              // Streaming delta — update the live transcript bubble.
              // Show text immediately (no delay) so user sees what's being said.
              interimTranscriptRef.current = message.data.text
              interimRoleRef.current = message.data.role || 'assistant'
              if (!interimUpdateTimer.current) {
                interimUpdateTimer.current = setTimeout(() => {
                  setInterimTranscript(interimTranscriptRef.current)
                  setInterimRole(interimRoleRef.current)
                  interimUpdateTimer.current = undefined
                }, 50)
              }
            }
            // Fire the callback for consumers (adds final messages to chat)
            if (onTranscript) {
              onTranscript(
                message.data.text,
                message.data.isFinal,
                message.data.role || 'assistant'
              )
            }
            break

          case 'turn_end':
            if (onTurnEnd) {
              onTurnEnd(
                message.data.userTranscript,
                message.data.assistantTranscript
              )
            }
            break

          case 'audio_level':
            // Server-side audio level (no longer sent, kept for compatibility)
            break

          case 'session_started':
            console.log('Voice session started:', message.data.sessionId)
            break

          case 'error':
            const errorMsg = message.data.message
            console.error('Voice error:', errorMsg)
            setError(errorMsg)
            setStatus('error')
            if (onError) {
              onError(errorMsg)
            }
            break

          default:
            console.log('Unknown message type:', message.type)
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    },
    [onTranscript, onTurnEnd, onError]
  )

  /**
   * Start voice session
   */
  const startSession = useCallback(async () => {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Voice mode is only available in browser environment')
      }

      setError(null)

      // Initialize audio buffer queue for playback
      if (!audioBufferQueueRef.current) {
        audioBufferQueueRef.current = new AudioBufferQueue(24000)
      }

      // When all queued audio finishes playing, apply any deferred status
      // and unmute the mic so the user can speak again.
      audioBufferQueueRef.current.onDrained = () => {
        console.log('[Voice] audio queue drained, pending:', pendingStatusRef.current)
        const pending = pendingStatusRef.current
        if (pending) {
          pendingStatusRef.current = null
          setStatus(pending)
        }
      }

      // Resume audio context (required for iOS Safari)
      await audioBufferQueueRef.current.resume()

      // Request microphone access
      setStatus('listening')
      const stream = await getMicrophoneStream(24000)
      mediaStreamRef.current = stream

      // Create audio processor (async — supports AudioWorklet)
      const processor = await createAudioProcessor(
        stream,
        24000,
        (audioChunk) => {
          // Convert to PCM16 Base64 and send to server
          const base64Audio = float32ToPCM16Base64(audioChunk)
          sendMessage({
            type: 'audio_chunk',
            data: {
              audio: base64Audio,
              timestamp: Date.now(),
            },
          })
        },
        (level) => {
          // Write to ref (no React re-render)
          audioLevelRef.current = level
        }
      )

      audioProcessorRef.current = processor

      // Connect WebSocket
      const ws = new WebSocket(`${wsUrl}/ws/voice/session`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)

        // Start session
        sendMessage({
          type: 'start_session',
          data: {
            conversationId,
            profile: userProfile,
          },
        })
      }

      ws.onmessage = handleMessage

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('Connection error')
        setStatus('error')
      }

      ws.onclose = () => {
        console.log('WebSocket closed')
        setIsConnected(false)
        setStatus('idle')
      }
    } catch (err: any) {
      console.error('Error starting voice session:', err)
      setError(err.message || 'Failed to start voice session')
      setStatus('error')
      if (onError) {
        onError(err.message)
      }
    }
  }, [
    conversationId,
    userProfile,
    wsUrl,
    sendMessage,
    handleMessage,
    onError,
  ])

  /**
   * End voice session
   */
  const endSession = useCallback(() => {
    // Send close message
    if(wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendMessage({ type: 'close_session', data: {} })
    }

    // Stop audio processor
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop()
      audioProcessorRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Clear audio playback queue
    if (audioBufferQueueRef.current) {
      audioBufferQueueRef.current.clear()
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
    setStatus('idle')
    setInterimTranscript('')
    setInterimRole(null)
    audioLevelRef.current = 0
  }, [sendMessage])

  /**
   * Interrupt current AI response
   */
  const interrupt = useCallback(() => {
    // Clear audio playback
    if (audioBufferQueueRef.current) {
      audioBufferQueueRef.current.clear()
    }

    // Send interrupt message
    sendMessage({ type: 'interrupt', data: {} })
  }, [sendMessage])

  /**
   * End current turn
   */
  const endTurn = useCallback(() => {
    sendMessage({ type: 'end_turn', data: {} })
  }, [sendMessage])

  /**
   * Toggle voice session (start/end)
   */
  const toggleSession = useCallback(async () => {
    if (status === 'idle') {
      await startSession()
    } else {
      endSession()
    }
  }, [status, startSession, endSession])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stop()
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (audioBufferQueueRef.current) {
        audioBufferQueueRef.current.close()
      }

      if (wsRef.current) {
        wsRef.current.close()
      }

      if (interimUpdateTimer.current) {
        clearTimeout(interimUpdateTimer.current)
      }
    }
  }, [])

  return {
    // State
    status,
    audioLevelRef,
    isConnected,
    error,
    interimTranscript,
    interimRole,

    // Actions
    startSession,
    endSession,
    toggleSession,
    interrupt,
    endTurn,
  }
}
