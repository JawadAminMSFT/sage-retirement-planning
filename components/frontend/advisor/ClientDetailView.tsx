"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  ArrowLeft,
  User,
  TrendingUp,
  MessageSquare,
  FileText,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Loader2,
  Flag,
  Sparkles,
  Pin,
  Plus,
  Edit2,
  Trash2,
  Clock,
  DollarSign,
  Target,
  PieChart,
} from "lucide-react"
import type { 
  ClientProfile, 
  AdvisorNote, 
  NoteCategory, 
  EscalationTicket,
  Appointment 
} from "@/lib/types"
import { 
  Card, 
  StatusIndicator, 
  RiskBadge, 
  JurisdictionBadge,
  EmptyState,
  Skeleton
} from "@/components/frontend/shared/UIComponents"
import { generateClientSummary } from "@/lib/advisorApi"

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ClientDetailViewProps {
  client: ClientProfile
  advisorId: string
  onBack: () => void
  isMockMode?: boolean
}

type TabType = "overview" | "conversations" | "scenarios" | "notes" | "escalations"

interface ClientScenario {
  id: string
  name: string
  description: string
  created_at: string
  run_by?: "client" | "advisor"
  scenario_type?: string
  impact?: "positive" | "negative" | "neutral"
  recommendation?: string
  projection_result?: {
    success_probability: number
    final_balance: number
    monthly_income?: number
    retire_age?: number
    current_success_probability?: number
    current_final_balance?: number
  }
}

interface ConversationSummary {
  id: string
  title: string
  message_count: number
  last_message_at: string
  summary?: string
}

// â”€â”€â”€ Mock Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MOCK_CONVERSATIONS: ConversationSummary[] = [
  {
    id: "conv-1",
    title: "Retirement Planning Questions",
    message_count: 12,
    last_message_at: "2026-02-10T14:30:00Z",
    summary: "Client asked about optimal retirement age and Social Security timing. Explored delaying to 67 vs. 65."
  },
  {
    id: "conv-2",
    title: "Tax Optimization Discussion",
    message_count: 8,
    last_message_at: "2026-02-05T10:15:00Z",
    summary: "Discussed Roth conversion strategy. Client interested in converting portion of traditional IRA."
  },
  {
    id: "conv-3",
    title: "Portfolio Rebalancing",
    message_count: 5,
    last_message_at: "2026-01-28T16:45:00Z",
    summary: "Reviewed current allocation. Client concerned about bond yields."
  },
]

const MOCK_SCENARIOS: ClientScenario[] = [
  {
    id: "scenario-1",
    name: "Early Retirement at 60",
    description: "What if I retire 5 years early?",
    created_at: "2026-02-08T09:00:00Z",
    impact: "negative",
    recommendation: "Early retirement reduces the accumulation phase by 5 years and extends drawdown. Consider increasing savings rate by 3-5% to compensate, or explore part-time bridge income.",
    projection_result: {
      success_probability: 0.72,
      final_balance: 1250000,
      monthly_income: 3400,
      retire_age: 60,
      current_success_probability: 0.85,
      current_final_balance: 1650000,
    },
  },
  {
    id: "scenario-2",
    name: "Increased Savings Rate",
    description: "Bump savings from 15% to 20%",
    created_at: "2026-02-01T11:30:00Z",
    impact: "positive",
    recommendation: "Increasing the savings rate by 5% significantly improves retirement outcomes. The additional $5,000/year compounds to over $400K by retirement age.",
    projection_result: {
      success_probability: 0.91,
      final_balance: 1850000,
      monthly_income: 5200,
      retire_age: 65,
      current_success_probability: 0.85,
      current_final_balance: 1650000,
    },
  },
  {
    id: "scenario-3",
    name: "Conservative Portfolio",
    description: "Switch to 40/60 stocks/bonds",
    created_at: "2026-01-20T14:00:00Z",
    impact: "neutral",
    recommendation: "A conservative allocation reduces volatility but may limit growth potential. Consider a glide path approach that gradually shifts allocation as retirement approaches.",
    projection_result: {
      success_probability: 0.85,
      final_balance: 1450000,
      monthly_income: 4100,
      retire_age: 65,
      current_success_probability: 0.85,
      current_final_balance: 1650000,
    },
  },
]

