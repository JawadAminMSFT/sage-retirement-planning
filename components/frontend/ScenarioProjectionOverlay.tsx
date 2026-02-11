"use client"

import React, { useState, useEffect } from "react"
import {
  Sparkles,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Info,
  History,
  Save,
  Trash2,
  ChevronRight,
} from "lucide-react"
import type { ScenarioProjectionResponse } from "@/lib/api"
import {
  listSavedScenarios,
  getSavedScenario,
  saveScenario,
  deleteSavedScenario,
  type SavedScenarioSummary,
  getApiMode,
} from "@/lib/api"

// ─── Types ──────────────────────────────────────────────────────────────────

type Timeframe = 3 | 6 | 12

interface ScenarioProjectionOverlayProps {
  isOpen: boolean
  isLoading: boolean
  projection: ScenarioProjectionResponse | null
  error: string | null
  userId: string
  onSubmit: (scenario: string, timeframeMonths: Timeframe) => void
  onClose: () => void
  onLoadProjection?: (projection: ScenarioProjectionResponse) => void
}

// ─── Timeframe Button ───────────────────────────────────────────────────────

function TimeframeButton({
  months,
  selected,
  onClick,
  disabled,
}: {
  months: Timeframe
  selected: boolean
  onClick: () => void
  disabled: boolean
}) {
  const label = months === 12 ? "1 Year" : `${months}M`
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        selected
          ? "bg-indigo-600 text-white shadow-md"
          : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  )
}

// ─── Diff Badge ─────────────────────────────────────────────────────────────

