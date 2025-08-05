"use client"

import React, { useState, useMemo } from "react"
import { ArrowLeft } from "lucide-react"
import type { UserProfile } from "@/lib/api"
import { formatCurrency } from "@/lib/analysis"
import { getPortfolioData } from "@/lib/mockPortfolio"

// ─── Types ──────────────────────────────────────────────────────────────────

type TxFilter = "all" | "contribution" | "dividend" | "trade" | "rebalance" | "withdrawal" | "fee"

interface ActivityViewProps {
  selectedProfile: UserProfile | null
  onBack: () => void
}

const filterLabels: Record<TxFilter, string> = {
  all: "All",
  contribution: "Contributions",
  dividend: "Dividends",
  trade: "Trades",
  rebalance: "Rebalance",
  withdrawal: "Withdrawals",
  fee: "Fees",
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ActivityView: React.FC<ActivityViewProps> = ({
  selectedProfile,
  onBack,
}) => {
  const [filter, setFilter] = useState<TxFilter>("all")

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

  const filtered = useMemo(() => {
    const txs = portfolio.recentActivity
    return filter === "all" ? txs : txs.filter((t) => t.type === filter)
  }, [portfolio.recentActivity, filter])

  // Determine unique types for filter tabs
  const availableTypes = useMemo(() => {
    const types = new Set(portfolio.recentActivity.map((t) => t.type))
    return (["all", ...types] as TxFilter[])
  }, [portfolio.recentActivity])

  // Group by month
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filtered>()
    for (const tx of filtered) {
      const d = new Date(tx.date)
      const key = d.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(tx)
    }
    return Array.from(groups)
  }, [filtered])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-5 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
            <p className="text-gray-500 text-sm">
              {portfolio.recentActivity.length} recent transactions
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-2 px-2">
          {availableTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                filter === type
                  ? "bg-green-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filterLabels[type]}
            </button>
          ))}
        </div>

        {/* Transaction Groups */}
        {grouped.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No transactions match this filter
          </div>
        )}

        {grouped.map(([month, txs]) => (
          <div key={month}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {month}
            </h3>
            <div className="bg-white rounded-2xl border border-gray-200/80 divide-y divide-gray-100">
              {txs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <span className="text-lg w-8 text-center flex-shrink-0">
                    {tx.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-400">
                      {tx.account} ·{" "}
                      {new Date(tx.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {tx.symbol && (
                        <span className="ml-1.5 text-gray-500 font-medium">
                          {tx.symbol}
                        </span>
                      )}
                    </p>
                  </div>
                  {tx.amount !== 0 && (
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        tx.amount > 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </span>
                  )}
                  {tx.amount === 0 && (
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                      Auto
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ActivityView