const MOCK_NOTES: AdvisorNote[] = [
  {
    id: "note-1",
    advisor_id: "advisor-jane",
    client_id: "demo-user",
    content: "Client mentioned interest in estate planning. Follow up with estate attorney referral.",
    category: "followup",
    is_pinned: true,
    created_at: "2026-02-09T10:00:00Z",
    updated_at: "2026-02-09T10:00:00Z"
  },
  {
    id: "note-2",
    advisor_id: "advisor-jane",
    client_id: "demo-user",
    content: "Risk tolerance assessment indicates moderate-conservative profile. Review allocation.",
    category: "risk_observation",
    is_pinned: false,
    created_at: "2026-02-05T15:30:00Z",
    updated_at: "2026-02-05T15:30:00Z"
  },
  {
    id: "note-3",
    advisor_id: "advisor-jane",
    client_id: "demo-user",
    content: "Client has new grandchild - discussed 529 plan options.",
    category: "opportunity",
    is_pinned: false,
    created_at: "2026-01-28T09:15:00Z",
    updated_at: "2026-01-28T09:15:00Z"
  },
]

const MOCK_ESCALATIONS: EscalationTicket[] = [
  {
    id: "esc-1",
    client_id: "demo-user",
    advisor_id: "advisor-jane",
    reason: "regulatory_question",
    client_question: "Can I contribute to both Roth IRA and 401k if I exceed income limits?",
    context_summary: "Client has income near Roth IRA phase-out threshold. Needs guidance on backdoor Roth strategy.",
    status: "pending",
    priority: "medium",
    created_at: "2026-02-10T11:00:00Z"
  },
]

// â”€â”€â”€ Format Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return formatDate(dateStr)
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    general: "bg-gray-100 text-gray-700",
    risk_observation: "bg-amber-100 text-amber-700",
    opportunity: "bg-emerald-100 text-emerald-700",
    compliance: "bg-red-100 text-red-700",
    followup: "bg-emerald-100 text-emerald-700",
  }
  return colors[category] || colors.general
}

// â”€â”€â”€ AI Summary Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AISummaryCardProps {
  client: ClientProfile
  isLoading: boolean
  advisorId: string
  isMockMode?: boolean
}

