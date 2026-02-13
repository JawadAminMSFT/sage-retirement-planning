﻿"use client"

import React, { useState, useEffect } from "react"
import {
  TrendingUp,
  Users,
  ChevronRight,
  Play,
  Loader2,
  DollarSign,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Sliders,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import type { ClientProfile, AdvisorProfile } from "@/lib/types"
import { Card, StatusIndicator, JurisdictionBadge, Skeleton } from "@/components/frontend/shared/UIComponents"
import { getAdvisorClients, generateScenarioAnalysis, MOCK_CLIENTS, type ScenarioAnalysisResult } from "@/lib/advisorApi"

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AdvisorScenarioViewProps {
  advisor: AdvisorProfile
  onSelectClient?: (client: ClientProfile) => void
  onBack?: () => void
  isMockMode?: boolean
}

interface ScenarioResult {
  client_id: string
  client_name: string
  current_success_rate: number
  scenario_success_rate: number
  current_monthly_income: number
  scenario_monthly_income: number
  current_retire_age: number
  scenario_retire_age: number
  impact: "positive" | "negative" | "neutral"
  recommendation: string
}

interface ScenarioConfig {
  type: string
  label: string
  description: string
  icon: React.ReactNode
  params: Record<string, any>
  category: "market" | "economic" | "sector" | "planning"
}

// â”€â”€â”€ Cross-Client Scenario Presets (Bug 6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SCENARIO_PRESETS: ScenarioConfig[] = [
  {
    type: "market_crash_20",
    label: "Market Correction (-20%)",
    description: "What if equities drop 20%? Stress test all client portfolios.",
    icon: <AlertTriangle className="w-5 h-5" />,
    params: { market_return_delta: -0.20 },
    category: "market",
  },
  {
    type: "market_crash_30",
    label: "Severe Bear Market (-30%)",
    description: "What if we see a 2008-style 30% market decline?",
    icon: <AlertTriangle className="w-5 h-5" />,
    params: { market_return_delta: -0.30 },
    category: "market",
  },
  {
    type: "rising_inflation",
    label: "Rising Inflation (+2%)",
    description: "What if inflation rises 2% above target, eroding purchasing power?",
    icon: <TrendingUp className="w-5 h-5" />,
    params: { inflation_delta: 0.02 },
    category: "economic",
  },
  {
    type: "interest_rate_hike",
    label: "Interest Rate Hike",
    description: "What if rates rise 1.5%, impacting bonds and fixed income?",
    icon: <BarChart3 className="w-5 h-5" />,
    params: { rate_delta: 0.015 },
    category: "economic",
  },
  {
    type: "tech_downturn",
    label: "Tech Sector Downturn",
    description: "What if tech stocks fall 25%? Impact on growth-heavy portfolios.",
    icon: <AlertTriangle className="w-5 h-5" />,
    params: { sector: "technology", sector_delta: -0.25 },
    category: "sector",
  },
  {
    type: "bond_yield_spike",
    label: "Bond Yield Spike",
    description: "What if 10-year yields jump to 6%? Duration risk analysis.",
    icon: <TrendingUp className="w-5 h-5" />,
    params: { bond_yield_target: 0.06 },
    category: "sector",
  },
  {
    type: "early_retirement_wave",
    label: "Early Retirement (-3 yrs)",
    description: "What if clients retire 3 years earlier than planned?",
    icon: <Calendar className="w-5 h-5" />,
    params: { retire_age_delta: -3 },
    category: "planning",
  },
  {
    type: "savings_boost",
    label: "Savings Rate Increase (+5%)",
    description: "What if all clients increase savings rate by 5 percentage points?",
    icon: <DollarSign className="w-5 h-5" />,
    params: { savings_rate_delta: 0.05 },
    category: "planning",
  },
]

// â”€â”€â”€ Helper Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

// â”€â”€â”€ Mock Scenario Generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ScenarioRisk {
  label: string
  severity: "high" | "medium" | "low"
}

interface ScenarioAssumption {
  label: string
  value: string
}

interface ScenarioOpportunity {
  label: string
  description: string
}

interface EnhancedScenarioMeta {
  assumptions: ScenarioAssumption[]
  risks: ScenarioRisk[]
  opportunities: ScenarioOpportunity[]
}

