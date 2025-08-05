import type { UserProfile, AnalysisData } from "./api"

// ─── Shared display types ───────────────────────────────────────────────────

export interface AnalysisDisplayData {
  title: string
  riskLevel: "Low Risk" | "Medium Risk" | "High Risk"
  successRate: number
  successRateChange?: number
  baselineSuccessRate?: number
  additionalSavings?: {
    currentAmount: number
    additionalAmount: number
    totalAmount: number
    change: string
  }
  retirementIncome?: {
    amount: number
    baselineAmount: number
    targetGoal: number
    change: string
    delta?: number
  }
  extraYears?: {
    years: number
    description: string
    baselineHorizon?: number
    scenarioHorizon?: number
  }
  products: ProductDisplay[]
  cashflows: CashflowDisplay[]
  considerations?: string
  follow_ups?: string[]
  alternatives?: string[]
}

export interface ProductDisplay {
  name: string
  allocation: number
  return: string
  description: string
  icon: string
}

export interface CashflowDisplay {
  year: number
  amount: number
}

export interface ExtendedChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: number
  analysis?: AnalysisDisplayData | null
  showQuickScenarios?: boolean
  isStatus?: boolean
  evaluationContext?: { thread_id: string; run_id: string } | null
}

// ─── Formatters ─────────────────────────────────────────────────────────────

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

export const abbreviateNumber = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

// ─── Product icon mapper ────────────────────────────────────────────────────

export const getProductIcon = (productName: string): string => {
  const lc = productName.toLowerCase()
  if (lc.includes("target")) return "🎯"
  if (lc.includes("international")) return "🌍"
  if (lc.includes("bond")) return "📊"
  if (lc.includes("growth")) return "📈"
  if (lc.includes("healthcare")) return "🏥"
  if (lc.includes("balanced")) return "⚖️"
  return "💼"
}

// ─── Analysis validation (non-blocking console warnings) ────────────────────

export const validateAnalysis = (analysis: AnalysisData) => {
  try {
    const { predictions, scenario } = analysis
    const target = scenario.target_monthly_income
    const metricsIncome = predictions.metrics.monthly_income
    const declaredIncomeDelta = predictions.deltas?.retirement_income_delta
    const computedIncomeDelta = metricsIncome - target
    if (
      declaredIncomeDelta !== undefined &&
      Math.abs(declaredIncomeDelta - computedIncomeDelta) > 1
    ) {
      console.warn("[validate] retirement_income_delta mismatch", {
        declaredIncomeDelta,
        computedIncomeDelta,
      })
    }
    const scenarioSuccess = predictions.metrics.success_rate_pct
    const successDelta = predictions.deltas?.success_rate_delta_pct
    if (successDelta !== undefined) {
      const baselineSuccess = scenarioSuccess - successDelta
      if (baselineSuccess < 0 || baselineSuccess > 100) {
        console.warn("[validate] success_rate_delta_pct implies baseline out of range", {
          scenarioSuccess,
          successDelta,
          baselineSuccess,
        })
      }
    }
    const extraYears = predictions.deltas?.extra_years_income_duration
    const horizon = predictions.metrics.time_horizon_years
    if (extraYears !== undefined && horizon !== undefined) {
      const inferredBaseline = horizon - extraYears
      if (inferredBaseline < 0) {
        console.warn("[validate] extra_years_income_duration implies negative baseline horizon", {
          extraYears,
          horizon,
        })
      }
      if (inferredBaseline > 120) {
        console.warn("[validate] baseline horizon unusually high", { inferredBaseline })
      }
    }
  } catch (e) {
    console.debug("[validate] skipped due to error", e)
  }
}

// ─── Convert raw backend analysis to UI display data ────────────────────────

export const convertAnalysisToDisplayData = (
  analysis: AnalysisData,
  userProfile: UserProfile,
): AnalysisDisplayData => {
  validateAnalysis(analysis)
  const { predictions } = analysis

  const targetGoalIncome = userProfile.target_monthly_income
  const backendBaselineIncome =
    predictions.deltas?.retirement_income_monthly ?? targetGoalIncome

  const currentMonthlySavings = Math.round(
    (userProfile.salary * userProfile.yearly_savings_rate) / 12,
  )

  const rawBackendDelta = predictions.deltas?.retirement_income_delta
  const canonicalDelta = predictions.metrics.monthly_income - targetGoalIncome
  const tol = 0.0001
  let effectiveIncomeDelta: number | undefined
  if (typeof rawBackendDelta === "number") {
    const backendMatchesCanonical = Math.abs(rawBackendDelta - canonicalDelta) < tol
    const backendMatchesInverse = Math.abs(rawBackendDelta + canonicalDelta) < tol
    if (backendMatchesCanonical) {
      effectiveIncomeDelta = rawBackendDelta
    } else if (backendMatchesInverse) {
      console.warn("[retirement_income_delta] Inverted backend delta detected; normalizing.")
      effectiveIncomeDelta = -rawBackendDelta
    } else {
      console.warn(
        "[retirement_income_delta] Backend delta inconsistent with target; using computed canonical delta.",
      )
      effectiveIncomeDelta = canonicalDelta
    }
  } else {
    effectiveIncomeDelta = canonicalDelta
  }
  if (Math.abs(effectiveIncomeDelta) < 0.5) effectiveIncomeDelta = 0

  const scenarioSuccess = predictions.metrics.success_rate_pct
  const successDelta = predictions.deltas?.success_rate_delta_pct
  const baselineSuccess =
    successDelta !== undefined ? scenarioSuccess - successDelta : undefined

  const extraYears = predictions.deltas?.extra_years_income_duration
  const scenarioHorizon = predictions.metrics.time_horizon_years
  const baselineHorizon =
    extraYears !== undefined && scenarioHorizon !== undefined
      ? scenarioHorizon - extraYears
      : undefined

  return {
    title: "Scenario Analysis",
    riskLevel:
      predictions.metrics.risk_level === "low"
        ? "Low Risk"
        : predictions.metrics.risk_level === "high"
          ? "High Risk"
          : "Medium Risk",
    successRate: scenarioSuccess,
    successRateChange: successDelta,
    baselineSuccessRate: baselineSuccess,
    additionalSavings: predictions.deltas?.additional_savings_monthly
      ? {
          currentAmount: currentMonthlySavings,
          additionalAmount: predictions.deltas.additional_savings_monthly,
          totalAmount: currentMonthlySavings + predictions.deltas.additional_savings_monthly,
          change: "monthly increase needed",
        }
      : {
          currentAmount: currentMonthlySavings,
          additionalAmount: 0,
          totalAmount: currentMonthlySavings,
          change: "current savings sufficient",
        },
    retirementIncome: {
      amount: predictions.metrics.monthly_income,
      baselineAmount: backendBaselineIncome,
      targetGoal: targetGoalIncome,
      change:
        effectiveIncomeDelta !== undefined
          ? effectiveIncomeDelta > 0
            ? `+$${Math.abs(effectiveIncomeDelta).toLocaleString(undefined, { maximumFractionDigits: 0 })} vs target`
            : effectiveIncomeDelta < 0
              ? `-$${Math.abs(effectiveIncomeDelta).toLocaleString(undefined, { maximumFractionDigits: 0 })} vs target`
              : "on target"
          : "on target",
      delta: effectiveIncomeDelta,
    },
    extraYears:
      extraYears !== undefined
        ? {
            years: extraYears,
            description:
              extraYears > 0
                ? "extended income duration"
                : extraYears < 0
                  ? "reduced income duration"
                  : "no change",
            baselineHorizon,
            scenarioHorizon,
          }
        : undefined,
    products: predictions.products.map((p) => ({
      name: p.name,
      allocation: Math.round(p.allocation * 100),
      return: p.exp_return ? `${(p.exp_return * 100).toFixed(1)}% return` : "N/A",
      description: p.asset_class?.replace(/_/g, " ") || "Investment product",
      icon: getProductIcon(p.name),
    })),
    cashflows: predictions.cashflows.map((c) => ({
      year: c.year,
      amount: c.end_assets,
    })),
    considerations: analysis.considerations,
    follow_ups: analysis.follow_ups,
    alternatives: analysis.alternatives,
  }
}
