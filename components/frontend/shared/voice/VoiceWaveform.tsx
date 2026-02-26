/**
 * VoiceWaveform Component
 * Horizontal waveform visualization using Canvas
 * Matches the persona theming (emerald for client, indigo for advisor)
 *
 * Uses ref-based audio level input to avoid React re-renders.
 * Animation loop reads audioLevelRef.current directly each frame.
 */

import { useEffect, useRef, type RefObject } from 'react'
import type { VoiceStatus } from './useVoiceSession'

interface VoiceWaveformProps {
  audioLevelRef: RefObject<number>
  variant: 'client' | 'advisor'
  isActive: boolean
  voiceStatus?: VoiceStatus
  className?: string
}

// Theme colors with separate speaking variant
const THEME_COLORS = {
  client: {
    active: '#10b981', // emerald-500 (user listening)
    speaking: '#059669', // emerald-600 (AI responding)
    activeGlow: 'rgba(16, 185, 129, 0.3)',
    speakingGlow: 'rgba(5, 150, 105, 0.25)',
    idle: '#86efac', // emerald-300
    dot: '#10b981', // emerald-500
  },
  advisor: {
    active: '#6366f1', // indigo-500 (user listening)
    speaking: '#4f46e5', // indigo-600 (AI responding)
    activeGlow: 'rgba(99, 102, 241, 0.3)',
    speakingGlow: 'rgba(79, 70, 229, 0.25)',
    idle: '#a5b4fc', // indigo-300
    dot: '#6366f1', // indigo-500
  },
} as const

export default function VoiceWaveform({
  audioLevelRef,
  variant,
  isActive,
  voiceStatus,
  className = '',
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timeRef = useRef(0)

  // Circular buffer for audio history
  const historyRef = useRef<{ buffer: Float32Array; writeIndex: number; size: number } | null>(null)

  const theme = THEME_COLORS[variant]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const updateCanvasSize = () => {
      const container = canvas.parentElement
      if (!container) return

      const width = container.clientWidth
      const height = 48
      const dpr = window.devicePixelRatio || 1

      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      return { width, height }
    }

    let dimensions = updateCanvasSize()
    if (!dimensions) return

    const numBars = Math.floor(dimensions.width / 4)
    const barWidth = 3
    const barGap = 1

    // Initialize circular buffer
    const maxLen = numBars + 16 // some extra room
    historyRef.current = {
      buffer: new Float32Array(maxLen),
      writeIndex: 0,
      size: 0,
    }

    const animate = (timestamp: number) => {
      if (!canvas || !ctx || !dimensions) return

      const { width, height } = dimensions

      ctx.clearRect(0, 0, width, height)
      timeRef.current += 0.05

      const history = historyRef.current!
      const centerY = height / 2

      // Thinking state: bouncing dots animation
      if (voiceStatus === 'thinking') {
        const dotRadius = 4
        const dotSpacing = 18
        const startX = width / 2 - dotSpacing

        for (let i = 0; i < 3; i++) {
          const phase = (timestamp * 0.003 + i * 0.6) % (Math.PI * 2)
          const bounce = Math.sin(phase) * 5

          ctx.fillStyle = theme.dot
          ctx.globalAlpha = 0.4 + Math.sin(phase) * 0.35
          ctx.beginPath()
          ctx.arc(startX + i * dotSpacing, centerY - bounce, dotRadius, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.globalAlpha = 1
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      if (isActive) {
        // Write current audio level into circular buffer
        const level = audioLevelRef.current ?? 0
        history.buffer[history.writeIndex] = level
        history.writeIndex = (history.writeIndex + 1) % maxLen
        if (history.size < maxLen) history.size++
      }

      const maxBarHeight = height * 0.7
      const visibleBars = Math.min(history.size, numBars)

      if (isActive && visibleBars > 0) {
        const barSpacing = barWidth + barGap
        const isSpeaking = voiceStatus === 'speaking'
        const barColor = isSpeaking ? theme.speaking : theme.active
        const glowColor = isSpeaking ? theme.speakingGlow : theme.activeGlow

        // Enable subtle glow behind bars
        ctx.shadowColor = glowColor
        ctx.shadowBlur = 4

        for (let i = 0; i < visibleBars; i++) {
          const x = width - (visibleBars - i) * barSpacing

          // Read from circular buffer (oldest to newest)
          const bufIdx = (history.writeIndex - visibleBars + i + maxLen) % maxLen
          const level = history.buffer[bufIdx]

          const phase = (timeRef.current + i * 0.3) % (Math.PI * 2)
          const baseWave = Math.sin(phase) * 0.3
          const barHeight = Math.max(
            4,
            (baseWave + 0.3 + level * 0.7) * maxBarHeight
          )

          const y = centerY - barHeight / 2

          // Fade out older bars
          const alpha = i / visibleBars

          ctx.fillStyle = barColor
          ctx.globalAlpha = alpha * 0.8 + 0.2

          ctx.beginPath()
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2)
          ctx.fill()
        }

        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      } else {
        // Idle state - subtle pulsing line
        const pulsePhase = (timestamp * 0.002) % (Math.PI * 2)
        const pulseValue = (Math.sin(pulsePhase) + 1) / 2
        const lineHeight = 3 + pulseValue * 2

        ctx.fillStyle = theme.idle
        ctx.globalAlpha = 0.5
        ctx.beginPath()
        ctx.roundRect(
          width * 0.1,
          centerY - lineHeight / 2,
          width * 0.8,
          lineHeight,
          lineHeight / 2
        )
        ctx.fill()
        ctx.globalAlpha = 1
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      dimensions = updateCanvasSize()
    }

    window.addEventListener('resize', handleResize)
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive, variant, voiceStatus, theme, audioLevelRef])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: '100%',
        height: '48px',
      }}
    />
  )
}