function generateScenarioMeta(scenario: ScenarioConfig): EnhancedScenarioMeta {
  const meta: EnhancedScenarioMeta = { assumptions: [], risks: [], opportunities: [] }

  if (scenario.type.includes("market_crash") || scenario.type.includes("downturn")) {
    const drop = Math.abs(scenario.params.market_return_delta || scenario.params.sector_delta || 0.2) * 100
    meta.assumptions = [
      { label: "Decline Magnitude", value: `${drop}% over 6-12 months` },
      { label: "Recovery Period", value: "12-24 months to baseline" },
      { label: "Dividends", value: "Maintained at current levels" },
    ]
    meta.risks = [
      { label: "Sequence-of-returns risk for near-retirees", severity: "high" },
      { label: "Margin calls for leveraged positions", severity: "high" },
      { label: "Behavioral risk — clients panic-selling", severity: "medium" },
    ]
    meta.opportunities = [
      { label: "Tax-loss harvesting", description: "Offset gains with realized losses" },
      { label: "Roth conversions", description: "Convert at lower market valuations" },
      { label: "Dollar-cost averaging", description: "Increase regular contributions at lower prices" },
    ]
  } else if (scenario.type === "rising_inflation") {
    meta.assumptions = [
      { label: "Inflation Increase", value: "+2% above current CPI" },
      { label: "Duration", value: "Sustained for 2-3 years" },
      { label: "Fed Response", value: "Gradual rate increases" },
    ]
    meta.risks = [
      { label: "Real returns decline across fixed income", severity: "high" },
      { label: "Purchasing power erosion for retirees", severity: "high" },
      { label: "Cost-of-living adjustments lag actual inflation", severity: "medium" },
    ]
    meta.opportunities = [
      { label: "TIPS allocation increase", description: "Inflation-protected securities" },
      { label: "Real asset exposure", description: "REITs, commodities, infrastructure" },
      { label: "Income adjustment planning", description: "Revise retirement income targets upward" },
    ]
  } else if (scenario.type === "interest_rate_hike" || scenario.type === "bond_yield_spike") {
    meta.assumptions = [
      { label: "Rate Change", value: scenario.type === "bond_yield_spike" ? "10Y to 6%" : "+1.5% policy rate" },
      { label: "Timeline", value: "Over 6-9 months" },
      { label: "Credit Spreads", value: "Widen moderately" },
    ]
    meta.risks = [
      { label: "Bond portfolio duration losses", severity: "high" },
      { label: "Growth stock valuation compression", severity: "medium" },
      { label: "Housing market slowdown impacts", severity: "low" },
    ]
    meta.opportunities = [
      { label: "Higher reinvestment rates", description: "New bonds yield more" },
      { label: "CD/GIC ladder", description: "Lock in attractive short-term rates" },
      { label: "Shorten bond duration", description: "Reduce interest rate sensitivity" },
    ]
  } else if (scenario.type === "early_retirement_wave") {
    meta.assumptions = [
      { label: "Retirement Age", value: "3 years earlier than planned" },
      { label: "Healthcare", value: "Private insurance until 65" },
      { label: "Savings", value: "No additional contributions after retirement" },
    ]
    meta.risks = [
      { label: "Healthcare cost gap before Medicare/provincial coverage", severity: "high" },
      { label: "Reduced Social Security/CPP benefits", severity: "medium" },
      { label: "Longer draw-down period", severity: "medium" },
    ]
    meta.opportunities = [
      { label: "Roth conversion window", description: "Low-income years before RMDs" },
      { label: "Part-time income", description: "Bridge income in early retirement" },
      { label: "Lifestyle optimization", description: "Geo-arbitrage or downsizing" },
    ]
  } else {
    meta.assumptions = [
      { label: "Change Applied", value: scenario.description },
      { label: "Timeframe", value: "Starting immediately" },
      { label: "Other Factors", value: "Held constant" },
    ]
    meta.risks = [
      { label: "Implementation feasibility", severity: "medium" },
      { label: "Behavioral adherence over time", severity: "medium" },
    ]
    meta.opportunities = [
      { label: "Improved outcomes", description: "Better alignment with long-term goals" },
      { label: "Tax efficiency", description: "Potential for optimized tax treatment" },
    ]
  }
  return meta
}

