"use client"

import React from "react"
import { User, Briefcase, Shield } from "lucide-react"
import type { UserRole } from "@/lib/types"

interface ModeToggleProps {
  currentMode: UserRole
  onModeChange: (mode: UserRole) => void
  availableModes?: UserRole[]
  className?: string
}

const modeConfig: Record<UserRole, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  client: {
    label: "Personal",
    icon: User,
    color: "emerald",
  },
  advisor: {
    label: "Advisor",
    icon: Briefcase,
    color: "indigo",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    color: "amber",
  },
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  currentMode,
  onModeChange,
  availableModes = ["client", "advisor", "admin"],
  className = "",
}) => {
  return (
    <div className={`inline-flex items-center bg-gray-100 rounded-xl p-1 ${className}`}>
      {availableModes.map((mode) => {
        const config = modeConfig[mode]
        const Icon = config.icon
        const isActive = currentMode === mode
        
        // Dynamic color classes based on mode
        const activeClasses = isActive
          ? mode === "client"
            ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
            : mode === "advisor"
            ? "bg-white text-indigo-700 shadow-sm border border-indigo-100"
            : "bg-white text-amber-700 shadow-sm border border-amber-100"
          : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
        
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 ${activeClasses}
            `}
            title={`Switch to ${config.label} view`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Compact version for mobile or tight spaces
export const ModeToggleCompact: React.FC<ModeToggleProps> = ({
  currentMode,
  onModeChange,
  availableModes = ["client", "advisor", "admin"],
  className = "",
}) => {
  return (
    <div className={`inline-flex items-center bg-gray-100 rounded-lg p-0.5 ${className}`}>
      {availableModes.map((mode) => {
        const config = modeConfig[mode]
        const Icon = config.icon
        const isActive = currentMode === mode
        
        const activeClasses = isActive
          ? mode === "client"
            ? "bg-emerald-500 text-white shadow-sm"
            : mode === "advisor"
            ? "bg-indigo-500 text-white shadow-sm"
            : "bg-amber-500 text-white shadow-sm"
          : "text-gray-400 hover:text-gray-600"
        
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`
              p-2 rounded-md transition-all duration-200 ${activeClasses}
            `}
            title={`Switch to ${config.label} view`}
          >
            <Icon className="w-4 h-4" />
          </button>
        )
      })}
    </div>
  )
}

export default ModeToggle
