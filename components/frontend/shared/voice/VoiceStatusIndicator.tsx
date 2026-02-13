/**
 * VoiceStatusIndicator Component
 * Animated pill/badge showing current voice session state
 * Uses themed colors and per-state animated icons
 */

import { Mic, Loader2, Volume2, AlertCircle } from 'lucide-react'
import type { VoiceStatus } from './useVoiceSession'

interface VoiceStatusIndicatorProps {
  status: VoiceStatus
  variant: 'client' | 'advisor'
  className?: string
}

const STATUS_CONFIG = {
  listening: {
    icon: Mic,
    label: 'Listening',
    iconClass: 'animate-pulse',
    client: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    advisor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  thinking: {
    icon: Loader2,
    label: 'Processing',
    iconClass: 'animate-spin',
    client: 'bg-amber-100 text-amber-700 border-amber-200',
    advisor: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  speaking: {
    icon: Volume2,
    label: 'Speaking',
    iconClass: '',
    client: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    advisor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    iconClass: '',
    client: 'bg-red-100 text-red-700 border-red-200',
    advisor: 'bg-red-100 text-red-700 border-red-200',
  },
} as const

const speakingPulseStyle = {
  animation: 'voice-pulse 1.2s ease-in-out infinite',
}

export default function VoiceStatusIndicator({
  status,
  variant,
  className = '',
}: VoiceStatusIndicatorProps) {
  if (status === 'idle') return null

  const config = STATUS_CONFIG[status]
  if (!config) return null

  const Icon = config.icon
  const colorClass = config[variant]

  return (
    <>
      <style>{`
        @keyframes voice-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
      `}</style>
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shadow-sm border ${colorClass} ${className}`}
      >
        <Icon
          className={`w-3.5 h-3.5 ${config.iconClass}`}
          style={status === 'speaking' ? speakingPulseStyle : undefined}
        />
        {config.label}
      </span>
    </>
  )
}
