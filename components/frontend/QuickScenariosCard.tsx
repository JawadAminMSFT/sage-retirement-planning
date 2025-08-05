"use client"

import React from "react"
import { Zap } from "lucide-react"

interface QuickScenariosCardProps {
  scenarios: string[]
  onSelectScenario: (scenario: string) => void
}

export const QuickScenariosCard: React.FC<QuickScenariosCardProps> = ({
  scenarios,
  onSelectScenario,
}) => (
  <div className="mt-6 p-6 bg-gradient-to-br from-green-50/80 to-emerald-50/60 border border-green-200/50 rounded-2xl animate-in fade-in slide-in-from-bottom-3 duration-500">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
        <Zap className="w-4 h-4 text-white" />
      </div>
      <h3 className="text-base font-bold text-gray-900">Explore Scenarios</h3>
    </div>
    <p className="text-sm text-gray-500 mb-5 ml-11">
      Ask me anything — or try one of these common questions:
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {scenarios.slice(0, 6).map((scenario, index) => (
        <button
          key={index}
          onClick={() => onSelectScenario(scenario)}
          className="flex items-start gap-3 p-3.5 bg-white/80 hover:bg-white border border-gray-200/60 hover:border-green-300 rounded-xl text-left transition-all duration-200 group hover:shadow-sm"
        >
          <span className="text-green-500 text-xs font-bold mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
            →
          </span>
          <span className="text-sm text-gray-700 group-hover:text-gray-900 leading-snug">
            {scenario}
          </span>
        </button>
      ))}
    </div>
  </div>
)

export default QuickScenariosCard