function generateMockScenarioResults(
  clients: ClientProfile[],
  scenario: ScenarioConfig
): ScenarioResult[] {
  return clients.map(client => {
    const baseSuccessRate = client.risk_appetite === "high" ? 72 : client.risk_appetite === "medium" ? 78 : 85
    const baseMonthlyIncome = client.target_monthly_income || 4000
    
    let successRateDelta = 0
    let incomeMultiplier = 1
    let retireAgeDelta = 0
    
    if (scenario.type.includes("market_crash") || scenario.type.includes("downturn")) {
      const severity = Math.abs(scenario.params.market_return_delta || scenario.params.sector_delta || 0.2)
      successRateDelta = -(severity * 60) + Math.random() * 5
      incomeMultiplier = 1 - severity * 0.6
      // High risk clients hit harder
      if (client.risk_appetite === "high") successRateDelta *= 1.3
    } else if (scenario.type === "rising_inflation") {
      successRateDelta = -8 + Math.random() * 3
      incomeMultiplier = 0.88
    } else if (scenario.type === "interest_rate_hike" || scenario.type === "bond_yield_spike") {
      successRateDelta = -5 + Math.random() * 4
      incomeMultiplier = 0.93
      // Low risk (bond-heavy) clients hit harder
      if (client.risk_appetite === "low") successRateDelta *= 1.5
    } else if (scenario.type === "early_retirement_wave") {
      successRateDelta = -12 + Math.random() * 5
      incomeMultiplier = 0.85
      retireAgeDelta = -3
    } else if (scenario.type === "savings_boost") {
      successRateDelta = 8 + Math.random() * 4
      incomeMultiplier = 1.15
    } else {
      successRateDelta = -5 + Math.random() * 10
      incomeMultiplier = 0.9 + Math.random() * 0.2
    }
    
    const scenarioSuccessRate = Math.min(99, Math.max(20, baseSuccessRate + successRateDelta))
    const scenarioMonthlyIncome = Math.round(baseMonthlyIncome * incomeMultiplier)
    
    let impact: "positive" | "negative" | "neutral" = "neutral"
    if (scenarioSuccessRate > baseSuccessRate + 3) impact = "positive"
    else if (scenarioSuccessRate < baseSuccessRate - 3) impact = "negative"
    
    let recommendation = ""
    if (impact === "negative" && scenario.category === "market") {
      recommendation = `${client.name}'s ${client.risk_appetite}-risk portfolio would lose ~${Math.abs(Math.round(successRateDelta))}% success probability. Consider reviewing allocation or adding hedging strategies.`
    } else if (impact === "negative" && scenario.category === "economic") {
      recommendation = `${client.name} is exposed to ${scenario.label.toLowerCase()} risk. Consider inflation-protected assets or shorter-duration bonds.`
    } else if (impact === "positive") {
      recommendation = `This scenario improves ${client.name}'s outlook. Consider discussing this strategy in the next review.`
    } else {
      recommendation = `Minimal impact on ${client.name}'s retirement outlook. Continue monitoring.`
    }
    
    return {
      client_id: client.id,
      client_name: client.name,
      current_success_rate: baseSuccessRate,
      scenario_success_rate: Math.round(scenarioSuccessRate),
      current_monthly_income: baseMonthlyIncome,
      scenario_monthly_income: scenarioMonthlyIncome,
      current_retire_age: client.target_retire_age,
      scenario_retire_age: client.target_retire_age + retireAgeDelta,
      impact,
      recommendation,
    }
  })
}

// â”€â”€â”€ Client Selection Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ClientCardProps {
  client: ClientProfile
  isSelected: boolean
  onToggle: () => void
}

