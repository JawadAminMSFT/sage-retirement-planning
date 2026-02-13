/**
 * VoiceButton Component
 * Microphone button with persona theming
 * Toggles voice session on/off
 */

import { Mic, MicOff, Square } from 'lucide-react'

interface VoiceButtonProps {
  variant: 'client' | 'advisor'
  isActive: boolean
  isDisabled?: boolean
  onToggle: () => void
  className?: string
}

export default function VoiceButton({
  variant,
  isActive,
  isDisabled = false,
  onToggle,
  className = '',
}: VoiceButtonProps) {
  // Theme colors
  const themes = {
    client: {
      activeGradient: 'from-emerald-500 to-emerald-600',
      hoverGradient: 'hover:from-emerald-600 hover:to-emerald-700',
      shadow: 'shadow-emerald-500/20',
      ring: 'ring-emerald-500/30',
      bg: 'bg-gray-100',
      hoverBg: 'hover:bg-gray-200',
      text: 'text-gray-600',
      activeText: 'text-white',
    },
    advisor: {
      activeGradient: 'from-indigo-500 to-indigo-600',
      hoverGradient: 'hover:from-indigo-600 hover:to-indigo-700',
      shadow: 'shadow-indigo-500/20',
      ring: 'ring-indigo-500/30',
      bg: 'bg-gray-100',
      hoverBg: 'hover:bg-gray-200',
      text: 'text-gray-600',
      activeText: 'text-white',
    },
  }

  const theme = themes[variant]

  // Icon based on state
  const Icon = isActive ? Square : Mic

  return (
    <div className="relative flex-shrink-0">
      {/* Pulse ring when active */}
      {isActive && (
        <div
          className={`absolute inset-0 rounded-xl ${
            variant === 'client' ? 'bg-emerald-500/20' : 'bg-indigo-500/20'
          } animate-ping`}
        />
      )}

      {/* Button */}
      <button
        onClick={onToggle}
        disabled={isDisabled}
        className={`
          relative px-5 py-3 rounded-xl transition-all duration-200
          flex items-center justify-center
          ${isActive
            ? `bg-gradient-to-br ${theme.activeGradient} ${theme.hoverGradient} shadow-lg ${theme.shadow} ${theme.activeText}`
            : `${theme.bg} ${theme.hoverBg} ${theme.text}`
          }
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        aria-label={isActive ? 'Stop voice session' : 'Start voice session'}
        title={isActive ? 'Click to stop' : 'Click to speak'}
      >
        <Icon className="w-5 h-5" />
      </button>
    </div>
  )
}
