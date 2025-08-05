"use client"

import React, { useState, useMemo } from "react"
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Leaf,
  Target,
  ChevronRight,
  Building2,
  Shield,
  Wallet,
  Heart,
  DollarSign,
  RefreshCw,
  Shuffle,
  FileText,
  ArrowDownCircle,
} from "lucide-react"
import type { UserProfile } from "@/lib/api"
import { formatCurrency } from "@/lib/analysis"
import {
  getPortfolioData,
  getPerformanceForRange,
  type TimeRange,
  type PortfolioData,
  type AccountIconType,
  type TransactionIconType,
} from "@/lib/mockPortfolio"

// ─── Icon Mapping ───────────────────────────────────────────────────────────

const accountIcons: Record<AccountIconType, React.ComponentType<{ className?: string }>> = {
  building: Building2,
  shield: Shield,
  "trending-up": TrendingUp,
  wallet: Wallet,
  heart: Heart,
}

const transactionIcons: Record<TransactionIconType, React.ComponentType<{ className?: string }>> = {
  "dollar-sign": DollarSign,
  "trending-up": TrendingUp,
  "refresh-cw": RefreshCw,
  shield: Shield,
  shuffle: Shuffle,
  "file-text": FileText,
  "arrow-down-circle": ArrowDownCircle,
}

// ─── Types ──────────────────────────────────────────────────────────────────

type AppView = "dashboard" | "portfolio" | "planning" | "activity"

interface DashboardViewProps {
  selectedProfile: UserProfile | null
  onNavigate: (view: AppView) => void
}

// ─── Mini performance chart ─────────────────────────────────────────────────

function PerformanceChart({
  data,
}: {
  data: { date: string; value: number }[]
}) {
  if (data.length < 2) return null
  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 600
  const h = 160
  const pad = { t: 12, r: 12, b: 12, l: 12 }

  const points = data.map((d, i) => ({
    x: pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r),
    y: pad.t + (1 - (d.value - min) / range) * (h - pad.t - pad.b),
  }))

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ")
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${h - pad.b} L ${points[0].x} ${h - pad.b} Z`
  const isPositive = values[values.length - 1] >= values[0]
  const color = isPositive ? "#16a34a" : "#dc2626"

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${w} ${h}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="perfGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#perfGrad)" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Retirement progress ring ───────────────────────────────────────────────

function ProgressRing({
  percent,
  size = 88,
}: {
  percent: number
  size?: number
}) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(percent, 100) / 100)
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth={8}
      />
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#progressGradient)"
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out drop-shadow-sm"
      />
    </svg>
  )
}

// ─── Dashboard View ─────────────────────────────────────────────────────────

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedProfile,
  onNavigate,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("1M")

  const portfolio: PortfolioData = useMemo(
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

  const perfData = useMemo(
    () => getPerformanceForRange(portfolio.totalValue, timeRange),
    [portfolio.totalValue, timeRange],
  )

  const firstName = selectedProfile?.name.split(" ")[0] || "there"
  const goal = portfolio.retirementGoal
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-8 pb-24 md:pb-6">
        {/* Greeting + Quick Stats */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl tracking-tight text-gray-900">
              <span className="font-normal">{greeting}, </span>
              <span className="font-bold">{firstName}!</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">YTD Return</p>
              <p className="text-lg font-semibold text-emerald-600 tabular-nums">+{portfolio.ytdReturnPercent}%</p>
            </div>
            <div className="w-px h-10 bg-gray-100" />
            <div className="text-right">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Retirement</p>
              <p className="text-lg font-semibold text-gray-900 tabular-nums">{goal.yearsRemaining} yrs</p>
            </div>
          </div>
        </div>

        {/* Portfolio Value + Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 pb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Net Worth
            </p>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-4xl font-bold text-gray-900 tracking-tight tabular-nums">
                {formatCurrency(portfolio.totalValue)}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-lg ${
                  portfolio.totalChange24h >= 0
                    ? "text-emerald-700 bg-emerald-50"
                    : "text-red-700 bg-red-50"
                }`}
              >
                {portfolio.totalChange24h >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {portfolio.totalChange24h >= 0 ? "+" : ""}
                {formatCurrency(portfolio.totalChange24h)} (
                {portfolio.totalChangePercent24h}%) today
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="px-4">
            <PerformanceChart data={perfData} />
          </div>

          {/* Time Range Buttons */}
          <div className="px-6 pb-6 pt-3 flex gap-2">
            {(["1W", "1M", "3M", "1Y", "ALL"] as TimeRange[]).map(
              (range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    timeRange === range
                      ? "bg-gray-900 text-white shadow-md"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  }`}
                >
                  {range}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Account Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Your Accounts</h2>
            <button
              onClick={() => onNavigate("portfolio")}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5 transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {portfolio.accounts.map((account) => {
              const IconComponent = accountIcons[account.iconType]
              return (
                <button
                  key={account.id}
                  onClick={() => onNavigate("portfolio")}
                  className="bg-white rounded-2xl border border-gray-100 p-5 text-left shadow-sm hover:shadow-lg hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center group-hover:from-emerald-100 group-hover:to-green-200 transition-colors">
                      <IconComponent className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                      {account.institution}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{account.name}</p>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">
                    {formatCurrency(account.balance)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <TrendingUp className="w-3 h-3" />
                      +{account.changePercent24h}%
                    </span>
                    <span className="text-xs text-gray-400">today</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Two-column: Retirement Progress + Sage CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Retirement Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Target className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Retirement Goal
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <ProgressRing percent={goal.progressPercent} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900 tabular-nums">
                    {goal.progressPercent}%
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">funded</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Current</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(goal.currentAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Target</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Projected</span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${goal.onTrack ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {formatCurrency(goal.projectedAmount)}
                  </span>
                </div>
                <div className="pt-1 border-t border-gray-50">
                  <div
                    className={`inline-flex items-center gap-2 text-xs font-medium ${goal.onTrack ? "text-emerald-600" : "text-amber-600"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${goal.onTrack ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
                    />
                    {goal.onTrack
                      ? "On track"
                      : "Needs attention"}{" "}
                    · {goal.yearsRemaining} years remaining
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sage AI CTA */}
          <button
            onClick={() => onNavigate("planning")}
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 text-left text-white hover:from-gray-800 hover:via-gray-700 hover:to-gray-800 transition-all duration-300 shadow-xl shadow-gray-900/30 hover:shadow-2xl hover:shadow-gray-900/40 hover:-translate-y-0.5 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-full blur-2xl" />
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1.5 tracking-tight">Plan with Sage</h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-5">
                Get personalized retirement scenarios, projections, and AI-powered recommendations.
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-medium bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl group-hover:bg-white/20 transition-all duration-200">
                Start Planning
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
            </div>
          </button>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Recent Activity
            </h2>
            <button
              onClick={() => onNavigate("activity")}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5 transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {portfolio.recentActivity.slice(0, 5).map((tx, idx) => {
              const IconComponent = transactionIcons[tx.iconType]
              return (
                <div
                  key={tx.id}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors ${
                    idx < 4 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tx.amount > 0 
                      ? "bg-emerald-50 text-emerald-600" 
                      : tx.amount < 0 
                        ? "bg-red-50 text-red-500"
                        : "bg-gray-50 text-gray-500"
                  }`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tx.account} · {tx.date}
                    </p>
                  </div>
                  {tx.amount !== 0 && (
                    <span
                      className={`text-sm font-semibold tabular-nums ${tx.amount > 0 ? "text-emerald-600" : "text-gray-600"}`}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardView
