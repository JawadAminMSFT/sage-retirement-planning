"use client"

import React from "react"
import { Loader2 } from "lucide-react"

interface StatusBubbleProps {
  status: string
}

const statusSteps = [
  "Starting analysis",
  "Analyzing profile",
  "Evaluating scenario",
  "Running simulations",
  "Calculating projections",
  "Building recommendations",
  "Finalizing results",
]

function getStepIndex(status: string): number {
  const lower = status.toLowerCase()
  const idx = statusSteps.findIndex((s) => lower.includes(s.toLowerCase().split(" ")[0]))
  return idx >= 0 ? idx : 0
}

export const StatusBubble: React.FC<StatusBubbleProps> = ({ status }) => {
  const step = getStepIndex(status)

  return (
    <div className="flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Pulsing avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/20">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
      </div>

      {/* Status card */}
      <div className="flex-1 max-w-md">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50/80 border border-green-200/60 px-5 py-4 rounded-2xl rounded-tl-sm shadow-sm">
          <span className="text-green-800 font-semibold text-sm">{status}</span>

          {/* Step progress dots */}
          <div className="flex items-center gap-1.5 mt-3">
            {statusSteps.slice(0, 5).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i <= step
                    ? "bg-green-500 w-6"
                    : i === step + 1
                      ? "bg-green-300 w-4 animate-pulse"
                      : "bg-green-200 w-3"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusBubble
