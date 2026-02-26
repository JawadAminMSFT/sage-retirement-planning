/**
 * DualWaveformCanvas Component
 * Full-canvas dual waveform visualization with overlapping input & output waves.
 *
 * - Input wave (microphone): scrolls left → right, emerald/indigo themed
 * - Output wave (AI playback): scrolls right → left, teal/violet themed
 * - Both overlap at the center with partial transparency for a rich blended effect
 *
 * Uses ref-based audio level inputs to avoid React re-renders.
 */

import { useEffect, useRef, type RefObject } from 'react'
import type { VoiceStatus } from './useVoiceSession'

interface DualWaveformCanvasProps {
  /** Ref updated each frame with mic input audio level (0–1) */
  inputLevelRef: RefObject<number>
  /** Ref updated each frame with AI output audio level (0–1) */
  outputLevelRef: RefObject<number>
  /** client = emerald/teal, advisor = indigo/violet */
  variant: 'client' | 'advisor'
  /** Current voice session status */
  voiceStatus: VoiceStatus
  className?: string
}

const THEMES = {
  client: {
    input: {
      color: '#10b981',        // emerald-500
      glow: 'rgba(16, 185, 129, 0.35)',
      idle: 'rgba(16, 185, 129, 0.15)',
    },
    output: {
      color: '#06b6d4',        // cyan-500
      glow: 'rgba(6, 182, 212, 0.35)',
      idle: 'rgba(6, 182, 212, 0.15)',
    },
    thinkingDot: '#10b981',
    bg: [
      { stop: 0, color: 'rgba(255, 255, 255, 1)' },
      { stop: 0.5, color: 'rgba(249, 250, 251, 1)' },
      { stop: 1, color: 'rgba(255, 255, 255, 1)' },
    ],
  },
  advisor: {
    input: {
      color: '#6366f1',        // indigo-500
      glow: 'rgba(99, 102, 241, 0.35)',
      idle: 'rgba(99, 102, 241, 0.15)',
    },
    output: {
      color: '#a78bfa',        // violet-400
      glow: 'rgba(167, 139, 250, 0.35)',
      idle: 'rgba(167, 139, 250, 0.15)',
    },
    thinkingDot: '#6366f1',
    bg: [
      { stop: 0, color: 'rgba(255, 255, 255, 1)' },
      { stop: 0.5, color: 'rgba(249, 250, 251, 1)' },
      { stop: 1, color: 'rgba(255, 255, 255, 1)' },
    ],
  },
} as const

export default function DualWaveformCanvas({
  inputLevelRef,
  outputLevelRef,
  variant,
  voiceStatus,
  className = '',
}: DualWaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const timeRef = useRef(0)

  // Stable refs so the animation loop always reads current values without restarting
  const voiceStatusRef = useRef(voiceStatus)
  voiceStatusRef.current = voiceStatus
  const variantRef = useRef(variant)
  variantRef.current = variant

  // Separate circular buffers for input & output history
  const inputHistoryRef = useRef<{ buffer: Float32Array; writeIndex: number; size: number } | null>(null)
  const outputHistoryRef = useRef<{ buffer: Float32Array; writeIndex: number; size: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0

    const updateCanvasSize = () => {
      const container = canvas.parentElement
      if (!container) return false
      const rect = container.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = window.devicePixelRatio || 1
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return true
    }

    if (!updateCanvasSize()) return

    const barWidth = 3
    const barGap = 2
    const barSpacing = barWidth + barGap
    const numBars = Math.ceil(width / barSpacing)
    const maxLen = numBars + 32

    // Initialise circular buffers
    inputHistoryRef.current = { buffer: new Float32Array(maxLen), writeIndex: 0, size: 0 }
    outputHistoryRef.current = { buffer: new Float32Array(maxLen), writeIndex: 0, size: 0 }

    // ── Background ──
    const drawBg = () => {
      const currentTheme = THEMES[variantRef.current]
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      for (const s of currentTheme.bg) {
        grad.addColorStop(s.stop, s.color)
      }
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
    }

    // ── Draw a single waveform ──
    type WaveOpts = {
      history: NonNullable<typeof inputHistoryRef.current>
      level: number
      color: string
      glowColor: string
      idleColor: string
      /** 'ltr' = bars flow left-to-right (newest on right); 'rtl' = right-to-left (newest on left) */
      direction: 'ltr' | 'rtl'
      phaseOffset: number
    }

    const drawWave = (opts: WaveOpts) => {
      const { history, level, color, glowColor, idleColor, direction, phaseOffset } = opts
      const centerY = height / 2
      const maxBarHeight = height * 0.7
      const status = voiceStatusRef.current
      const isActive = status === 'listening' || status === 'speaking'

      // Write current level into buffer
      history.buffer[history.writeIndex] = level
      history.writeIndex = (history.writeIndex + 1) % maxLen
      if (history.size < maxLen) history.size++

      const visibleBars = Math.min(history.size, numBars)

      if (isActive && visibleBars > 0) {
        ctx.save()
        ctx.shadowColor = glowColor
        ctx.shadowBlur = 8

        for (let i = 0; i < visibleBars; i++) {
          let x: number
          if (direction === 'ltr') {
            // Newest bar on right, oldest on left — scrolls left → right
            x = width - (visibleBars - i) * barSpacing
          } else {
            // Newest bar on left, oldest on right — scrolls right → left
            x = (visibleBars - 1 - i) * barSpacing
          }

          const bufIdx = (history.writeIndex - visibleBars + i + maxLen) % maxLen
          const lvl = history.buffer[bufIdx]

          const phase = (timeRef.current + i * 0.25 + phaseOffset) % (Math.PI * 2)
          const baseWave = Math.sin(phase) * 0.2
          const barHeight = Math.max(
            4,
            (baseWave + 0.15 + lvl * 0.85) * maxBarHeight,
          )

          const y = centerY - barHeight / 2
          const alpha = (i / visibleBars) * 0.65 + 0.15

          ctx.fillStyle = color
          ctx.globalAlpha = alpha

          ctx.beginPath()
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2)
          ctx.fill()
        }

        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
        ctx.restore()
      } else if (!isActive) {
        // Idle: flat straight line
        const lineHeight = 2
        const lineY = centerY - (direction === 'ltr' ? 4 : -4)

        ctx.fillStyle = idleColor
        ctx.globalAlpha = 0.5
        ctx.fillRect(width * 0.05, lineY - lineHeight / 2, width * 0.9, lineHeight)
        ctx.globalAlpha = 1
      }
    }

    // ── Thinking state: bouncing dots ──
    const drawThinkingDots = (timestamp: number) => {
      const currentTheme = THEMES[variantRef.current]
      const centerY = height / 2
      const dotRadius = 6
      const dotSpacing = 24
      const startX = width / 2 - dotSpacing

      for (let i = 0; i < 3; i++) {
        const phase = (timestamp * 0.003 + i * 0.6) % (Math.PI * 2)
        const bounce = Math.sin(phase) * 10

        ctx.fillStyle = currentTheme.thinkingDot
        ctx.globalAlpha = 0.4 + Math.sin(phase) * 0.35
        ctx.beginPath()
        ctx.arc(startX + i * dotSpacing, centerY - bounce, dotRadius, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    // ── Animation loop ──
    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, width, height)
      drawBg()

      timeRef.current += 0.04
      const currentTheme = THEMES[variantRef.current]

      if (voiceStatusRef.current === 'thinking') {
        drawThinkingDots(timestamp)
        animFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const inputHist = inputHistoryRef.current!
      const outputHist = outputHistoryRef.current!

      // Draw output wave first (behind)
      drawWave({
        history: outputHist,
        level: outputLevelRef.current ?? 0,
        color: currentTheme.output.color,
        glowColor: currentTheme.output.glow,
        idleColor: currentTheme.output.idle,
        direction: 'rtl',
        phaseOffset: Math.PI * 0.7,
      })

      // Draw input wave on top
      drawWave({
        history: inputHist,
        level: inputLevelRef.current ?? 0,
        color: currentTheme.input.color,
        glowColor: currentTheme.input.glow,
        idleColor: currentTheme.input.idle,
        direction: 'ltr',
        phaseOffset: 0,
      })

      animFrameRef.current = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      updateCanvasSize()
    }

    window.addEventListener('resize', handleResize)
    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Mount-only — all changing values read from refs

  return (
    <canvas
      ref={canvasRef}
      className={`block ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