export function DiffBadge({
  change,
  changePercent,
  size = "md",
}: {
  change: number
  changePercent: number
  size?: "sm" | "md"
}) {
  const isPositive = change >= 0
  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"
  
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-lg ${sizeClasses} ${
        isPositive
          ? "text-emerald-700 bg-emerald-50"
          : "text-red-700 bg-red-50"
      }`}
    >
      {isPositive ? (
        <TrendingUp className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      ) : (
        <TrendingDown className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      )}
      {isPositive ? "+" : ""}
      {changePercent.toFixed(1)}%
    </span>
  )
}

// ─── Example Scenarios ──────────────────────────────────────────────────────

const exampleScenarios = [
  { label: "Max 401(k)", scenario: "I maximize my 401k contributions" },
  { label: "+5% savings", scenario: "I increase my savings rate by 5%" },
  { label: "Market crash", scenario: "There is a 20% market crash" },
  { label: "Stop contributing", scenario: "I stop all retirement contributions" },
  { label: "Add Roth IRA", scenario: "I add $500/month to my Roth IRA" },
  { label: "Early retirement", scenario: "I retire 5 years earlier than planned" },
]

// ─── Main Component ─────────────────────────────────────────────────────────

export const ScenarioProjectionOverlay: React.FC<ScenarioProjectionOverlayProps> = ({
  isOpen,
  isLoading,
  projection,
  error,
  userId,
  onSubmit,
  onClose,
  onLoadProjection,
}) => {
  const [scenarioInput, setScenarioInput] = useState("")
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(12)
  const [showHistory, setShowHistory] = useState(false)
  const [savedScenarios, setSavedScenarios] = useState<SavedScenarioSummary[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Load saved scenarios when history panel opens
  useEffect(() => {
    if (showHistory && userId && getApiMode() === "live") {
      setLoadingHistory(true)
      listSavedScenarios(userId)
        .then(setSavedScenarios)
        .finally(() => setLoadingHistory(false))
    }
  }, [showHistory, userId])

  const handleSaveScenario = async () => {
    if (!projection || !userId || getApiMode() === "mock") return
    
    setIsSaving(true)
    const name = scenarioInput || "Unnamed Scenario"
    const id = await saveScenario(
      userId,
      name,
      scenarioInput,
      selectedTimeframe,
      projection
    )
    setIsSaving(false)
    
    if (id) {
      // Refresh list
      const updated = await listSavedScenarios(userId)
      setSavedScenarios(updated)
    }
  }

  const handleLoadScenario = async (scenarioId: string) => {
    if (!userId) return
    
    const scenario = await getSavedScenario(userId, scenarioId)
    if (scenario && onLoadProjection) {
      setScenarioInput(scenario.description)
      setSelectedTimeframe(scenario.timeframe_months as Timeframe)
      onLoadProjection(scenario.projection_result as ScenarioProjectionResponse)
      setShowHistory(false)
    }
  }

  const handleDeleteScenario = async (scenarioId: string) => {
    if (!userId) return
    
    const success = await deleteSavedScenario(userId, scenarioId)
    if (success) {
      setSavedScenarios(prev => prev.filter(s => s.id !== scenarioId))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (scenarioInput.trim() && !isLoading) {
      onSubmit(scenarioInput.trim(), selectedTimeframe)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  if (!isOpen) return null

  const isLiveMode = getApiMode() === "live"

  return (
    <>
      {/* Projection Mode Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-sm">Projection Mode</p>
            <p className="text-xs text-indigo-200">
              {projection
                ? `Showing ${selectedTimeframe === 12 ? "1 year" : `${selectedTimeframe} month`} projection`
                : "Enter a scenario to see projected changes"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* History Button */}
          {isLiveMode && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showHistory 
                  ? "bg-white text-indigo-600" 
                  : "bg-white/20 hover:bg-white/30"
              }`}
            >
              <History className="w-4 h-4" />
              History
            </button>
          )}
          {/* Save Button */}
          {isLiveMode && projection && (
            <button
              onClick={handleSaveScenario}
              disabled={isSaving}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          )}
          {/* Exit Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Exit
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && isLiveMode && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <History className="w-4 h-4" />
              Saved Scenarios
            </h3>
            {loadingHistory ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            ) : savedScenarios.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">No saved scenarios yet. Run a projection and click Save to store it.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {savedScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200 hover:border-indigo-300 transition-colors"
                  >
                    <button
                      onClick={() => handleLoadScenario(scenario.id)}
                      className="flex-1 text-left flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{scenario.name}</p>
                        <p className="text-xs text-gray-500">
                          {scenario.timeframe_months}M • {new Date(scenario.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-sm font-medium ${scenario.total_change_percent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {scenario.total_change_percent >= 0 ? "+" : ""}{scenario.total_change_percent.toFixed(1)}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteScenario(scenario.id)}
                      className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Scenario Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={scenarioInput}
                onChange={(e) => setScenarioInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your scenario... (e.g., 'I increase my 401k contribution to 15%')"
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
                disabled={isLoading}
              />
              {isLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                </div>
              )}
            </div>

            {/* Timeframe Tabs */}
            <div className="flex items-center gap-2">
              {([3, 6, 12] as Timeframe[]).map((months) => (
                <TimeframeButton
                  key={months}
                  months={months}
                  selected={selectedTimeframe === months}
                  onClick={() => setSelectedTimeframe(months)}
                  disabled={isLoading}
                />
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!scenarioInput.trim() || isLoading}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Projecting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Project
                </>
              )}
            </button>
          </div>

          {/* Example Scenarios */}
          {!projection && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-400 mr-1 py-1">Try:</span>
              {exampleScenarios.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => setScenarioInput(example.scenario)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {example.label}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3 text-red-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Projection Summary (when available) */}
      {projection && !isLoading && (
        <div className="bg-gradient-to-b from-indigo-50/50 to-transparent border-b border-indigo-100 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            {/* Summary */}
            <div className="bg-white rounded-xl border border-indigo-100 p-4 mb-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {projection.summary}
                </p>
              </div>
            </div>

            {/* Assumptions, Risks, Opportunities */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Assumptions */}
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Assumptions
                </p>
                <ul className="space-y-1">
                  <li className="text-xs text-gray-600">
                    Market return: {(projection.assumptions.market_return_annual * 100).toFixed(0)}%/yr
                  </li>
                  <li className="text-xs text-gray-600">
                    Inflation: {(projection.assumptions.inflation_rate * 100).toFixed(1)}%
                  </li>
                </ul>
              </div>

              {/* Risks */}
              {projection.risks.length > 0 && (
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                      Risks
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {projection.risks.slice(0, 2).map((risk, i) => (
                      <li key={i} className="text-xs text-amber-800">
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Opportunities */}
              {projection.opportunities.length > 0 && (
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                      Opportunities
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {projection.opportunities.slice(0, 2).map((opp, i) => (
                      <li key={i} className="text-xs text-emerald-800">
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Shimmer (when loading without prior projection) */}
      {isLoading && !projection && (
        <div className="bg-gradient-to-b from-indigo-50/50 to-transparent border-b border-indigo-100 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ScenarioProjectionOverlay
