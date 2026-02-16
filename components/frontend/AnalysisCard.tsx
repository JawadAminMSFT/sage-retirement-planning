"use client"

import React from "react"
import { Bot, BarChart3, Clock, Zap, Loader2, CheckCircle } from "lucide-react"
import { PoweredByLabel } from "@/components/frontend/shared/PoweredByLabel"
import MetricCard from "@/components/frontend/MetricCard"
import { CashflowChart } from "@/components/frontend/CashflowChart"
import type { AnalysisDisplayData } from "@/lib/analysis"
import type { EvaluationContext, EvaluationResult } from "@/lib/api"

// ─── Props ──────────────────────────────────────────────────────────────────

interface AnalysisCardProps {
  analysis: AnalysisDisplayData
  messageIndex: number
  evaluationContext?: EvaluationContext | null
  evaluationResults: Record<string, EvaluationResult>
  evaluatingMessages: Set<number>
  onEvaluate: (messageIndex: number, context: EvaluationContext) => void
  onSendMessage: (message: string) => void
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const ALLOCATION_PALETTE = [
  "#059669",
  "#10b981",
  "#047857",
  "#16a34a",
  "#065f46",
]

/** Stacked allocation bar + product list */
function AllocationSection({
  products,
}: {
  products: AnalysisDisplayData["products"]
}) {
  const originalTotal =
    products.reduce((s, p) => s + p.allocation, 0) || 1
  const scale = 100 / originalTotal
  const normalized = products.map((p, i) => ({
    ...p,
    displayAllocation: +(p.allocation * scale).toFixed(1),
    color: ALLOCATION_PALETTE[i % ALLOCATION_PALETTE.length],
  }))
  const displayTotal = normalized.reduce(
    (s, p) => s + p.displayAllocation,
    0,
  )
  const adjustment = +(100 - displayTotal).toFixed(1)
  if (Math.abs(adjustment) >= 0.05 && normalized.length) {
    normalized[0].displayAllocation = +(
      normalized[0].displayAllocation + adjustment
    ).toFixed(1)
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-600" />
        <h4 className="text-lg font-semibold text-gray-900">
          Recommended Allocation
        </h4>
        <PoweredByLabel product="Fabric IQ" variant="inline" />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        {/* Stacked bar */}
        <div className="mb-4">
          <div className="flex w-full h-5 overflow-hidden rounded-lg ring-1 ring-gray-200">
            {normalized.map((p, i) => (
              <div
                key={i}
                className="h-full relative group first:rounded-l-lg last:rounded-r-lg"
                style={{
                  width: `${p.displayAllocation}%`,
                  background: p.color,
                }}
                aria-label={`${p.name} ${p.displayAllocation}%`}
                title={`${p.name} - ${p.displayAllocation}%`}
              />
            ))}
          </div>
        </div>
        {/* Product list */}
        <ul className="space-y-3">
          {normalized.map((product, index) => (
            <li
              key={index}
              className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
            >
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: product.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {product.return}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {product.description}
                </p>
              </div>
              <span className="text-lg font-bold text-gray-900 tabular-nums">
                {product.displayAllocation}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── Main AnalysisCard ──────────────────────────────────────────────────────

export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  analysis,
  messageIndex,
  evaluationContext,
  evaluationResults,
  evaluatingMessages,
  onEvaluate,
  onSendMessage,
}) => {
  const evaluationKey = evaluationContext
    ? `${evaluationContext.thread_id}:${evaluationContext.run_id}`
    : null
  const evaluationResult = evaluationKey
    ? evaluationResults[evaluationKey]
    : null
  const isEvaluating = evaluatingMessages.has(messageIndex)

  const getEvaluationTooltip = () => {
    if (!evaluationResult) return "Click to evaluate this analysis"

    const evals = evaluationResult.evaluations
    const results: string[] = []

    if (evals.intent_resolution) {
      const score = evals.intent_resolution.intent_resolution || "N/A"
      const status =
        evals.intent_resolution.intent_resolution_result === "pass"
          ? "✓"
          : "✗"
      results.push(`${status} Intent Resolution: ${score}/5`)
    }
    if (evals.tool_call_accuracy) {
      const score = evals.tool_call_accuracy.tool_call_accuracy || "N/A"
      const status =
        evals.tool_call_accuracy.tool_call_accuracy_result === "pass"
          ? "✓"
          : "✗"
      results.push(`${status} Tool Call Accuracy: ${score}/5`)
    }
    if (evals.task_adherence) {
      const score = evals.task_adherence.task_adherence || "N/A"
      const status =
        evals.task_adherence.task_adherence_result === "pass" ? "✓" : "✗"
      results.push(`${status} Task Adherence: ${score}/5`)
    }

    return results.length > 0 ? results.join("\n") : "Evaluation completed"
  }

  return (
    <div className="mt-6 bg-white/90 border border-gray-200/60 rounded-2xl shadow-sm backdrop-blur-sm overflow-visible animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {analysis.title}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {/* Evaluation button */}
            {evaluationContext && (
              <div className="relative group">
                <button
                  onClick={() =>
                    onEvaluate(messageIndex, evaluationContext)
                  }
                  disabled={isEvaluating}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    evaluationResult
                      ? "bg-green-500/20 hover:bg-green-500/30"
                      : "bg-white/20 hover:bg-white/30"
                  } ${isEvaluating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  title={getEvaluationTooltip()}
                >
                  {isEvaluating ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : evaluationResult ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </button>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-pre-line z-50 pointer-events-none min-w-48 text-center">
                  {getEvaluationTooltip()}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900" />
                </div>
              </div>
            )}

            <PoweredByLabel product="Copilot" variant="dark" />
            <span className="px-3 py-1 bg-white/20 text-white text-sm font-medium rounded-full">
              {analysis.riskLevel}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {analysis.additionalSavings && (
            <MetricCard
              title="Savings Strategy"
              primaryValue={`$${analysis.additionalSavings.currentAmount.toLocaleString()}`}
              primaryUnit="/mo"
              secondaryLabel={
                analysis.additionalSavings.additionalAmount > 0
                  ? "Additional Needed"
                  : undefined
              }
              secondaryValue={
                analysis.additionalSavings.additionalAmount > 0
                  ? `+$${analysis.additionalSavings.additionalAmount.toLocaleString()}`
                  : undefined
              }
              description={analysis.additionalSavings.change}
              deltaValue={
                analysis.additionalSavings.additionalAmount > 0
                  ? analysis.additionalSavings.additionalAmount
                  : 0
              }
              deltaUnit="currency"
              variant={
                analysis.additionalSavings.additionalAmount > 0
                  ? "goal"
                  : "neutral"
              }
            />
          )}

          {analysis.retirementIncome && (
            <MetricCard
              title="Retirement Income"
              primaryValue={`$${analysis.retirementIncome.amount.toLocaleString()}`}
              primaryUnit="/mo"
              baselineLabel="Baseline"
              baselineValue={`$${analysis.retirementIncome.baselineAmount.toLocaleString()}`}
              secondaryLabel="Target"
              secondaryValue={`$${analysis.retirementIncome.targetGoal.toLocaleString()}`}
              description={analysis.retirementIncome.change}
              deltaValue={analysis.retirementIncome.delta}
              deltaUnit="currency"
            />
          )}

          <MetricCard
            title="Success Rate"
            primaryValue={`${analysis.successRate}%`}
            baselineLabel={
              analysis.baselineSuccessRate !== undefined
                ? "Baseline"
                : undefined
            }
            baselineValue={
              analysis.baselineSuccessRate !== undefined
                ? `${analysis.baselineSuccessRate}%`
                : undefined
            }
            description={
              analysis.successRateChange !== undefined
                ? `${analysis.successRateChange > 0 ? "+" : ""}${analysis.successRateChange}% change`
                : "Probability of Success"
            }
            deltaValue={analysis.successRateChange || 0}
            deltaUnit="%"
            progressPercent={analysis.successRate}
          />

          {analysis.extraYears && (
            <MetricCard
              title="Income Duration"
              primaryValue={
                analysis.extraYears.scenarioHorizon !== undefined
                  ? `${analysis.extraYears.scenarioHorizon}`
                  : analysis.extraYears.years > 0
                    ? `+${analysis.extraYears.years}`
                    : `${analysis.extraYears.years}`
              }
              primaryUnit="yrs"
              baselineLabel={
                analysis.extraYears.baselineHorizon !== undefined
                  ? "Baseline"
                  : undefined
              }
              baselineValue={
                analysis.extraYears.baselineHorizon !== undefined
                  ? `${analysis.extraYears.baselineHorizon} yrs`
                  : undefined
              }
              description={
                analysis.extraYears.scenarioHorizon !== undefined
                  ? `${analysis.extraYears.years > 0 ? "+" : ""}${analysis.extraYears.years} vs baseline`
                  : analysis.extraYears.description
              }
              deltaValue={analysis.extraYears.years}
              deltaUnit="years"
              variant="duration"
            />
          )}
        </div>

        {/* Allocation */}
        <AllocationSection products={analysis.products} />

        {/* Cash Flow Chart */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h4 className="text-lg font-semibold text-gray-900">
              Projected Cash Flows
            </h4>
            <PoweredByLabel product="Fabric IQ" variant="inline" />
          </div>
          <div
            className="bg-gray-50 rounded-xl p-5 border border-gray-200"
            aria-label="Projected cash flows over time"
          >
            <CashflowChart cashflows={analysis.cashflows} />
            <p id="cashflow-desc" className="sr-only">
              Area chart showing projected end asset values by year.
            </p>
          </div>
        </div>

        {/* Key Considerations */}
        {analysis.considerations && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-5 h-5 text-gray-600" />
              <h4 className="text-lg font-semibold text-gray-900">
                Key Considerations
              </h4>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 p-5 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 rounded-l-xl" />
              <p className="text-gray-700 leading-relaxed relative z-10 pr-2">
                {analysis.considerations}
              </p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        {(analysis.follow_ups?.length || analysis.alternatives?.length) && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-gray-600" />
              <h4 className="text-lg font-semibold text-gray-900">
                Next Steps
              </h4>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl divide-y md:divide-y-0 md:divide-x flex flex-col md:flex-row">
              {analysis.follow_ups?.length ? (
                <div className="p-4 flex-1">
                  <h5 className="text-sm font-semibold text-gray-800 mb-3">
                    Follow-up Questions
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {analysis.follow_ups.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSendMessage(question)}
                        className="px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-800 text-xs rounded-full transition-colors text-left w-full justify-start flex"
                      >
                        <span className="flex-1">{question}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {analysis.alternatives?.length ? (
                <div className="p-4 flex-1">
                  <h5 className="text-sm font-semibold text-gray-800 mb-3">
                    Scenario Ideas
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {analysis.alternatives.map((alt, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSendMessage(alt)}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs rounded-full transition-colors text-left w-full justify-start flex"
                      >
                        <span className="flex-1">{alt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-10">
          <div className="rounded-lg bg-amber-50 border border-amber-200/70 p-4 text-xs text-amber-800 leading-relaxed flex gap-2">
            <span className="font-semibold">Disclaimer:</span>
            <span>
              This analysis is provided for informational purposes to explore
              retirement planning scenarios and does not constitute investment
              advice. Consult a qualified financial advisor before making
              investment decisions.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalysisCard
