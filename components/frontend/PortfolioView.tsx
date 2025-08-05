"use client"

import React, { useMemo, useState, useCallback } from "react"
import { TrendingUp, TrendingDown, PieChart, ArrowLeft, Sparkles } from "lucide-react"
import type { UserProfile, ScenarioProjectionResponse } from "@/lib/api"
import { projectScenario } from "@/lib/api"
import { formatCurrency } from "@/lib/analysis"
import { getPortfolioData, type PortfolioData } from "@/lib/mockPortfolio"
import { ScenarioProjectionOverlay, DiffBadge } from "./ScenarioProjectionOverlay"

// ─── Types ──────────────────────────────────────────────────────────────────

interface PortfolioViewProps {
  selectedProfile: UserProfile | null
  onBack: () => void
}

type Timeframe = 3 | 6 | 12

// ─── Allocation bar ─────────────────────────────────────────────────────────

function AllocationBar({ holdings }: { holdings: PortfolioData["holdings"] }) {
  return (
    <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
      {holdings.map((h) => (
        <div
          key={h.symbol}
          className="h-full first:rounded-l-full last:rounded-r-full transition-all"
          style={{
            width: `${h.allocation}%`,
            backgroundColor: h.color,
          }}
          title={`${h.symbol} — ${h.allocation}%`}
        />
      ))}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  selectedProfile,
  onBack,
}) => {
  // Projection state
  const [projectionMode, setProjectionMode] = useState(false)
  const [isProjecting, setIsProjecting] = useState(false)
  const [projection, setProjection] = useState<ScenarioProjectionResponse | null>(null)
  const [projectionError, setProjectionError] = useState<string | null>(null)

  const portfolio = useMemo(
    () =>
      getPortfolioData(
        selectedProfile
          ? {
              age: selectedProfile.age,
              salary: selectedProfile.salary,
              risk_appetite: selectedProfile.risk_appetite,
              target_retire_age: selectedProfile.target_retire_age,
              yearly_savings_rate: selectedProfile.yearly_savings_rate,
              name: selectedProfile.name,
              target_monthly_income: selectedProfile.target_monthly_income,
              investment_assets: selectedProfile.investment_assets,
            }
          : undefined,
      ),
    [selectedProfile],
  )

  // Group holdings by sector for the sector summary
  const sectors = useMemo(() => {
    const map = new Map<string, { total: number; color: string }>()
    for (const h of portfolio.holdings) {
      const entry = map.get(h.sector) || { total: 0, color: h.color }
      entry.total += h.allocation
      map.set(h.sector, entry)
    }
    return Array.from(map, ([sector, data]) => ({
      sector,
      allocation: data.total,
      color: data.color,
    })).sort((a, b) => b.allocation - a.allocation)
  }, [portfolio.holdings])

  const riskLabel = selectedProfile?.risk_appetite === "low"
    ? "Conservative"
    : selectedProfile?.risk_appetite === "high"
      ? "Aggressive"
      : "Moderate"

  // Handle projection submission
  const handleProjectScenario = useCallback(
    async (scenarioDescription: string, timeframeMonths: Timeframe) => {
      if (!selectedProfile) return

      setIsProjecting(true)
      setProjectionError(null)

      try {
        const result = await projectScenario({
          profile_id: selectedProfile.id,
          scenario_description: scenarioDescription,
          timeframe_months: timeframeMonths,
          current_portfolio: {
            total_value: portfolio.totalValue,
            accounts: portfolio.accounts.map((a) => ({
              id: a.id,
              name: a.name,
              balance: a.balance,
            })),
            holdings: portfolio.holdings.map((h) => ({
              symbol: h.symbol,
              name: h.name,
              value: h.value,
              allocation: h.allocation,
            })),
          },
        })
        setProjection(result)
      } catch (err) {
        setProjectionError(
          err instanceof Error ? err.message : "Projection failed"
        )
      } finally {
        setIsProjecting(false)
      }
    },
    [selectedProfile, portfolio]
  )

  // Exit projection mode
  const handleExitProjection = useCallback(() => {
    setProjectionMode(false)
    setProjection(null)
    setProjectionError(null)
  }, [])

  // Get projected value for an account
  const getProjectedAccount = (accountId: string) => {
    return projection?.projection.accounts.find((a) => a.id === accountId)
  }

  // Get projected value for a holding
  const getProjectedHolding = (symbol: string) => {
    return projection?.projection.holdings.find((h) => h.symbol === symbol)
  }

  return (
    <div className={`h-full overflow-y-auto ${projectionMode ? "bg-gradient-to-b from-indigo-50/30 to-white" : ""}`}>
      {/* Projection Overlay */}
      <ScenarioProjectionOverlay
        isOpen={projectionMode}
        isLoading={isProjecting}
        projection={projection}
        error={projectionError}
        onSubmit={handleProjectScenario}
        onClose={handleExitProjection}
      />

      <div className="max-w-5xl mx-auto p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
              <p className="text-gray-500 text-sm">
                {riskLabel} · {portfolio.holdings.length} holdings
              </p>
            </div>
          </div>
          {/* What If Button */}
          {!projectionMode && (
            <button
              onClick={() => setProjectionMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30"
            >
              <Sparkles className="w-4 h-4" />
              What If
            </button>
          )}
        </div>

        {/* Total + Accounts Summary */}
        <div className={`bg-white rounded-2xl border p-6 ${projectionMode && projection ? "border-indigo-200 ring-1 ring-indigo-100" : "border-gray-200/80"}`}>
          <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
            <div>
              <p className="text-sm text-gray-500 font-medium mb-1">
                {projectionMode && projection ? "Projected Total Value" : "Total Value"}
              </p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl font-bold text-gray-900 tabular-nums">
                  {formatCurrency(
                    projectionMode && projection
                      ? projection.projection.total_value
                      : portfolio.totalValue
                  )}
                </span>
                {projectionMode && projection && (
                  <DiffBadge
                    change={projection.projection.total_change}
                    changePercent={projection.projection.total_change_percent}
                  />
                )}
              </div>
              {projectionMode && projection && (
                <p className="text-xs text-gray-400 mt-1">
                  Current: {formatCurrency(portfolio.totalValue)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">YTD Return</p>
              <span className="text-lg font-bold text-green-600">
                +{formatCurrency(portfolio.ytdReturn)} ({portfolio.ytdReturnPercent}%)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {portfolio.accounts.map((a) => {
              const projectedAccount = getProjectedAccount(a.id)
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 rounded-xl p-3 ${
                    projectionMode && projection
                      ? "bg-indigo-50/50 border border-indigo-100"
                      : "bg-gray-50/80"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {a.name}
                    </p>
                    <p className="text-xs text-gray-400">{a.institution}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900 text-sm tabular-nums block">
                      {formatCurrency(
                        projectionMode && projectedAccount
                          ? projectedAccount.projected_value
                          : a.balance
                      )}
                    </span>
                    {projectionMode && projectedAccount && (
                      <DiffBadge
                        change={projectedAccount.change}
                        changePercent={projectedAccount.change_percent}
                        size="sm"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Allocation Bar + Legend */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Asset Allocation</h2>
          </div>
          <AllocationBar holdings={portfolio.holdings} />
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
            {sectors.map((s) => (
              <div key={s.sector} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-gray-600">{s.sector}</span>
                <span className="font-semibold text-gray-900">
                  {s.allocation}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Holdings Table */}
        <div className={`bg-white rounded-2xl border overflow-hidden ${projectionMode && projection ? "border-indigo-200" : "border-gray-200/80"}`}>
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              {projectionMode && projection ? "Projected Holdings" : "Holdings"}
            </h2>
            {projectionMode && projection && (
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                Projection Active
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">
                    Shares
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    {projectionMode && projection ? "Projected Value" : "Value"}
                  </th>
                  <th className="px-4 py-3 font-medium text-right hidden md:table-cell">
                    {projectionMode && projection ? "Projection Δ" : "Gain / Loss"}
                  </th>
                  <th className="px-6 py-3 font-medium text-right">
                    Allocation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {portfolio.holdings.map((h) => {
                  const projectedHolding = getProjectedHolding(h.symbol)
                  return (
                    <tr
                      key={h.symbol}
                      className={`transition-colors ${
                        projectionMode && projection
                          ? "hover:bg-indigo-50/30"
                          : "hover:bg-gray-50/60"
                      }`}
                    >
                      <td className="px-6 py-3.5">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {h.symbol}
                          </p>
                          <p className="text-xs text-gray-400 truncate max-w-[140px]">
                            {h.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 hidden sm:table-cell tabular-nums">
                        {h.shares.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-medium text-gray-900 tabular-nums">
                          {formatCurrency(
                            projectionMode && projectedHolding
                              ? projectedHolding.projected_value
                              : h.value
                          )}
                        </span>
                        {projectionMode && projectedHolding && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            was {formatCurrency(h.value)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right hidden md:table-cell">
                        {projectionMode && projectedHolding ? (
                          <DiffBadge
                            change={projectedHolding.change}
                            changePercent={projectedHolding.change_percent}
                            size="sm"
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 font-medium tabular-nums ${
                              h.gainLoss >= 0 ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {h.gainLoss >= 0 ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {h.gainLoss >= 0 ? "+" : ""}
                            {formatCurrency(h.gainLoss)} ({h.gainLossPercent}%)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 hidden sm:block">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${
                                  projectionMode && projectedHolding
                                    ? projectedHolding.projected_allocation
                                    : h.allocation
                                }%`,
                                backgroundColor: h.color,
                              }}
                            />
                          </div>
                          <span className="font-semibold text-gray-900 tabular-nums w-10 text-right">
                            {projectionMode && projectedHolding
                              ? projectedHolding.projected_allocation
                              : h.allocation}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PortfolioView
