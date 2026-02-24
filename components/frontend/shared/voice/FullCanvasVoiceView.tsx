/**
 * FullCanvasVoiceView
 * Immersive full-canvas voice experience that replaces the chat body.
 * Features dual overlapping waveforms, status indicator, live transcript overlay,
 * and a large stop button.
 *
 * Voice mechanics (useVoiceSession) are owned by the parent (PlanningView / AdvisorChatView)
 * and passed in via props so the session persists across mode switches.
 */

"use client"

import React, { useEffect, type RefObject } from 'react'
import { Square, Mic, Volume2, Loader2, AlertCircle } from 'lucide-react'
import DualWaveformCanvas from './DualWaveformCanvas'
import type { VoiceStatus } from './useVoiceSession'

interface FullCanvasVoiceViewProps {
  variant: 'client' | 'advisor'
  voiceStatus: VoiceStatus
  inputLevelRef: RefObject<number>
  outputLevelRef: RefObject<number>
  interimTranscript: string
  interimRole: 'user' | 'assistant' | null
  onToggleSession: () => void
  error: string | null
}

// Status config for the floating pill
const STATUS_UI: Record<
  Exclude<VoiceStatus, 'idle'>,
  { icon: React.FC<{ className?: string }>; label: string; iconClass: string }
> = {
  listening: { icon: Mic, label: 'Listening', iconClass: 'animate-pulse' },
  thinking: { icon: Loader2, label: 'Processing', iconClass: 'animate-spin' },
  speaking: { icon: Volume2, label: 'Speaking', iconClass: '' },
  error: { icon: AlertCircle, label: 'Error', iconClass: '' },
}

export default function FullCanvasVoiceView({
  variant,
  voiceStatus,
  inputLevelRef,
  outputLevelRef,
  interimTranscript,
  interimRole,
  onToggleSession,
  error,
}: FullCanvasVoiceViewProps) {
  const isActive = voiceStatus !== 'idle'
  const isClient = variant === 'client'

  // Auto-start voice session when entering voice mode
  useEffect(() => {
    if (voiceStatus === 'idle') {
      onToggleSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  const accentColor = isClient ? 'emerald' : 'indigo'

  return (
    <div className="relative flex flex-col h-full w-full overflow-hidden select-none">
      {/* Full-canvas dual waveform background */}
      <div className="absolute inset-0">
        <DualWaveformCanvas
          inputLevelRef={inputLevelRef}
          outputLevelRef={outputLevelRef}
          variant={variant}
          voiceStatus={voiceStatus}
        />
      </div>

      {/* Overlay content on top of canvas */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Top section — status pill */}
        <div className="flex justify-center pt-8">
          {isActive && STATUS_UI[voiceStatus as Exclude<VoiceStatus, 'idle'>] && (() => {
            const cfg = STATUS_UI[voiceStatus as Exclude<VoiceStatus, 'idle'>]
            const Icon = cfg.icon
            return (
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shadow-sm backdrop-blur-md border ${
                  isClient
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${cfg.iconClass}`} />
                {cfg.label}
              </span>
            )
          })()}
        </div>

        {/* Spacer — pushes bottom controls down */}
        <div className="flex-1" />

        {/* Live transcript overlay */}
        {interimTranscript && (
          <div className="px-8 pb-4 flex justify-center">
            <div
              className={`max-w-lg px-5 py-3 rounded-2xl backdrop-blur-md text-sm leading-relaxed shadow-sm ${
                interimRole === 'user'
                  ? isClient
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                  : 'bg-gray-50 text-gray-800 border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isClient ? 'bg-emerald-400' : 'bg-indigo-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    isClient ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`} />
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {interimRole === 'user' ? 'You' : 'Sage'}
                </span>
              </div>
              <p>{interimTranscript}</p>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="px-8 pb-2 flex justify-center">
            <div className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200 backdrop-blur-md">
              {error}
            </div>
          </div>
        )}

        {/* Bottom controls — large stop/start button + legend */}
        <div className="flex flex-col items-center gap-4 pb-8">
          {/* Mic / Stop button */}
          <div className="relative">
            {isActive && (
              <div
                className={`absolute inset-0 rounded-full ${
                  isClient ? 'bg-emerald-500/20' : 'bg-indigo-500/20'
                } animate-ping`}
                style={{ animationDuration: '2s' }}
              />
            )}
            <button
              onClick={onToggleSession}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                isActive
                  ? isClient
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/30'
                    : 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-indigo-500/30'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-300'
              }`}
              aria-label={isActive ? 'End voice session' : 'Start voice session'}
            >
              {isActive ? (
                <Square className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400">
            {isActive ? 'Tap to end session' : 'Tap to start speaking'}
          </p>
        </div>
      </div>
    </div>
  )
}