const ClientCard: React.FC<ClientCardProps> = ({ client, isSelected, onToggle }) => {
  const totalAssets = client.investment_assets + client.current_cash
  
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
        isSelected 
          ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200" 
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
        isSelected ? "border-emerald-600 bg-emerald-600" : "border-gray-300"
      }`}>
        {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
        <span className="text-sm font-semibold text-emerald-700">
          {client.name.split(" ").map(n => n[0]).join("")}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate">{client.name}</span>
          <StatusIndicator status={client.status} size="sm" />
        </div>
        <div className="text-sm text-gray-500">
          {formatCurrency(totalAssets)} · Age {client.age} · Retire at {client.target_retire_age}
        </div>
      </div>
      <JurisdictionBadge jurisdiction={client.jurisdiction} size="sm" />
    </button>
  )
}

// â”€â”€â”€ Scenario Result Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ResultCardProps {
  result: ScenarioResult
  onViewClient?: () => void
}

const ResultCard: React.FC<ResultCardProps> = ({ result, onViewClient }) => {
  const successDelta = result.scenario_success_rate - result.current_success_rate
  const incomeDelta = result.scenario_monthly_income - result.current_monthly_income
  
  const impactGradient = result.impact === "positive"
    ? "from-emerald-600 to-emerald-700"
    : result.impact === "negative"
    ? "from-gray-700 to-gray-800"
    : "from-gray-500 to-gray-600"
  
  const impactIcon = result.impact === "positive"
    ? <TrendingUp className="w-4 h-4 text-white" />
    : result.impact === "negative"
    ? <AlertTriangle className="w-4 h-4 text-white" />
    : <Target className="w-4 h-4 text-white" />
  
  const impactLabel = result.impact === "positive" ? "Positive Impact" : result.impact === "negative" ? "Negative Impact" : "Minimal Impact"
  
  return (
    <Card className="overflow-hidden">
      {/* Impact Banner */}
      <div className={`bg-gradient-to-r ${impactGradient} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            {impactIcon}
          </div>
          <div>
            <span className="text-sm font-semibold text-white">{result.client_name}</span>
            <span className="text-xs text-white/80 ml-2">{impactLabel}</span>
          </div>
        </div>
        {onViewClient && (
          <button
            onClick={onViewClient}
            className="text-xs text-white/90 hover:text-white font-medium flex items-center gap-1 bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            View Client
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <Target className="w-3 h-3" />
              Success Rate
            </div>
            <div className="text-xl font-bold text-gray-900">{result.scenario_success_rate}%</div>
            <div className={`text-xs font-semibold mt-0.5 ${
              successDelta > 0 ? "text-emerald-600" : successDelta < 0 ? "text-red-600" : "text-gray-400"
            }`}>
              {successDelta > 0 ? "▲" : successDelta < 0 ? "▼" : "—"} {Math.abs(successDelta)}% from {result.current_success_rate}%
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <DollarSign className="w-3 h-3" />
              Monthly Income
            </div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(result.scenario_monthly_income)}</div>
            <div className={`text-xs font-semibold mt-0.5 ${
              incomeDelta > 0 ? "text-emerald-600" : incomeDelta < 0 ? "text-red-600" : "text-gray-400"
            }`}>
              {incomeDelta > 0 ? "▲" : incomeDelta < 0 ? "▼" : "—"} {formatCurrency(Math.abs(incomeDelta))}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
              <Calendar className="w-3 h-3" />
              Retire Age
            </div>
            <div className="text-xl font-bold text-gray-900">{result.scenario_retire_age}</div>
            {result.scenario_retire_age !== result.current_retire_age && (
              <div className={`text-xs font-semibold mt-0.5 ${
                result.scenario_retire_age < result.current_retire_age ? "text-amber-600" : "text-emerald-600"
              }`}>
                {result.scenario_retire_age < result.current_retire_age ? "▲" : "▼"} {Math.abs(result.scenario_retire_age - result.current_retire_age)} yrs from {result.current_retire_age}
              </div>
            )}
            {result.scenario_retire_age === result.current_retire_age && (
              <div className="text-xs text-gray-400 mt-0.5">— No change</div>
            )}
          </div>
        </div>

        {/* Recommendation */}
        <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
          <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-sm text-gray-900 leading-relaxed">
            <span className="font-semibold">Recommendation: </span>
            {result.recommendation}
          </div>
        </div>
      </div>
    </Card>
  )
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const AdvisorScenarioView: React.FC<AdvisorScenarioViewProps> = ({
  advisor,
  onSelectClient,
  onBack,
  isMockMode = true,
}) => {
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [selectedScenario, setSelectedScenario] = useState<ScenarioConfig | null>(null)
  const [results, setResults] = useState<ScenarioResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [step, setStep] = useState<"select" | "results">("select")
  const [aiAnalysis, setAiAnalysis] = useState<ScenarioAnalysisResult | null>(null)
  const [scenarioCategory, setScenarioCategory] = useState<"all" | "market" | "economic" | "sector" | "planning">("all")
  const [scenarioMeta, setScenarioMeta] = useState<EnhancedScenarioMeta | null>(null)
  
  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      setIsLoadingClients(true)
      try {
        if (isMockMode) {
          setClients(MOCK_CLIENTS)
        } else {
          const data = await getAdvisorClients(advisor.id)
          setClients(data)
        }
      } catch (error) {
        console.error("Failed to load clients:", error)
        setClients(MOCK_CLIENTS)
      }
      setIsLoadingClients(false)
    }
    loadClients()
  }, [advisor.id, isMockMode])
  
  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => {
      const next = new Set(prev)
      if (next.has(clientId)) {
        next.delete(clientId)
      } else {
        next.add(clientId)
      }
      return next
    })
  }
  
  const selectAllClients = () => {
    setSelectedClients(new Set(clients.map(c => c.id)))
  }
  
  const deselectAllClients = () => {
    setSelectedClients(new Set())
  }
  
  const runScenario = async () => {
    if (!selectedScenario || selectedClients.size === 0) return
    
    setIsLoading(true)
    setAiAnalysis(null)
    
    const selectedClientsList = clients.filter(c => selectedClients.has(c.id))
    const meta = generateScenarioMeta(selectedScenario)
    setScenarioMeta(meta)
    
    if (isMockMode) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      const scenarioResults = generateMockScenarioResults(selectedClientsList, selectedScenario)
      setResults(scenarioResults)
      // Save to localStorage for Bug 5 — advisor scenarios visible in client view
      saveAdvisorScenarios(scenarioResults, selectedScenario)
    } else {
      try {
        const scenarioResults = generateMockScenarioResults(selectedClientsList, selectedScenario)
        setResults(scenarioResults)
        saveAdvisorScenarios(scenarioResults, selectedScenario)
        
        const analysis = await generateScenarioAnalysis(
          advisor.id,
          selectedClientsList,
          selectedScenario.type,
          selectedScenario.description,
          selectedScenario.params
        )
        setAiAnalysis(analysis)
      } catch (err) {
        console.error("Failed to generate AI scenario analysis:", err)
        const scenarioResults = generateMockScenarioResults(selectedClientsList, selectedScenario)
        setResults(scenarioResults)
        saveAdvisorScenarios(scenarioResults, selectedScenario)
      }
    }
    
    setStep("results")
    setIsLoading(false)
  }

  // Save advisor-run scenarios to localStorage so client view can read them
  const saveAdvisorScenarios = (scenarioResults: ScenarioResult[], scenario: ScenarioConfig) => {
    try {
      const existing = JSON.parse(localStorage.getItem("advisor_scenarios") || "[]")
      const newEntries = scenarioResults.map(r => ({
        id: `advisor-scenario-${Date.now()}-${r.client_id}`,
        client_id: r.client_id,
        name: `${scenario.label} (Advisor)`,
        description: scenario.description,
        created_at: new Date().toISOString(),
        run_by: "advisor",
        scenario_type: scenario.type,
        projection_result: {
          success_probability: r.scenario_success_rate / 100,
          final_balance: Math.round(r.scenario_monthly_income * 12 * 25),
        },
        impact: r.impact,
        recommendation: r.recommendation,
      }))
      localStorage.setItem("advisor_scenarios", JSON.stringify([...newEntries, ...existing]))
    } catch (e) {
      console.error("Failed to save advisor scenarios:", e)
    }
  }
  
  const resetAnalysis = () => {
    setStep("select")
    setResults([])
    setAiAnalysis(null)
    setSelectedScenario(null)
    setScenarioMeta(null)
  }
  
  // Summary stats for results
  const summaryStats = results.length > 0 ? {
    improved: results.filter(r => r.impact === "positive").length,
    worsened: results.filter(r => r.impact === "negative").length,
    neutral: results.filter(r => r.impact === "neutral").length,
    avgSuccessDelta: Math.round(
      results.reduce((sum, r) => sum + (r.scenario_success_rate - r.current_success_rate), 0) / results.length
    ),
  } : null
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Scenario Analysis</h1>
            <p className="text-sm text-gray-500">Run what-if scenarios across your client portfolio</p>
          </div>
          {step === "results" && (
            <button
              onClick={resetAnalysis}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              New Analysis
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {step === "select" ? (
            <div className="space-y-6">
              {/* Scenario Selection */}
              <Card>
                <div className="p-4 border-b">
                  <h2 className="font-medium text-gray-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-600" />
                    1. Select Scenario
                  </h2>
                  <div className="flex gap-2 mt-3">
                    {[
                      { id: "all", label: "All" },
                      { id: "market", label: "Market" },
                      { id: "economic", label: "Economic" },
                      { id: "sector", label: "Sector" },
                      { id: "planning", label: "Planning" },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setScenarioCategory(cat.id as typeof scenarioCategory)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          scenarioCategory === cat.id
                            ? "bg-emerald-100 text-emerald-700 font-medium"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {SCENARIO_PRESETS.filter(s => scenarioCategory === "all" || s.category === scenarioCategory).map(scenario => (
                    <button
                      key={scenario.type}
                      onClick={() => setSelectedScenario(scenario)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        selectedScenario?.type === scenario.type
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg mb-2 flex items-center justify-center ${
                        selectedScenario?.type === scenario.type
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {scenario.icon}
                      </div>
                      <h3 className="font-medium text-gray-900">{scenario.label}</h3>
                      <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
                    </button>
                  ))}
                </div>
              </Card>
              
              {/* Client Selection */}
              <Card>
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-medium text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    2. Select Clients ({selectedClients.size} selected)
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllClients}
                      className="text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAllClients}
                      className="text-sm text-gray-600 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                  {isLoadingClients ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                    </div>
                  ) : (
                    clients.map(client => (
                      <ClientCard
                        key={client.id}
                        client={client}
                        isSelected={selectedClients.has(client.id)}
                        onToggle={() => toggleClient(client.id)}
                      />
                    ))
                  )}
                </div>
              </Card>
              
              {/* Run Button */}
              <div className="flex justify-center">
                <button
                  onClick={runScenario}
                  disabled={!selectedScenario || selectedClients.size === 0 || isLoading}
                  className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Run Scenario Analysis
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              {summaryStats && selectedScenario && (
                <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-6 h-6" />
                      <h2 className="text-lg font-semibold">
                        {selectedScenario.label} Analysis Results
                      </h2>
                    </div>
                    <p className="text-gray-400 mb-4">{selectedScenario.description}</p>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-3 bg-white/10 rounded-lg">
                        <div className="text-2xl font-bold">{results.length}</div>
                        <div className="text-sm text-gray-400">Clients Analyzed</div>
                      </div>
                      <div className="p-3 bg-white/10 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-300">{summaryStats.improved}</div>
                        <div className="text-sm text-gray-400">Improved</div>
                      </div>
                      <div className="p-3 bg-white/10 rounded-lg">
                        <div className="text-2xl font-bold text-red-300">{summaryStats.worsened}</div>
                        <div className="text-sm text-gray-400">Worsened</div>
                      </div>
                      <div className="p-3 bg-white/10 rounded-lg">
                        <div className="text-2xl font-bold">
                          {summaryStats.avgSuccessDelta > 0 ? "+" : ""}{summaryStats.avgSuccessDelta}%
                        </div>
                        <div className="text-sm text-gray-400">Avg. Success Î”</div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Assumptions / Risks / Opportunities Grid */}
              {scenarioMeta && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Assumptions */}
                  <Card className="overflow-hidden">
                    <div className="bg-gray-900 px-4 py-2.5 flex items-center gap-2 rounded-t-xl">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-white">Assumptions</h3>
                    </div>
                    <div className="p-3 space-y-2">
                      {scenarioMeta.assumptions.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 py-1.5 px-3 bg-gray-50 rounded-lg">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">{a.label}: </span>
                            <span className="text-gray-600">{a.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Risks */}
                  <Card className="overflow-hidden">
                    <div className="bg-gray-900 px-4 py-2.5 flex items-center gap-2 rounded-t-xl">
                      <AlertTriangle className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-white">Key Risks</h3>
                    </div>
                    <div className="p-3 space-y-2">
                      {scenarioMeta.risks.map((r, i) => (
                        <div key={i} className="flex items-start gap-3 py-1.5 px-3 bg-gray-50 rounded-lg">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 ${
                            r.severity === "high" ? "bg-red-200 text-red-800" :
                            r.severity === "medium" ? "bg-amber-200 text-amber-800" :
                            "bg-gray-200 text-gray-700"
                          }`}>{r.severity.toUpperCase()}</span>
                          <span className="text-sm text-gray-700">{r.label}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Opportunities */}
                  <Card className="overflow-hidden">
                    <div className="bg-gray-900 px-4 py-2.5 flex items-center gap-2 rounded-t-xl">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-white">Opportunities</h3>
                    </div>
                    <div className="p-3 space-y-2">
                      {scenarioMeta.opportunities.map((o, i) => (
                        <div key={i} className="flex items-start gap-3 py-1.5 px-3 bg-emerald-50 rounded-lg">
                          <span className="w-5 h-5 flex items-center justify-center bg-emerald-200 text-emerald-800 rounded text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">{o.label}: </span>
                            <span className="text-gray-600">{o.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* AI Analysis (live mode only) */}
              {aiAnalysis && (
                <div className="space-y-4">
                  {/* Headline & Summary */}
                  <Card className="overflow-hidden">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 px-4 py-2.5 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-white" />
                      <h3 className="text-sm font-semibold text-white">AI Scenario Analysis</h3>
                      <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded">Live AI</span>
                    </div>
                    <div className="p-4 space-y-3">
                      {aiAnalysis.headline && (
                        <h3 className="text-base font-semibold text-gray-900">{aiAnalysis.headline}</h3>
                      )}
                      <p className="text-sm text-gray-600 leading-relaxed">{aiAnalysis.overall_summary}</p>
                      {aiAnalysis.overall_recommendation && (
                        <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                          <Target className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-emerald-800 font-medium">{aiAnalysis.overall_recommendation}</p>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Per-Client Analysis Cards */}
                  {aiAnalysis.client_analyses && aiAnalysis.client_analyses.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Per-Client Impact Analysis</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {aiAnalysis.client_analyses.map((ca, i) => {
                          const dirColors = {
                            positive: 'border-l-emerald-500',
                            negative: 'border-l-red-500',
                            neutral: 'border-l-gray-400',
                          }
                          const dirBg = {
                            positive: 'bg-emerald-50 text-emerald-700',
                            negative: 'bg-red-50 text-red-700',
                            neutral: 'bg-gray-100 text-gray-600',
                          }
                          const riskColors = {
                            high: 'bg-red-100 text-red-700',
                            medium: 'bg-amber-100 text-amber-700',
                            low: 'bg-emerald-100 text-emerald-700',
                          }
                          return (
                            <Card key={i} className={`overflow-hidden border-l-4 ${dirColors[ca.scenario_impact.direction]}`}>
                              <div className="p-4">
                                {/* Client Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-semibold text-gray-900">{ca.client_name}</h4>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${riskColors[ca.risk_level]}`}>
                                      {ca.risk_level} risk
                                    </span>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${dirBg[ca.scenario_impact.direction]}`}>
                                    {ca.scenario_impact.direction === 'positive' ? 'â†‘' : ca.scenario_impact.direction === 'negative' ? 'â†“' : 'â†’'}{' '}
                                    {ca.scenario_impact.direction}
                                  </span>
                                </div>

                                {/* Metrics Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                  <div className="p-2 bg-gray-50 rounded-lg">
                                    <div className="text-[10px] text-gray-400 font-medium">Success Rate</div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-sm font-semibold text-gray-900">{ca.current_outlook.success_rate}%</span>
                                      <span className={`text-[10px] font-medium ${ca.scenario_impact.success_rate_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        â†’ {ca.scenario_impact.new_success_rate}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-2 bg-gray-50 rounded-lg">
                                    <div className="text-[10px] text-gray-400 font-medium">Rate Change</div>
                                    <div className={`text-sm font-semibold ${ca.scenario_impact.success_rate_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                      {ca.scenario_impact.success_rate_change >= 0 ? '+' : ''}{ca.scenario_impact.success_rate_change}pp
                                    </div>
                                  </div>
                                  <div className="p-2 bg-gray-50 rounded-lg">
                                    <div className="text-[10px] text-gray-400 font-medium">Monthly Income</div>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-sm font-semibold text-gray-900">${ca.current_outlook.monthly_income.toLocaleString()}</span>
                                      <span className={`text-[10px] font-medium ${ca.scenario_impact.income_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        â†’ ${ca.scenario_impact.new_monthly_income.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-2 bg-gray-50 rounded-lg">
                                    <div className="text-[10px] text-gray-400 font-medium">Income Change</div>
                                    <div className={`text-sm font-semibold ${ca.scenario_impact.income_change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                      {ca.scenario_impact.income_change >= 0 ? '+' : ''}${ca.scenario_impact.income_change.toLocaleString()}/mo
                                    </div>
                                  </div>
                                </div>

                                {/* Impact Summary & Recommendation */}
                                <p className="text-xs text-gray-500 mb-2">{ca.scenario_impact.summary}</p>
                                <div className="flex items-start gap-2 p-2 bg-emerald-50 rounded-lg">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-emerald-800">{ca.recommendation}</p>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Key Insights + Suggested Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Key Insights */}
                    {aiAnalysis.key_insights && aiAnalysis.key_insights.length > 0 && (
                      <Card className="overflow-hidden">
                        <div className="px-4 py-2.5 border-b bg-gray-50">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Key Insights</h3>
                        </div>
                        <div className="p-3 space-y-2">
                          {aiAnalysis.key_insights.map((insight, i) => {
                            const typeStyles = {
                              warning: 'border-l-amber-500 bg-amber-50',
                              info: 'border-l-emerald-500 bg-emerald-50',
                              success: 'border-l-emerald-500 bg-emerald-50',
                            }
                            const typeIcons = {
                              warning: 'âš ï¸',
                              info: 'ðŸ’¡',
                              success: 'âœ…',
                            }
                            return (
                              <div key={i} className={`p-2.5 rounded-lg border-l-4 ${typeStyles[insight.type]}`}>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm">{typeIcons[insight.type]}</span>
                                  <span className="text-sm font-medium text-gray-900">{insight.title}</span>
                                </div>
                                <p className="text-xs text-gray-600 ml-7">{insight.detail}</p>
                              </div>
                            )
                          })}
                        </div>
                      </Card>
                    )}

                    {/* Suggested Actions */}
                    {aiAnalysis.suggested_actions && aiAnalysis.suggested_actions.length > 0 && (
                      <Card className="overflow-hidden">
                        <div className="px-4 py-2.5 border-b bg-gray-50">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suggested Actions</h3>
                        </div>
                        <div className="p-3 space-y-2">
                          {aiAnalysis.suggested_actions.map((sa, i) => {
                            const prioColors = {
                              high: 'bg-red-100 text-red-700 border-red-200',
                              medium: 'bg-amber-100 text-amber-700 border-amber-200',
                              low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                            }
                            return (
                              <div key={i} className="p-2.5 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-start gap-2">
                                  <span className="w-5 h-5 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800">{sa.action}</p>
                                    {sa.affected_clients && sa.affected_clients.length > 0 && (
                                      <p className="text-[10px] text-gray-400 mt-1">Affects: {sa.affected_clients.join(', ')}</p>
                                    )}
                                  </div>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${prioColors[sa.priority]}`}>
                                    {sa.priority}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              )}
              
              {/* Individual Results */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Client-by-Client Impact</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{results.length} clients</span>
                </div>
                <div className="space-y-4">
                  {results.map(result => (
                    <ResultCard
                      key={result.client_id}
                      result={result}
                      onViewClient={onSelectClient ? () => {
                        const client = clients.find(c => c.id === result.client_id)
                        if (client) onSelectClient(client)
                      } : undefined}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdvisorScenarioView
