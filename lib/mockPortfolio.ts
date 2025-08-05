// Mock financial portfolio data for the dashboard experience

// ─── Types ──────────────────────────────────────────────────────────────────

export type AccountIconType = "building" | "shield" | "trending-up" | "wallet" | "heart"

export interface Account {
  id: string
  name: string
  type: "401k" | "roth_ira" | "ira" | "brokerage" | "hsa"
  balance: number
  change24h: number
  changePercent24h: number
  institution: string
  iconType: AccountIconType
}

export interface Holding {
  symbol: string
  name: string
  shares: number
  price: number
  value: number
  costBasis: number
  gainLoss: number
  gainLossPercent: number
  allocation: number
  sector: string
  color: string
}

export type TransactionIconType = "dollar-sign" | "trending-up" | "refresh-cw" | "shield" | "shuffle" | "file-text" | "arrow-down-circle"

export interface Transaction {
  id: string
  date: string
  type: "contribution" | "dividend" | "trade" | "rebalance" | "withdrawal" | "fee"
  description: string
  amount: number
  account: string
  symbol?: string
  iconType: TransactionIconType
}

export interface PerformancePoint {
  date: string
  value: number
}

export interface RetirementGoal {
  targetAge: number
  targetAmount: number
  currentAmount: number
  projectedAmount: number
  yearsRemaining: number
  monthlyContribution: number
  onTrack: boolean
  progressPercent: number
}

export interface Notification {
  id: string
  title: string
  description: string
  type: "info" | "action" | "alert"
  time: string
  read: boolean
}

export interface PortfolioData {
  totalValue: number
  totalChange24h: number
  totalChangePercent24h: number
  ytdReturn: number
  ytdReturnPercent: number
  accounts: Account[]
  holdings: Holding[]
  recentActivity: Transaction[]
  retirementGoal: RetirementGoal
  notifications: Notification[]
}

// ─── Performance chart data ─────────────────────────────────────────────────

export type TimeRange = "1W" | "1M" | "3M" | "1Y" | "ALL"

function generatePerformance(
  days: number,
  endValue: number,
  annualReturn: number,
  step: number = 1,
): PerformancePoint[] {
  const points: PerformancePoint[] = []
  const now = new Date()
  const startValue = endValue / Math.pow(1 + annualReturn, days / 365)

  for (let i = 0; i <= days; i += step) {
    const date = new Date(now)
    date.setDate(date.getDate() - (days - i))
    const t = i / 365
    const base = startValue * Math.pow(1 + annualReturn, t)
    const noise =
      Math.sin(i * 0.15) * endValue * 0.006 +
      Math.sin(i * 0.4) * endValue * 0.004 +
      Math.sin(i * 0.02) * endValue * 0.01
    points.push({
      date: date.toISOString().split("T")[0],
      value: Math.round(base + noise),
    })
  }
  return points
}

export function getPerformanceForRange(
  totalValue: number,
  range: TimeRange,
  annualReturn: number = 0.089,
): PerformancePoint[] {
  switch (range) {
    case "1W":
      return generatePerformance(7, totalValue, annualReturn)
    case "1M":
      return generatePerformance(30, totalValue, annualReturn)
    case "3M":
      return generatePerformance(90, totalValue, annualReturn)
    case "1Y":
      return generatePerformance(365, totalValue, annualReturn, 2)
    case "ALL":
      return generatePerformance(1095, totalValue, annualReturn, 7)
  }
}

// ─── Main portfolio data generator ──────────────────────────────────────────

export function getPortfolioData(profile?: {
  age: number
  salary: number
  risk_appetite: string
  target_retire_age: number
  yearly_savings_rate: number
  name: string
  target_monthly_income: number
  investment_assets?: number
}): PortfolioData {
  // Scale based on profile
  const baseTotal = 733370
  const yearsWorking = profile ? Math.max(profile.age - 22, 1) : 20
  const salaryRatio = profile ? profile.salary / 125000 : 1
  const multiplier = Math.sqrt(yearsWorking / 20) * salaryRatio
  const totalValue = profile?.investment_assets
    ? Math.round(profile.investment_assets * 1.15)
    : Math.round(baseTotal * multiplier)

  const isConservative = profile?.risk_appetite === "low"
  const isAggressive = profile?.risk_appetite === "high"

  // Accounts (proportional split)
  const accounts: Account[] = [
    {
      id: "acc_401k",
      name: "401(k)",
      type: "401k",
      balance: Math.round(totalValue * 0.58),
      change24h: Math.round(totalValue * 0.58 * 0.0021),
      changePercent24h: 0.21,
      institution: "Fidelity",
      iconType: "building",
    },
    {
      id: "acc_roth",
      name: "Roth IRA",
      type: "roth_ira",
      balance: Math.round(totalValue * 0.18),
      change24h: Math.round(totalValue * 0.18 * 0.0014),
      changePercent24h: 0.14,
      institution: "Vanguard",
      iconType: "shield",
    },
    {
      id: "acc_brokerage",
      name: "Brokerage",
      type: "brokerage",
      balance: Math.round(totalValue * 0.24),
      change24h: Math.round(totalValue * 0.24 * 0.0009),
      changePercent24h: 0.09,
      institution: "Schwab",
      iconType: "trending-up",
    },
  ]

  // Holdings vary by risk profile
  const holdingsDef = isConservative
    ? [
        { symbol: "BND", name: "Vanguard Total Bond Market", allocation: 35, price: 72.45, sector: "Fixed Income", color: "#059669" },
        { symbol: "VTI", name: "Vanguard Total Stock Market", allocation: 25, price: 264.3, sector: "US Equity", color: "#10b981" },
        { symbol: "VTIP", name: "Vanguard Short-Term TIPS", allocation: 20, price: 48.92, sector: "Inflation Protected", color: "#047857" },
        { symbol: "VXUS", name: "Vanguard Intl Stock", allocation: 12, price: 57.8, sector: "International", color: "#16a34a" },
        { symbol: "VMFXX", name: "Vanguard Money Market", allocation: 8, price: 1.0, sector: "Cash", color: "#065f46" },
      ]
    : isAggressive
      ? [
          { symbol: "VTI", name: "Vanguard Total Stock Market", allocation: 45, price: 264.3, sector: "US Equity", color: "#059669" },
          { symbol: "VXUS", name: "Vanguard Intl Stock", allocation: 22, price: 57.8, sector: "International", color: "#10b981" },
          { symbol: "VGT", name: "Vanguard Info Tech ETF", allocation: 18, price: 518.4, sector: "Technology", color: "#047857" },
          { symbol: "VWO", name: "Vanguard Emerging Markets", allocation: 10, price: 43.2, sector: "Emerging Markets", color: "#16a34a" },
          { symbol: "BND", name: "Vanguard Total Bond Market", allocation: 5, price: 72.45, sector: "Fixed Income", color: "#065f46" },
        ]
      : [
          { symbol: "VTI", name: "Vanguard Total Stock Market", allocation: 40, price: 264.3, sector: "US Equity", color: "#059669" },
          { symbol: "VXUS", name: "Vanguard Intl Stock", allocation: 20, price: 57.8, sector: "International", color: "#10b981" },
          { symbol: "BND", name: "Vanguard Total Bond Market", allocation: 18, price: 72.45, sector: "Fixed Income", color: "#047857" },
          { symbol: "VGSLX", name: "Vanguard Real Estate Index", allocation: 12, price: 128.9, sector: "Real Estate", color: "#16a34a" },
          { symbol: "VMFXX", name: "Vanguard Money Market", allocation: 10, price: 1.0, sector: "Cash", color: "#065f46" },
        ]

  const gains = [0.087, 0.114, 0.062, 0.041, 0.003]
  const holdings: Holding[] = holdingsDef.map((h, i) => {
    const value = Math.round((totalValue * h.allocation) / 100)
    const costBasis = Math.round(value / (1 + gains[i % gains.length]))
    return {
      ...h,
      shares: Math.round(value / h.price),
      value,
      costBasis,
      gainLoss: value - costBasis,
      gainLossPercent: +((gains[i % gains.length]) * 100).toFixed(1),
    }
  })

  // Transactions
  const recentActivity: Transaction[] = [
    { id: "tx1", date: "2026-02-05", type: "contribution", description: "401(k) Payroll Contribution", amount: 2500, account: "401(k)", iconType: "dollar-sign" },
    { id: "tx2", date: "2026-02-01", type: "dividend", description: "Dividend Reinvested — VTI", amount: 127.43, account: "Brokerage", symbol: "VTI", iconType: "trending-up" },
    { id: "tx3", date: "2026-01-28", type: "rebalance", description: "Automatic Rebalance Executed", amount: 0, account: "401(k)", iconType: "refresh-cw" },
    { id: "tx4", date: "2026-01-22", type: "contribution", description: "Roth IRA Monthly Contribution", amount: 500, account: "Roth IRA", iconType: "shield" },
    { id: "tx5", date: "2026-01-15", type: "dividend", description: "Quarterly Dividend — VXUS", amount: 312.87, account: "Brokerage", symbol: "VXUS", iconType: "trending-up" },
    { id: "tx6", date: "2026-01-10", type: "contribution", description: "401(k) Payroll Contribution", amount: 2500, account: "401(k)", iconType: "dollar-sign" },
    { id: "tx7", date: "2025-12-31", type: "trade", description: "Tax Loss Harvest — Sold VLCAX", amount: -4250, account: "Brokerage", symbol: "VLCAX", iconType: "shuffle" },
    { id: "tx8", date: "2025-12-28", type: "dividend", description: "Year-End Distribution — BND", amount: 89.21, account: "Roth IRA", symbol: "BND", iconType: "trending-up" },
    { id: "tx9", date: "2025-12-15", type: "contribution", description: "401(k) Payroll Contribution", amount: 2500, account: "401(k)", iconType: "dollar-sign" },
    { id: "tx10", date: "2025-12-01", type: "fee", description: "Advisory Fee — Q4 2025", amount: -187.5, account: "Brokerage", iconType: "file-text" },
  ]

  // Retirement goal
  const targetAge = profile?.target_retire_age || 65
  const currentAge = profile?.age || 42
  const yearsRemaining = Math.max(targetAge - currentAge, 0)
  const targetAmount = (profile?.target_monthly_income || 5000) * 12 * 25
  const monthlyContribution = profile
    ? Math.round((profile.salary * profile.yearly_savings_rate) / 12)
    : 1563
  const projectedAmount = Math.round(
    totalValue * Math.pow(1.07, yearsRemaining) +
      monthlyContribution *
        12 *
        ((Math.pow(1.07, yearsRemaining) - 1) / 0.07),
  )

  const retirementGoal: RetirementGoal = {
    targetAge,
    targetAmount,
    currentAmount: totalValue,
    projectedAmount,
    yearsRemaining,
    monthlyContribution,
    onTrack: projectedAmount >= targetAmount,
    progressPercent: Math.min(
      Math.round((totalValue / targetAmount) * 100),
      100,
    ),
  }

  // Notifications
  const notifications: Notification[] = [
    {
      id: "n1",
      title: "Rebalance Recommended",
      description:
        "Your portfolio has drifted 3.2% from target allocation.",
      type: "action",
      time: "2 hours ago",
      read: false,
    },
    {
      id: "n2",
      title: "2026 IRA Contribution",
      description:
        "You've contributed $500 of $7,000 max for 2026.",
      type: "info",
      time: "1 day ago",
      read: false,
    },
    {
      id: "n3",
      title: "Market Update",
      description: "S&P 500 reached a new all-time high yesterday.",
      type: "info",
      time: "2 days ago",
      read: true,
    },
  ]

  const totalChange24h = accounts.reduce((s, a) => s + a.change24h, 0)
  const totalChangePercent24h = +((totalChange24h / totalValue) * 100).toFixed(2)

  return {
    totalValue,
    totalChange24h,
    totalChangePercent24h,
    ytdReturn: Math.round(totalValue * 0.062),
    ytdReturnPercent: 6.2,
    accounts,
    holdings,
    recentActivity,
    retirementGoal,
    notifications,
  }
}
