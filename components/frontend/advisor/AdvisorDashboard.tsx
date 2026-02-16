"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Users,
  AlertTriangle,
  Calendar,
  TrendingUp,
  ChevronRight,
  Clock,
  Bell,
  RefreshCw,
  Sparkles,
  X,
  Loader2,
  Target,
  Shield,
  CheckSquare,
  Lightbulb,
  BarChart3,
  Leaf,
  ArrowRight,
} from "lucide-react"
import type { AdvisorProfile, AdvisorDashboardMetrics, ClientProfile, EscalationTicket } from "@/lib/types"
import { getAdvisorDashboard, getAdvisorClients, getPendingEscalations, generateDailyBrief, MOCK_ADVISOR, MOCK_DASHBOARD_METRICS, getMockScenarioShareEscalations } from "@/lib/advisorApi"
import { Card, StatusIndicator, JurisdictionBadge, Skeleton } from "@/components/frontend/shared/UIComponents"
import { PoweredByLabel } from "@/components/frontend/shared/PoweredByLabel"
import { getPerformanceForRange, type TimeRange } from "@/lib/mockPortfolio"

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdvisorDashboardProps {
  advisor: AdvisorProfile
  onNavigateToClients: () => void
  onNavigateToAppointments: () => void
  onSelectClient: (client: ClientProfile) => void
  onRunScenarioAnalysis?: () => void
  onOpenChat?: () => void
  isMockMode?: boolean
}

// ─── Format Helpers ─────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// ─── AUM Performance Chart ──────────────────────────────────────────────────

function AumPerformanceChart({ data }: { data: { date: string; value: number }[] }) {
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
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id="aumGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#aumGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  )
}

// ─── Metric Card ────────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subtext?: string
  iconBg?: string
  onClick?: () => void
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  subtext,
  iconBg = "bg-gray-50",
  onClick,
}) => {
  const Wrapper = onClick ? "button" : "div"
  
  return (
    <Card className={onClick ? "hover:border-emerald-200 transition-colors cursor-pointer" : ""}>
      <Wrapper onClick={onClick} className="w-full text-left">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
          </div>
          {onClick && <ChevronRight className="w-5 h-5 text-gray-300" />}
        </div>
      </Wrapper>
    </Card>
  )
}

// ─── Client Preview Card ────────────────────────────────────────────────────

interface ClientPreviewProps {
  client: ClientProfile
  onClick: () => void
}

const ClientPreview: React.FC<ClientPreviewProps> = ({ client, onClick }) => {
  const totalAssets = client.investment_assets + client.current_cash
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
    >
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
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{formatCurrency(totalAssets)}</span>
          <span>•</span>
          <JurisdictionBadge jurisdiction={client.jurisdiction} size="sm" />
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </button>
  )
}

// ─── Escalation Preview ─────────────────────────────────────────────────────

interface EscalationPreviewProps {
  escalation: EscalationTicket
  clientName?: string
  onClick: () => void
}

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-emerald-100 text-emerald-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
}

const EscalationPreview: React.FC<EscalationPreviewProps> = ({
  escalation,
  clientName,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${priorityColors[escalation.priority]}`}>
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{clientName || "Client"}</p>
        <p className="text-sm text-gray-500 truncate">{escalation.client_question}</p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(escalation.created_at).toLocaleDateString()}
        </p>
      </div>
    </button>
  )
}

// ─── Brief Me Modal (Rich Card Rendering) ──────────────────────────────────

interface BriefSection {
  type: "heading" | "keyvalue" | "list" | "checklist" | "paragraph"
  title?: string
  level?: number
  icon?: string
  items?: { key?: string; value: string; checked?: boolean }[]
  text?: string
}

function parseBriefSections(content: string): BriefSection[] {
  const sections: BriefSection[] = []
  const lines = content.split("\n")
  let currentSection: BriefSection | null = null

  const flush = () => { if (currentSection) { sections.push(currentSection); currentSection = null } }

  for (const line of lines) {
    const t = line.trim()
    if (t === "") { flush(); continue }

    if (t.startsWith("## ") && !t.startsWith("### ")) {
      flush()
      const raw = t.slice(3)
      const emojiMatch = raw.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]+)\s*/u)
      sections.push({ type: "heading", title: emojiMatch ? raw.slice(emojiMatch[0].length) : raw, level: 2, icon: emojiMatch?.[1] })
      continue
    }
    if (t.startsWith("### ")) {
      flush()
      const raw = t.slice(4)
      const emojiMatch = raw.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}]+)\s*/u)
      sections.push({ type: "heading", title: emojiMatch ? raw.slice(emojiMatch[0].length) : raw, level: 3, icon: emojiMatch?.[1] })
      continue
    }

    // Checklist item
    const checkMatch = t.match(/^- \[([ xX])\]\s+(.+)/)
    if (checkMatch) {
      if (!currentSection || currentSection.type !== "checklist") { flush(); currentSection = { type: "checklist", items: [] } }
      currentSection.items!.push({ value: checkMatch[2], checked: checkMatch[1] !== " " })
      continue
    }

    // Key-value: **Key**: Value or **Key** - Value
    const kvMatch = t.match(/^[-*]\s+\*\*(.+?)\*\*\s*[-:–]\s*(.+)/)
    if (kvMatch) {
      if (!currentSection || currentSection.type !== "keyvalue") { flush(); currentSection = { type: "keyvalue", items: [] } }
      currentSection.items!.push({ key: kvMatch[1], value: kvMatch[2] })
      continue
    }

    // Numbered list
    const numMatch = t.match(/^\d+\.\s+(?:\*\*(.+?)\*\*\s*[-:–]\s*)?(.+)/)
    if (numMatch) {
      if (!currentSection || currentSection.type !== "list") { flush(); currentSection = { type: "list", items: [] } }
      currentSection.items!.push({ key: numMatch[1] || undefined, value: numMatch[2] })
      continue
    }

    // Bullet list
    if (t.startsWith("- ") || t.startsWith("* ")) {
      if (!currentSection || currentSection.type !== "list") { flush(); currentSection = { type: "list", items: [] } }
      currentSection.items!.push({ value: t.slice(2) })
      continue
    }

    flush()
    sections.push({ type: "paragraph", text: t })
  }
  flush()
  return sections
}

function renderBoldText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const boldPattern = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = boldPattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(<strong key={m.index}>{m[1]}</strong>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  "📅": <Calendar className="w-4 h-4 text-emerald-600" />,
  "🚨": <AlertTriangle className="w-4 h-4 text-emerald-600" />,
  "📊": <BarChart3 className="w-4 h-4 text-emerald-600" />,
  "✅": <CheckSquare className="w-4 h-4 text-emerald-600" />,
  "💡": <Lightbulb className="w-4 h-4 text-emerald-600" />,
  "🎯": <Target className="w-4 h-4 text-emerald-600" />,
  "📈": <TrendingUp className="w-4 h-4 text-emerald-600" />,
  "🔔": <Bell className="w-4 h-4 text-emerald-600" />,
}

const SECTION_COLORS: Record<string, string> = {
  "📅": "from-emerald-600 to-emerald-700",
  "🚨": "from-emerald-600 to-emerald-700",
  "📊": "from-emerald-600 to-emerald-700",
  "✅": "from-emerald-600 to-emerald-700",
  "💡": "from-emerald-600 to-emerald-700",
  "🎯": "from-emerald-600 to-emerald-700",
  "📈": "from-emerald-600 to-emerald-700",
  "🔔": "from-emerald-600 to-emerald-700",
}

interface BriefMeModalProps {
  advisor: AdvisorProfile
  onClose: () => void
  isMockMode?: boolean
}

const BriefMeModal: React.FC<BriefMeModalProps> = ({ advisor, onClose, isMockMode = true }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [briefContent, setBriefContent] = useState("")

  useEffect(() => {
    const mockBrief = `## 📅 Today's Schedule
- **2:00 PM** - John Doe (Periodic Review)
- **4:00 PM** - Robert Nguyen (Escalation Follow-up)

## 🚨 Urgent Attention Needed
1. **Robert Nguyen** - CPP timing decision pending. Meeting scheduled for today.
2. **Michael Rodriguez** - Backdoor Roth question escalated yesterday.

## 📊 Portfolio Overview
- **Total AUM**: $12.4M across 8 active clients
- **Clients Healthy**: 5 of 8
- **Needs Attention**: Linda Thompson (allocation drift), Michael Rodriguez (pending escalation)
- **Critical**: Robert Nguyen (CPP decision deadline approaching)

## ✅ Priority Tasks
- [ ] Review CPP deferral scenarios for Robert before 4 PM meeting
- [ ] Respond to Michael's Roth IRA escalation
- [ ] Send follow-up to Linda after yesterday's meeting
- [ ] Prepare Q1 review summary for John

## 💡 Opportunities
- **Sarah Chen** (Young Professional) has $15k in cash savings earning low interest. Given her high risk tolerance, discuss increasing investment allocation.
- **S&P 500** +0.3% YTD — stable environment for rebalancing conversations.`

    if (isMockMode) {
      let idx = 0
      const interval = setInterval(() => {
        if (idx <= mockBrief.length) {
          setBriefContent(mockBrief.substring(0, idx))
          idx += 20
        } else {
          setIsLoading(false)
          clearInterval(interval)
        }
      }, 15)
      return () => clearInterval(interval)
    } else {
      generateDailyBrief(advisor.id)
        .then(response => { setBriefContent(response); setIsLoading(false) })
        .catch(() => { setBriefContent(mockBrief); setIsLoading(false) })
    }
  }, [advisor.id, isMockMode])

  const sections = parseBriefSections(briefContent)
  // Group sections: each h2 heading starts a new card group
  const cards: { title: string; icon?: string; sections: BriefSection[] }[] = []
  let currentCard: { title: string; icon?: string; sections: BriefSection[] } | null = null

  for (const s of sections) {
    if (s.type === "heading" && s.level === 2) {
      if (currentCard) cards.push(currentCard)
      currentCard = { title: s.title || "", icon: s.icon, sections: [] }
    } else if (currentCard) {
      currentCard.sections.push(s)
    }
  }
  if (currentCard) cards.push(currentCard)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gray-900 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">Daily Briefing</h2>
                  <PoweredByLabel product="Work IQ" variant="dark" />
                </div>
                <p className="text-sm text-gray-400">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {cards.length === 0 && isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mr-3" />
              <span className="text-gray-500">Generating your briefing...</span>
            </div>
          ) : (
            cards.map((card, cardIdx) => {
              const gradient = SECTION_COLORS[card.icon || ""] || "from-emerald-600 to-emerald-700"
              const icon = SECTION_ICONS[card.icon || ""]

              return (
                <div key={cardIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className={`bg-gradient-to-r ${gradient} px-4 py-2.5 flex items-center gap-2`}>
                    {icon || <Sparkles className="w-4 h-4 text-white" />}
                    <h3 className="text-sm font-semibold text-white">{card.title}</h3>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {card.sections.map((s, sIdx) => {
                      if (s.type === "heading" && s.level === 3) {
                        return <h4 key={sIdx} className="text-sm font-medium text-gray-800 mt-2 flex items-center gap-2"><Target className="w-3.5 h-3.5 text-emerald-500" />{s.title}</h4>
                      }
                      if (s.type === "keyvalue" && s.items) {
                        return (
                          <div key={sIdx} className="space-y-1.5">
                            {s.items.map((it, j) => (
                              <div key={j} className="flex items-start gap-3 py-1.5 px-3 bg-gray-50 rounded-lg">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
                                <div className="text-sm">
                                  {it.key && <span className="font-semibold text-gray-900">{renderBoldText(it.key)}: </span>}
                                  <span className="text-gray-600">{renderBoldText(it.value)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      }
                      if (s.type === "checklist" && s.items) {
                        return (
                          <div key={sIdx} className="space-y-1.5">
                            {s.items.map((it, j) => (
                              <div key={j} className="flex items-start gap-3 py-1.5 px-3 bg-gray-50 rounded-lg">
                                <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${it.checked ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                                  {it.checked && <CheckSquare className="w-3 h-3 text-white" />}
                                </div>
                                <span className={`text-sm ${it.checked ? "text-gray-400 line-through" : "text-gray-700"}`}>{renderBoldText(it.value)}</span>
                              </div>
                            ))}
                          </div>
                        )
                      }
                      if (s.type === "list" && s.items) {
                        return (
                          <div key={sIdx} className="space-y-1.5">
                            {s.items.map((it, j) => (
                              <div key={j} className="flex items-start gap-2.5 py-1">
                                {it.key ? (
                                  <>
                                    <span className="w-5 h-5 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded text-xs font-bold flex-shrink-0 mt-0.5">{j + 1}</span>
                                    <div className="text-sm"><span className="font-medium text-gray-900">{renderBoldText(it.key)}: </span><span className="text-gray-600">{renderBoldText(it.value)}</span></div>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-emerald-400 mt-0.5">•</span>
                                    <span className="text-sm text-gray-600">{renderBoldText(it.value)}</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      }
                      if (s.type === "paragraph" && s.text) {
                        return <p key={sIdx} className="text-sm text-gray-600 leading-relaxed">{renderBoldText(s.text)}</p>
                      }
                      return null
                    })}
                  </div>
                </div>
              )
            })
          )}
          {isLoading && cards.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-400 justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard Component ───────────────────────────────────────────────

export const AdvisorDashboard: React.FC<AdvisorDashboardProps> = ({
  advisor,
  onNavigateToClients,
  onNavigateToAppointments,
  onSelectClient,
  onRunScenarioAnalysis,
  onOpenChat,
  isMockMode = true,
}) => {
  const [metrics, setMetrics] = useState<AdvisorDashboardMetrics | null>(null)
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [escalations, setEscalations] = useState<EscalationTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBriefMe, setShowBriefMe] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [advisor.id, isMockMode])

  const loadDashboardData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isMockMode) {
        // Use mock data
        const mockShareEscalations = getMockScenarioShareEscalations(advisor.id)
        setMetrics({
          ...MOCK_DASHBOARD_METRICS,
          pending_escalations:
            MOCK_DASHBOARD_METRICS.pending_escalations +
            mockShareEscalations.filter(e => e.status === "pending" || e.status === "in_progress").length,
        })
        // Mock clients will come from API in non-mock mode
        setClients([])
        setEscalations(mockShareEscalations)
      } else {
        const [metricsData, clientsData, escalationsData] = await Promise.all([
          getAdvisorDashboard(advisor.id),
          getAdvisorClients(advisor.id, { sortBy: "status", sortOrder: "asc" }),
          getPendingEscalations(advisor.id),
        ])
        setMetrics(metricsData)
        setClients(clientsData)
        setEscalations(escalationsData)
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err)
      setError("Failed to load dashboard data")
      // Fallback to mock data on error
      setMetrics(MOCK_DASHBOARD_METRICS)
    } finally {
      setIsLoading(false)
    }
  }

  // Clients needing attention
  const attentionClients = useMemo(() => {
    return clients.filter(c => c.status !== "healthy").slice(0, 5)
  }, [clients])

  // Current greeting
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 17 ? "Good afternoon" : "Good evening"

  // AUM chart state
  const [aumTimeRange, setAumTimeRange] = useState<TimeRange>("1M")
  const totalAum = metrics?.total_aum || 0
  const aumPerfData = useMemo(
    () => getPerformanceForRange(totalAum, aumTimeRange, 0.072),
    [totalAum, aumTimeRange],
  )
  // Simulated daily AUM change
  const aumChange24h = useMemo(() => {
    if (aumPerfData.length < 2) return { amount: 0, percent: 0 }
    const latest = aumPerfData[aumPerfData.length - 1].value
    const prev = aumPerfData[aumPerfData.length - 2].value
    return { amount: Math.round(latest - prev), percent: Number(((latest - prev) / prev * 100).toFixed(2)) }
  }, [aumPerfData])
  // YTD return (mock)
  const ytdReturn = 7.2

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-8 pb-24 md:pb-6">
        {/* Greeting + Quick Stats (matches personal view) */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-end gap-4">
            <div>
              <h1 className="text-3xl tracking-tight text-gray-900">
                <span className="font-normal">{greeting}, </span>
                <span className="font-bold">{advisor.name.split(" ")[0]}!</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 mb-0.5">
              <button
                onClick={() => setShowBriefMe(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm font-medium shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Brief Me
              </button>
              <button
                onClick={loadDashboardData}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh dashboard"
              >
                <RefreshCw className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">YTD Return</p>
              <p className="text-lg font-semibold text-emerald-600 tabular-nums">+{ytdReturn}%</p>
            </div>
            <div className="w-px h-10 bg-gray-100" />
            <div className="text-right">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Clients</p>
              <p className="text-lg font-semibold text-gray-900 tabular-nums">{metrics?.client_count || 0}</p>
            </div>
          </div>
        </div>

        {/* AUM Chart Card (matches personal view's Net Worth chart) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 pb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Assets Under Management
            </p>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-4xl font-bold text-gray-900 tracking-tight tabular-nums">
                {formatFullCurrency(totalAum)}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-lg ${
                  aumChange24h.amount >= 0
                    ? "text-emerald-700 bg-emerald-50"
                    : "text-red-700 bg-red-50"
                }`}
              >
                {aumChange24h.amount >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 rotate-180" />
                )}
                {aumChange24h.amount >= 0 ? "+" : ""}
                {formatCurrency(aumChange24h.amount)} ({aumChange24h.percent}%) today
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="px-4">
            <AumPerformanceChart data={aumPerfData} />
          </div>

          {/* Time Range Buttons */}
          <div className="px-6 pb-6 pt-3 flex gap-2">
            {(["1W", "1M", "3M", "1Y", "ALL"] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setAumTimeRange(range)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  aumTimeRange === range
                    ? "bg-gray-900 text-white shadow-md"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            icon={<Users className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-50"
            label="Total Clients"
            value={metrics?.client_count || 0}
            onClick={onNavigateToClients}
          />
          <MetricCard
            icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            iconBg="bg-amber-50"
            label="Pending Escalations"
            value={metrics?.pending_escalations || 0}
            subtext={metrics?.pending_escalations ? "Requires attention" : "All clear"}
          />
          <MetricCard
            icon={<Calendar className="w-5 h-5 text-emerald-600" />}
            iconBg="bg-emerald-50"
            label="Today's Appointments"
            value={metrics?.today_appointments || 0}
            subtext={`${metrics?.upcoming_appointments || 0} this week`}
            onClick={onNavigateToAppointments}
          />
        </div>

        {/* Client Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Summary */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Client Status</h3>
              <div className="group relative">
                <span className="text-xs text-gray-400 cursor-help underline decoration-dotted">How is this measured?</span>
                <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg">
                  <p className="font-semibold mb-1">Client Status Criteria:</p>
                  <p className="mb-1"><span className="text-emerald-400">Healthy:</span> On track to meet goals, no recent escalations</p>
                  <p className="mb-1"><span className="text-amber-400">Needs Attention:</span> Goal progress lagging or has unresolved questions</p>
                  <p><span className="text-red-400">Critical:</span> Significant concerns, urgent follow-up needed</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { status: "healthy" as const, label: "Healthy", color: "bg-emerald-500" },
                { status: "needs_attention" as const, label: "Needs Attention", color: "bg-amber-500" },
                { status: "critical" as const, label: "Critical", color: "bg-red-500" },
              ].map(({ status, label, color }) => {
                const count = metrics?.clients_by_status[status] || 0
                const total = metrics?.client_count || 1
                const percent = (count / total) * 100
                
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Risk Distribution */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Risk Distribution</h3>
              <div className="group relative">
                <span className="text-xs text-gray-400 cursor-help underline decoration-dotted">How is this measured?</span>
                <div className="absolute right-0 top-6 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg">
                  <p className="font-semibold mb-1">Risk Appetite Levels:</p>
                  <p className="mb-1"><span className="text-emerald-400">Low:</span> Conservative, capital preservation focus (≤40% equities)</p>
                  <p className="mb-1"><span className="text-yellow-400">Medium:</span> Balanced growth and stability (40-70% equities)</p>
                  <p><span className="text-red-400">High:</span> Aggressive growth focus (≥70% equities)</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { risk: "low", label: "Low Risk", color: "bg-emerald-500" },
                { risk: "medium", label: "Medium Risk", color: "bg-yellow-500" },
                { risk: "high", label: "High Risk", color: "bg-red-500" },
              ].map(({ risk, label, color }) => {
                const count = metrics?.clients_by_risk[risk] || 0
                const total = metrics?.client_count || 1
                const percent = (count / total) * 100
                
                return (
                  <div key={risk} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={onNavigateToClients}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
              >
                <Users className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-700">View All Clients</span>
              </button>
              <button
                onClick={onNavigateToAppointments}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
              >
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-700">Manage Appointments</span>
              </button>
              <button
                onClick={onRunScenarioAnalysis}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors text-left"
              >
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span className="font-medium text-emerald-700">Run Scenario Analysis</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Sage AI CTA */}
        <button
          onClick={onOpenChat}
          className="w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 text-left text-white hover:from-gray-800 hover:via-gray-700 hover:to-gray-800 transition-all duration-300 shadow-xl shadow-gray-900/30 hover:shadow-2xl hover:shadow-gray-900/40 hover:-translate-y-0.5 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-2xl" />
          <div className="relative flex items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Leaf className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-1 tracking-tight">Consult Sage for Advice</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Get regulatory guidance, client insights, and planning strategies powered by AI.
              </p>
            </div>
            <span className="flex-shrink-0 inline-flex items-center gap-2 text-sm font-medium bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl group-hover:bg-white/20 transition-all duration-200">
              Open Chat
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </div>
        </button>

        {/* Clients Needing Attention & Escalations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attention Required */}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Clients Needing Attention</h3>
                <button
                  onClick={onNavigateToClients}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  View all
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {attentionClients.length > 0 ? (
                attentionClients.map(client => (
                  <ClientPreview
                    key={client.id}
                    client={client}
                    onClick={() => onSelectClient(client)}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="font-medium text-gray-900">All clients are healthy</p>
                  <p className="text-sm">No immediate attention required</p>
                </div>
              )}
            </div>
          </Card>

          {/* Pending Escalations */}
          <Card padding="none">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Pending Escalations</h3>
                {escalations.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    {escalations.length} pending
                  </span>
                )}
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {escalations.length > 0 ? (
                escalations.slice(0, 5).map(escalation => (
                  <EscalationPreview
                    key={escalation.id}
                    escalation={escalation}
                    clientName={clients.find(c => c.id === escalation.client_id)?.name}
                    onClick={() => {
                      const client = clients.find(c => c.id === escalation.client_id)
                      if (client) onSelectClient(client)
                    }}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="font-medium text-gray-900">No pending escalations</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Brief Me Modal */}
        {showBriefMe && (
          <BriefMeModal
            advisor={advisor}
            onClose={() => setShowBriefMe(false)}
            isMockMode={isMockMode}
          />
        )}
      </div>
    </div>
  )
}

export default AdvisorDashboard