const AISummaryCard: React.FC<AISummaryCardProps> = ({ client, isLoading, advisorId, isMockMode = true }) => {
  const [summary, setSummary] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  useEffect(() => {
    if (isMockMode) {
      // Template-based summary for demo mode
      const timer = setTimeout(() => {
        setSummary(
          `${client.name} is a ${client.age}-year-old client with a ${client.risk_appetite} risk profile, ` +
          `targeting retirement at age ${client.target_retire_age}. Current portfolio value is ${formatCurrency(client.investment_assets + client.current_cash)} ` +
          `with a ${(client.yearly_savings_rate * 100).toFixed(0)}% savings rate. ` +
          `Based on recent activity, the client has been exploring early retirement scenarios and ` +
          `shows interest in tax optimization strategies. Key concern: ensuring sufficient income ` +
          `of ${formatCurrency(client.target_monthly_income)}/month in retirement.`
        )
      }, 1500)
      return () => clearTimeout(timer)
    } else {
      // Real LLM-powered summary
      setIsGenerating(true)
      generateClientSummary(advisorId, client.id, client)
        .then((response) => {
          setSummary(response)
          setIsGenerating(false)
        })
        .catch((err) => {
          console.error("Failed to generate AI summary:", err)
          // Fallback to template
          setSummary(
            `${client.name} is a ${client.age}-year-old client with a ${client.risk_appetite} risk profile, ` +
            `targeting retirement at age ${client.target_retire_age}. Total assets: ${formatCurrency(client.investment_assets + client.current_cash)}.`
          )
          setIsGenerating(false)
        })
    }
  }, [client, isMockMode, advisorId])
  
  if (isLoading || isGenerating || !summary) {
    return (
      <Card className="p-4 bg-gradient-to-br from-gray-50 to-emerald-50 border-emerald-200">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-900">AI Summary</span>
          {!isMockMode && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded">Live AI</span>}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </Card>
    )
  }
  
  return (
    <Card className="p-4 bg-gradient-to-br from-gray-50 to-emerald-50 border-emerald-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-900">AI Summary</span>
        {!isMockMode && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded">Live AI</span>}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{summary}</p>
    </Card>
  )
}

// â”€â”€â”€ Financial Snapshot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FinancialSnapshotProps {
  client: ClientProfile
}

const FinancialSnapshot: React.FC<FinancialSnapshotProps> = ({ client }) => {
  const totalAssets = client.investment_assets + client.current_cash
  const yearsToRetire = Math.max(0, client.target_retire_age - client.age)
  const annualSavings = client.salary * client.yearly_savings_rate
  
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Financial Snapshot</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <DollarSign className="w-3 h-3" />
            Total Assets
          </div>
          <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalAssets)}</div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            Annual Savings
          </div>
          <div className="text-lg font-semibold text-gray-900">{formatCurrency(annualSavings)}</div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Target className="w-3 h-3" />
            Target Income
          </div>
          <div className="text-lg font-semibold text-gray-900">{formatCurrency(client.target_monthly_income)}/mo</div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Clock className="w-3 h-3" />
            Years to Retire
          </div>
          <div className="text-lg font-semibold text-gray-900">{yearsToRetire}</div>
        </div>
      </div>
      
      {/* Portfolio Allocation */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
          <PieChart className="w-3 h-3" />
          Portfolio Allocation
        </div>
        <div className="flex gap-2">
          {Object.entries(client.portfolio).map(([asset, pct]) => (
            <div key={asset} className="flex-1 text-center">
              <div className="text-xs text-gray-500 capitalize">{asset.replace("_", " ")}</div>
              <div className="text-sm font-medium text-gray-900">{(pct * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// â”€â”€â”€ Conversations Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ConversationsTabProps {
  clientId: string
  isMockMode?: boolean
}

const ConversationsTab: React.FC<ConversationsTabProps> = ({ clientId, isMockMode }) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setConversations(MOCK_CONVERSATIONS)
      setIsLoading(false)
    }, 500)
  }, [clientId, isMockMode])
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
    )
  }
  
  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="w-8 h-8" />}
        title="No conversations yet"
        description="This client hasn't chatted with Sage AI yet."
      />
    )
  }
  
  return (
    <div className="space-y-3">
      {conversations.map(conv => (
        <Card key={conv.id} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{conv.title}</h4>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{conv.summary}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{conv.message_count} messages</span>
                <span>{formatRelativeTime(conv.last_message_at)}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// â”€â”€â”€ Scenarios Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ScenariosTabProps {
  clientId: string
  isMockMode?: boolean
}

const ScenariosTab: React.FC<ScenariosTabProps> = ({ clientId, isMockMode }) => {
  const [scenarios, setScenarios] = useState<ClientScenario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      // Load advisor-run scenarios from localStorage
      let advisorScenarios: ClientScenario[] = []
      try {
        const stored = JSON.parse(localStorage.getItem("advisor_scenarios") || "[]")
        advisorScenarios = stored
          .filter((s: any) => s.client_id === clientId)
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            created_at: s.created_at,
            run_by: s.run_by || "advisor",
            scenario_type: s.scenario_type,
            impact: s.impact,
            recommendation: s.recommendation,
            projection_result: s.projection_result,
          }))
      } catch (e) {
        console.error("Failed to load advisor scenarios:", e)
      }
      
      // Combine with mock/existing client scenarios
      const combined = [...advisorScenarios, ...MOCK_SCENARIOS]
      // Deduplicate by id
      const seen = new Set<string>()
      const unique = combined.filter(s => {
        if (seen.has(s.id)) return false
        seen.add(s.id)
        return true
      })
      setScenarios(unique)
      setIsLoading(false)
    }, 500)
  }, [clientId, isMockMode])
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>
    )
  }
  
  if (scenarios.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="w-8 h-8" />}
        title="No scenarios yet"
        description="This client hasn't saved any what-if scenarios."
      />
    )
  }
  
  return (
    <div className="space-y-3">
      {scenarios.map(scenario => {
        const isExpanded = expandedId === scenario.id
        const pr = scenario.projection_result
        const successPct = pr ? (pr.success_probability * 100).toFixed(0) : null
        const currentPct = pr?.current_success_probability ? (pr.current_success_probability * 100).toFixed(0) : null
        const successDelta = pr && pr.current_success_probability
          ? Math.round((pr.success_probability - pr.current_success_probability) * 100)
          : null

        const impactGradient = scenario.impact === "positive"
          ? "from-emerald-600 to-emerald-700"
          : scenario.impact === "negative"
          ? "from-gray-700 to-gray-800"
          : "from-gray-500 to-gray-600"

        return (
          <Card key={scenario.id} className="overflow-hidden">
            {/* Clickable header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : scenario.id)}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                    {scenario.run_by === "advisor" && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Advisor</span>
                    )}
                    {scenario.impact && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        scenario.impact === "positive" ? "bg-emerald-100 text-emerald-700"
                        : scenario.impact === "negative" ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                      }`}>
                        {scenario.impact === "positive" ? "Improves" : scenario.impact === "negative" ? "Worsens" : "Neutral"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                  {pr && (
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`text-sm font-medium ${
                        pr.success_probability >= 0.8 ? "text-emerald-600" :
                        pr.success_probability >= 0.6 ? "text-amber-600" :
                        "text-red-600"
                      }`}>
                        {successPct}% success
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatCurrency(pr.final_balance)} projected
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">{formatRelativeTime(scenario.created_at)}</div>
                </div>
                <ChevronRight className={`w-5 h-5 text-gray-400 mt-1 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`} />
              </div>
            </button>

            {/* Expanded detail panel */}
            {isExpanded && (
              <div className="border-t border-gray-100">
                {/* Impact banner */}
                {scenario.impact && (
                  <div className={`bg-gradient-to-r ${impactGradient} px-4 py-2 flex items-center gap-2`}>
                    {scenario.impact === "positive"
                      ? <TrendingUp className="w-4 h-4 text-white" />
                      : scenario.impact === "negative"
                      ? <AlertTriangle className="w-4 h-4 text-white" />
                      : <Target className="w-4 h-4 text-white" />
                    }
                    <span className="text-sm font-medium text-white">
                      {scenario.impact === "positive" ? "Positive Impact on Retirement Plan"
                        : scenario.impact === "negative" ? "Negative Impact on Retirement Plan"
                        : "Minimal Impact on Retirement Plan"
                      }
                    </span>
                  </div>
                )}

                <div className="p-4 space-y-4">
                  {/* Metrics grid */}
                  {pr && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Success Rate</div>
                        <div className="text-lg font-bold text-gray-900">{successPct}%</div>
                        {successDelta !== null && (
                          <div className={`text-xs font-semibold mt-0.5 ${
                            successDelta > 0 ? "text-emerald-600" : successDelta < 0 ? "text-red-600" : "text-gray-400"
                          }`}>
                            {successDelta > 0 ? "\u25b2" : successDelta < 0 ? "\u25bc" : "\u2014"} {Math.abs(successDelta)}% from {currentPct}%
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">Final Balance</div>
                        <div className="text-lg font-bold text-gray-900">{formatCurrency(pr.final_balance)}</div>
                        {pr.current_final_balance && (
                          <div className={`text-xs font-semibold mt-0.5 ${
                            pr.final_balance > pr.current_final_balance ? "text-emerald-600"
                              : pr.final_balance < pr.current_final_balance ? "text-red-600" : "text-gray-400"
                          }`}>
                            {pr.final_balance > pr.current_final_balance ? "\u25b2" : "\u25bc"} {formatCurrency(Math.abs(pr.final_balance - pr.current_final_balance))}
                          </div>
                        )}
                      </div>
                      {pr.monthly_income && (
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="text-xs text-gray-500 mb-1">Monthly Income</div>
                          <div className="text-lg font-bold text-gray-900">{formatCurrency(pr.monthly_income)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">Projected in retirement</div>
                        </div>
                      )}
                      {pr.retire_age && (
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="text-xs text-gray-500 mb-1">Retire Age</div>
                          <div className="text-lg font-bold text-gray-900">{pr.retire_age}</div>
                          <div className="text-xs text-gray-400 mt-0.5">Target age</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recommendation */}
                  {scenario.recommendation && (
                    <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="text-sm text-emerald-900 leading-relaxed">
                        <span className="font-semibold">Recommendation: </span>
                        {scenario.recommendation}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// â”€â”€â”€ Notes Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface NotesTabProps {
  clientId: string
  advisorId: string
  isMockMode?: boolean
}

const NotesTab: React.FC<NotesTabProps> = ({ clientId, advisorId, isMockMode }) => {
  const [notes, setNotes] = useState<AdvisorNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingNote, setEditingNote] = useState<AdvisorNote | null>(null)
  const [newNoteContent, setNewNoteContent] = useState("")
  const [newNoteCategory, setNewNoteCategory] = useState<NoteCategory>("general")
  
  useEffect(() => {
    loadNotes()
  }, [clientId, advisorId, isMockMode])
  
  const loadNotes = () => {
    setIsLoading(true)
    setTimeout(() => {
      setNotes(MOCK_NOTES.filter(n => n.client_id === clientId))
      setIsLoading(false)
    }, 500)
  }
  
  const handleSaveNote = () => {
    if (!newNoteContent.trim()) return
    
    const newNote: AdvisorNote = {
      id: `note-${Date.now()}`,
      advisor_id: advisorId,
      client_id: clientId,
      content: newNoteContent,
      category: newNoteCategory,
      is_pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    setNotes([newNote, ...notes])
    setNewNoteContent("")
    setNewNoteCategory("general")
    setShowEditor(false)
  }
  
  const handleTogglePin = (noteId: string) => {
    setNotes(notes.map(n => 
      n.id === noteId ? { ...n, is_pinned: !n.is_pinned } : n
    ))
  }
  
  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter(n => n.id !== noteId))
  }
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="p-4">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        ))}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Add Note Button */}
      {!showEditor && (
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      )}
      
      {/* Note Editor */}
      {showEditor && (
        <Card className="p-4 border-emerald-200">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Write your note..."
            className="w-full p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
            rows={3}
          />
          <div className="flex items-center justify-between mt-3">
            <select
              value={newNoteCategory}
              onChange={(e) => setNewNoteCategory(e.target.value as NoteCategory)}
              className="text-sm border rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="general">General</option>
              <option value="risk_observation">Risk Observation</option>
              <option value="opportunity">Opportunity</option>
              <option value="compliance">Compliance</option>
              <option value="followup">Follow-up</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowEditor(false)
                  setNewNoteContent("")
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!newNoteContent.trim()}
                className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </div>
        </Card>
      )}
      
      {/* Notes List */}
      {notes.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No notes yet"
          description="Add notes to track important information about this client."
        />
      ) : (
        <div className="space-y-3">
          {/* Pinned notes first */}
          {notes.filter(n => n.is_pinned).map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              onTogglePin={handleTogglePin}
              onDelete={handleDeleteNote}
            />
          ))}
          {/* Then regular notes */}
          {notes.filter(n => !n.is_pinned).map(note => (
            <NoteCard 
              key={note.id} 
              note={note} 
              onTogglePin={handleTogglePin}
              onDelete={handleDeleteNote}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface NoteCardProps {
  note: AdvisorNote
  onTogglePin: (id: string) => void
  onDelete: (id: string) => void
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onTogglePin, onDelete }) => {
  return (
    <Card className={`p-4 ${note.is_pinned ? "border-emerald-200 bg-emerald-50/50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(note.category)}`}>
              {note.category.replace("_", " ")}
            </span>
            {note.is_pinned && (
              <Pin className="w-3 h-3 text-emerald-500" />
            )}
          </div>
          <p className="text-sm text-gray-700">{note.content}</p>
          <div className="text-xs text-gray-500 mt-2">{formatRelativeTime(note.created_at)}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onTogglePin(note.id)}
            className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100"
            title={note.is_pinned ? "Unpin" : "Pin"}
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}

// â”€â”€â”€ Escalations Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface EscalationsTabProps {
  clientId: string
  isMockMode?: boolean
}

const EscalationsTab: React.FC<EscalationsTabProps> = ({ clientId, isMockMode }) => {
  const [escalations, setEscalations] = useState<EscalationTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setEscalations(MOCK_ESCALATIONS.filter(e => e.client_id === clientId))
      setIsLoading(false)
    }, 500)
  }, [clientId, isMockMode])
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Card className="p-4">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-full" />
        </Card>
      </div>
    )
  }
  
  if (escalations.length === 0) {
    return (
      <EmptyState
        icon={<Flag className="w-8 h-8" />}
        title="No escalations"
        description="This client has no escalation requests."
      />
    )
  }
  
  return (
    <div className="space-y-3">
      {escalations.map(esc => (
        <Card key={esc.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  esc.priority === "urgent" ? "bg-red-100 text-red-700" :
                  esc.priority === "high" ? "bg-amber-100 text-amber-700" :
                  esc.priority === "medium" ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {esc.priority}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  esc.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  esc.status === "in_progress" ? "bg-emerald-100 text-emerald-700" :
                  esc.status === "resolved" ? "bg-emerald-100 text-emerald-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {esc.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">{esc.client_question}</p>
              <p className="text-sm text-gray-600 mt-1">{esc.context_summary}</p>
              <div className="text-xs text-gray-500 mt-2">{formatRelativeTime(esc.created_at)}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  advisorId,
  onBack,
  isMockMode = true,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [isLoading, setIsLoading] = useState(false)
  
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <User className="w-4 h-4" /> },
    { id: "conversations", label: "Conversations", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "scenarios", label: "Scenarios", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "notes", label: "Notes", icon: <FileText className="w-4 h-4" /> },
    { id: "escalations", label: "Escalations", icon: <Flag className="w-4 h-4" /> },
  ]
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </button>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center text-white text-xl font-semibold">
              {client.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-900">{client.name}</h1>
                <StatusIndicator status={client.status} />
                <JurisdictionBadge jurisdiction={client.jurisdiction} />
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span>Age {client.age}</span>
                <span>·</span>
                <RiskBadge risk={client.risk_appetite} />
                <span>·</span>
                <span>Target: Age {client.target_retire_age}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
              <Calendar className="w-4 h-4 inline mr-2" />
              Schedule Meeting
            </button>
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Send Message
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex-shrink-0 border-b bg-white">
        <div className="flex gap-1 px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {activeTab === "overview" && (
          <div className="max-w-4xl space-y-4">
            <AISummaryCard client={client} isLoading={isLoading} advisorId={advisorId} isMockMode={isMockMode} />
            <FinancialSnapshot client={client} />
          </div>
        )}
        
        {activeTab === "conversations" && (
          <div className="max-w-4xl">
            <ConversationsTab clientId={client.id} isMockMode={isMockMode} />
          </div>
        )}
        
        {activeTab === "scenarios" && (
          <div className="max-w-4xl">
            <ScenariosTab clientId={client.id} isMockMode={isMockMode} />
          </div>
        )}
        
        {activeTab === "notes" && (
          <div className="max-w-4xl">
            <NotesTab clientId={client.id} advisorId={advisorId} isMockMode={isMockMode} />
          </div>
        )}
        
        {activeTab === "escalations" && (
          <div className="max-w-4xl">
            <EscalationsTab clientId={client.id} isMockMode={isMockMode} />
          </div>
        )}
      </div>
    </div>
  )
}

export default ClientDetailView
