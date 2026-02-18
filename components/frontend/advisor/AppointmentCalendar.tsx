"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Video,
  Phone,
  MapPin,
  X,
  Check,
  FileText,
  Sparkles,
  Loader2,
  Play,
  Send,
  MessageSquare,
} from "lucide-react"
import type { Appointment, AppointmentStatus, MeetingType, ClientProfile, PreMeetingBrief } from "@/lib/types"
import { Card, EmptyState, Skeleton } from "@/components/frontend/shared/UIComponents"
import { PoweredByLabel } from "@/components/frontend/shared/PoweredByLabel"
import { generatePreMeetingBrief, generatePostMeetingAnalysis } from "@/lib/advisorApi"

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AppointmentCalendarProps {
  advisorId: string
  onViewClient?: (clientId: string) => void
  isMockMode?: boolean
}

interface PostMeetingAnalysis {
  id: string
  appointment_id: string
  transcript_summary: string
  key_topics: string[]
  action_items: { task: string; assignee: "advisor" | "client"; due_date?: string }[]
  client_sentiment: "positive" | "neutral" | "concerned"
  follow_up_questions: string[]
  draft_follow_up_email: string
  generated_at: string
}

// â”€â”€â”€ Mock Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MOCK_CLIENTS: Record<string, ClientProfile> = {
  "demo-user": {
    id: "demo-user",
    name: "John Doe",
    email: "john.doe@email.com",
    role: "client",
    age: 40,
    current_cash: 30000,
    investment_assets: 250000,
    yearly_savings_rate: 0.15,
    salary: 96000,
    portfolio: { stocks: 0.7, bonds: 0.3 },
    risk_appetite: "medium",
    target_retire_age: 65,
    target_monthly_income: 4000,
    advisor_id: "advisor-jane",
    jurisdiction: "US",
    escalation_enabled: true,
    status: "healthy",
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2026-02-01T14:30:00Z",
  },
  "mid-career": {
    id: "mid-career",
    name: "Michael Rodriguez",
    email: "michael.rodriguez@email.com",
    role: "client",
    age: 45,
    current_cash: 50000,
    investment_assets: 400000,
    yearly_savings_rate: 0.18,
    salary: 120000,
    portfolio: { stocks: 0.65, bonds: 0.25, real_estate: 0.1 },
    risk_appetite: "medium",
    target_retire_age: 62,
    target_monthly_income: 6000,
    advisor_id: "advisor-jane",
    jurisdiction: "US",
    escalation_enabled: true,
    status: "needs_attention",
    created_at: "2023-11-10T08:30:00Z",
    updated_at: "2026-02-08T16:45:00Z",
  },
  "pre-retiree-ca": {
    id: "pre-retiree-ca",
    name: "Robert Nguyen",
    email: "robert.nguyen@email.ca",
    role: "client",
    age: 58,
    current_cash: 95000,
    investment_assets: 750000,
    yearly_savings_rate: 0.10,
    salary: 92000,
    portfolio: { stocks: 0.35, bonds: 0.55, cash: 0.1 },
    risk_appetite: "low",
    target_retire_age: 65,
    target_monthly_income: 5000,
    advisor_id: "advisor-jane",
    jurisdiction: "CA",
    escalation_enabled: true,
    status: "critical",
    created_at: "2023-09-05T10:30:00Z",
    updated_at: "2026-02-09T08:00:00Z",
  },
  "conservative-saver": {
    id: "conservative-saver",
    name: "Linda Thompson",
    email: "linda.thompson@email.com",
    role: "client",
    age: 55,
    current_cash: 80000,
    investment_assets: 600000,
    yearly_savings_rate: 0.12,
    salary: 85000,
    portfolio: { stocks: 0.4, bonds: 0.5, cash: 0.1 },
    risk_appetite: "low",
    target_retire_age: 67,
    target_monthly_income: 4500,
    advisor_id: "advisor-jane",
    jurisdiction: "US",
    escalation_enabled: true,
    status: "healthy",
    created_at: "2022-05-01T12:00:00Z",
    updated_at: "2026-02-01T10:30:00Z",
  },
}

// Helper to generate dates relative to today
function getRelativeDate(daysFromNow: number, hours: number = 10, minutes: number = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "appt-1",
    client_id: "demo-user",
    advisor_id: "advisor-jane",
    scheduled_at: getRelativeDate(0, 14, 0), // Today at 2 PM
    duration_minutes: 30,
    timezone: "America/New_York",
    meeting_type: "periodic_review",
    agenda: "Q1 portfolio review and goal assessment",
    status: "confirmed",
    created_at: getRelativeDate(-10),
    updated_at: getRelativeDate(-10),
  },
  {
    id: "appt-2",
    client_id: "pre-retiree-ca",
    advisor_id: "advisor-jane",
    scheduled_at: getRelativeDate(1, 16, 0), // Tomorrow at 4 PM
    duration_minutes: 45,
    timezone: "America/Toronto",
    meeting_type: "escalation_followup",
    related_escalation_id: "esc-2",
    agenda: "Discuss CPP timing and retirement income strategy",
    status: "confirmed",
    created_at: getRelativeDate(-3),
    updated_at: getRelativeDate(-3),
  },
  {
    id: "appt-3",
    client_id: "mid-career",
    advisor_id: "advisor-jane",
    scheduled_at: getRelativeDate(2, 10, 0), // Day after tomorrow at 10 AM
    duration_minutes: 30,
    timezone: "America/New_York",
    meeting_type: "scenario_planning",
    agenda: "Review early retirement scenarios and tax optimization",
    status: "scheduled",
    created_at: getRelativeDate(-5),
    updated_at: getRelativeDate(-5),
  },
  {
    id: "appt-4",
    client_id: "conservative-saver",
    advisor_id: "advisor-jane",
    scheduled_at: getRelativeDate(-2, 11, 0), // 2 days ago at 11 AM
    duration_minutes: 30,
    timezone: "America/New_York",
    meeting_type: "periodic_review",
    agenda: "Annual review and Social Security planning",
    status: "completed",
    created_at: getRelativeDate(-20),
    updated_at: getRelativeDate(-2, 11, 45),
    post_meeting_notes: "Discussed Social Security timing. Client prefers to wait until 67 for full benefits. Will update scenarios.",
  },
]

const MOCK_PRE_MEETING_BRIEF: PreMeetingBrief = {
  id: "brief-1",
  appointment_id: "appt-1",
  client_summary: "John Doe is a 40-year-old professional with a balanced investment approach. He has been actively using Sage for 8 months and shows strong engagement with retirement planning tools.",
  financial_snapshot: {
    total_assets: 280000,
    goal_progress_percent: 42,
    risk_score: 55,
    key_concerns: ["Retirement savings pace", "Tax optimization opportunities"]
  },
  recent_activity: {
    last_login: "2026-02-10T18:30:00Z",
    scenarios_explored: ["Early retirement at 60", "Increased savings rate"],
    questions_asked: ["Roth conversion timing", "401k contribution limits", "Social Security estimates"]
  },
  suggested_topics: [
    "Review progress toward retirement goals",
    "Discuss Roth conversion opportunity given current tax bracket",
    "Explore increasing 401k contribution to max",
    "Social Security claiming strategy"
  ],
  regulatory_considerations: [
    "2026 401k limit is $23,500 ($31,000 with catch-up at 50+)",
    "Client is below Roth IRA income limit - eligible for direct contributions",
    "Consider tax-loss harvesting before year-end"
  ],
  generated_at: "2026-02-11T08:00:00Z"
}

const MOCK_POST_MEETING_ANALYSIS: PostMeetingAnalysis = {
  id: "analysis-1",
  appointment_id: "appt-4",
  transcript_summary: "Discussion focused on Social Security claiming strategy and portfolio risk as client approaches retirement. Linda expressed preference for guaranteed income and concern about market volatility.",
  key_topics: [
    "Social Security timing (age 67 vs earlier)",
    "Bond allocation increase consideration",
    "Medicare enrollment timeline",
    "Required Minimum Distribution planning"
  ],
  action_items: [
    { task: "Run Social Security optimization scenarios", assignee: "advisor", due_date: "2026-02-15" },
    { task: "Review current bond fund options", assignee: "advisor", due_date: "2026-02-17" },
    { task: "Gather Medicare information from employer", assignee: "client", due_date: "2026-02-20" },
    { task: "Schedule follow-up to review scenarios", assignee: "advisor", due_date: "2026-02-14" }
  ],
  client_sentiment: "positive",
  follow_up_questions: [
    "What is your expected healthcare cost in retirement?",
    "Have you considered long-term care insurance?",
    "Would you like to explore annuity options for guaranteed income?"
  ],
  draft_follow_up_email: `Dear Linda,

Thank you for meeting with me today to discuss your retirement planning progress. I wanted to summarize our conversation and outline next steps.

**Key Discussion Points:**
- We reviewed your preference to claim Social Security at age 67 for full benefits
- Discussed your comfort level with current portfolio allocation
- Touched on Medicare enrollment timing as you approach 65

**Action Items:**
- I will run detailed Social Security optimization scenarios by February 15th
- Please gather information about your employer's retiree healthcare options
- I'll schedule a follow-up meeting to review the scenarios together

**Next Meeting:** I'll send a calendar invite for the week of February 17th.

Please don't hesitate to reach out if you have any questions before then.

Best regards,
Jane Smith, CFP`,
  generated_at: "2026-02-10T12:00:00Z"
}

// â”€â”€â”€ Helper Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function getMeetingTypeLabel(type: MeetingType): string {
  const labels: Record<MeetingType, string> = {
    initial_consultation: "Initial Consultation",
    periodic_review: "Periodic Review",
    escalation_followup: "Escalation Follow-up",
    scenario_planning: "Scenario Planning",
  }
  return labels[type]
}

function getMeetingTypeColor(type: MeetingType): string {
  const colors: Record<MeetingType, string> = {
    initial_consultation: "bg-gray-100 text-gray-700",
    periodic_review: "bg-emerald-100 text-emerald-700",
    escalation_followup: "bg-amber-100 text-amber-700",
    scenario_planning: "bg-emerald-100 text-emerald-700",
  }
  return colors[type]
}

function getStatusColor(status: AppointmentStatus): string {
  const colors: Record<AppointmentStatus, string> = {
    scheduled: "bg-gray-100 text-gray-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-orange-100 text-orange-700",
  }
  return colors[status]
}

// â”€â”€â”€ Pre-Meeting Brief Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PreMeetingBriefModalProps {
  appointment: Appointment
  client: ClientProfile
  onClose: () => void
  advisorId: string
  isMockMode?: boolean
}

// Helper to build rich brief from client data
function buildRichBriefFromClient(client: ClientProfile, appointment: Appointment): PreMeetingBrief {
  const totalAssets = client.investment_assets + client.current_cash
  const yearsToRetirement = client.target_retire_age - client.age
  const monthlyContribution = (client.salary * client.yearly_savings_rate) / 12
  
  // Calculate approximate goal progress
  const targetRetirementFund = client.target_monthly_income * 12 * 25 // 4% rule
  const goalProgress = Math.min(100, Math.round((totalAssets / targetRetirementFund) * 100))
  
  // Determine risk score based on portfolio and risk appetite
  const stockAllocation = (client.portfolio?.stocks || 0) * 100
  const riskScore = client.risk_appetite === 'high' ? 75 : client.risk_appetite === 'low' ? 35 : 55
  
  // Build key concerns based on client situation
  const concerns: string[] = []
  if (yearsToRetirement < 10 && stockAllocation > 60) {
    concerns.push('Portfolio may be too aggressive for timeline')
  }
  if (goalProgress < 50 && yearsToRetirement < 15) {
    concerns.push('May need to increase savings rate or adjust retirement age')
  }
  if (client.status === 'critical') {
    concerns.push('Client flagged as critical - requires immediate attention')
  }
  
  // Build talking points based on meeting type
  const talkingPoints: PreMeetingBrief['talking_points'] = []
  if (appointment.meeting_type === 'periodic_review') {
    talkingPoints.push(
      { title: 'Portfolio Performance Review', detail: 'Review portfolio performance since last meeting and discuss any rebalancing needs.', priority: 'high', category: 'performance' },
      { title: 'Life Changes Check-in', detail: 'Discuss any life changes that may affect retirement plans.', priority: 'medium', category: 'planning' },
      { title: 'Rebalancing Opportunities', detail: `Current allocation is ${stockAllocation}% stocks. Evaluate if rebalancing is needed.`, priority: 'medium', category: 'risk' },
    )
  } else if (appointment.meeting_type === 'escalation_followup') {
    talkingPoints.push(
      { title: 'Address Escalation Concern', detail: 'Review and address the specific concern raised in the escalation ticket.', priority: 'high', category: 'planning' },
      { title: 'Scenario Review', detail: 'Review any scenarios the client explored related to their question.', priority: 'medium', category: 'planning' },
      { title: 'Client Confidence', detail: 'Ensure client feels heard and their concerns are fully addressed.', priority: 'medium', category: 'planning' },
    )
  } else {
    talkingPoints.push(
      { title: 'Retirement Trajectory', detail: `Currently ${goalProgress}% toward retirement goal with ${yearsToRetirement} years remaining.`, priority: 'high', category: 'planning' },
      { title: `${client.jurisdiction === 'CA' ? 'RRSP/TFSA' : '401(k)/IRA'} Optimization`, detail: `Review contribution strategy and tax-advantaged account optimization.`, priority: 'high', category: 'contribution' },
      { title: 'What-If Scenarios', detail: 'Explore scenarios for different retirement ages and savings rates.', priority: 'medium', category: 'planning' },
    )
  }
  
  // Build risks
  const risks: PreMeetingBrief['risks'] = []
  if (goalProgress < 60) {
    risks.push({ title: 'Retirement Shortfall', detail: `Current trajectory at ${goalProgress}% of target. May need increased savings or delayed retirement.`, severity: 'high' })
  }
  if (stockAllocation > 60 && yearsToRetirement < 15) {
    risks.push({ title: 'Sequence-of-Returns Risk', detail: 'Heavy stock allocation close to retirement increases vulnerability to market downturns.', severity: 'medium' })
  }
  risks.push({ title: 'Inflation Risk', detail: 'Current projections may not fully account for inflation impact on retirement income needs.', severity: 'low' })

  // Build opportunities
  const opportunities: PreMeetingBrief['opportunities'] = []
  opportunities.push(
    { title: `Maximize ${client.jurisdiction === 'CA' ? 'RRSP' : '401(k)'} Deferrals`, detail: `Consider increasing contributions toward the annual limit if cash flow allows.`, impact: 'high' },
    { title: 'Portfolio Diversification', detail: 'Evaluate adding international equity or inflation-protected securities.', impact: 'medium' },
  )
  if (client.jurisdiction === 'US') {
    opportunities.push({ title: 'Backdoor Roth Strategy', detail: 'If eligible, discuss converting after-tax IRA contributions for tax-free growth.', impact: 'high' })
  }

  // Meeting agenda
  const agenda = [
    'Welcome & check-in on recent life changes',
    'Review portfolio performance & allocation',
    `Discuss ${client.jurisdiction === 'CA' ? 'RRSP/TFSA' : '401(k)/IRA'} contribution strategy`,
    'Address any concerns or questions',
    'Explore what-if scenarios',
    'Summarize action items & next steps',
  ]

  // Regulatory considerations by jurisdiction
  const regulatory: PreMeetingBrief['regulatory_considerations'] = client.jurisdiction === 'CA' 
    ? [
        { rule_id: 'ca-rrsp-limit', title: 'RRSP Contribution Deadline', detail: 'RRSP contribution deadline is March 3, 2027 for 2026 tax year.' },
        { rule_id: 'ca-cpp-standard', title: 'CPP/QPP Strategy', detail: 'Discuss CPP/QPP claiming strategy if client is 55+.' },
        { title: 'TFSA Room', detail: 'Review TFSA contribution room for the current year.' },
      ]
    : [
        { rule_id: 'us-401k-limit-2026', title: '401(k) Contribution Limit', detail: '2026 limit is $23,500 (+ $7,500 catch-up if 50+).' },
        { rule_id: 'us-rmd-age', title: 'RMD Requirements', detail: 'Review RMD requirements if client is approaching 73.' },
        { rule_id: 'us-roth-conversion', title: 'Roth Conversion', detail: 'Evaluate Roth conversion opportunities based on current tax bracket.' },
      ]
  
  return {
    id: `brief-${appointment.id}`,
    appointment_id: appointment.id,
    client_summary: `${client.name} is a ${client.age}-year-old client targeting retirement at age ${client.target_retire_age} (${yearsToRetirement} years away). Current risk appetite is ${client.risk_appetite}. ${client.jurisdiction === 'CA' ? 'Canadian resident.' : 'US-based client.'}`,
    financial_snapshot: {
      total_assets: totalAssets,
      invested_assets: client.investment_assets,
      cash_reserves: client.current_cash,
      annual_savings: Math.round(client.salary * client.yearly_savings_rate),
      savings_rate_percent: Math.round(client.yearly_savings_rate * 100),
      portfolio_allocation: client.portfolio,
      goal_progress_percent: goalProgress,
      risk_score: riskScore,
      key_concerns: concerns,
    },
    talking_points: talkingPoints,
    risks,
    opportunities,
    meeting_agenda: agenda,
    recent_activity: {
      last_login: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      scenarios_explored: ['Retirement age comparison', 'Savings rate impact'],
      questions_asked: ['Portfolio allocation', 'Tax optimization'],
    },
    suggested_topics: talkingPoints.map(t => t.title),
    regulatory_considerations: regulatory,
    generated_at: new Date().toISOString(),
  }
}

const PreMeetingBriefModal: React.FC<PreMeetingBriefModalProps> = ({
  appointment,
  client,
  onClose,
  advisorId,
  isMockMode = true,
}) => {
  const [brief, setBrief] = useState<PreMeetingBrief | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    setIsLoading(true)
    setError(null)
    
    if (isMockMode) {
      // Build a rich brief from actual client data
      setTimeout(() => {
        setBrief(buildRichBriefFromClient(client, appointment))
        setIsLoading(false)
      }, 1000)
    } else {
      // In live mode, call the dedicated pre-meeting-brief endpoint for structured JSON
      generatePreMeetingBrief(advisorId, client.id, appointment.id)
        .then((aiBrief) => {
          setBrief(aiBrief)
          setIsLoading(false)
        })
        .catch((err) => {
          console.error("Failed to generate brief:", err)
          setError("AI unavailable — showing local data.")
          setBrief(buildRichBriefFromClient(client, appointment))
          setIsLoading(false)
        })
    }
  }, [appointment.id, isMockMode, advisorId, client.id, client, appointment])

  const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }

  const categoryIcons: Record<string, string> = {
    performance: 'ðŸ“ˆ',
    contribution: 'ðŸ’°',
    tax: 'ðŸ§¾',
    risk: 'âš ï¸',
    planning: 'ðŸŽ¯',
    regulatory: 'ðŸ“‹',
  }

  const severityColors = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-amber-500 bg-amber-50',
    low: 'border-l-emerald-500 bg-emerald-50',
  }

  const impactColors = {
    high: 'border-l-emerald-500 bg-emerald-50',
    medium: 'border-l-emerald-500 bg-emerald-50',
    low: 'border-l-gray-400 bg-gray-50',
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-5 h-5" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Pre-Meeting Brief</h2>
                <PoweredByLabel product="Work IQ" variant="dark" />
              </div>
              <p className="text-sm text-gray-400">{client.name} · {formatDate(appointment.scheduled_at)}</p>
            </div>
            {!isMockMode && <span className="text-xs bg-white/20 px-2 py-0.5 rounded ml-2">Live AI</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <div className="grid grid-cols-4 gap-3">
                <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
              </div>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : brief ? (
            <div className="space-y-5">
              {error && <p className="text-amber-600 text-sm bg-amber-50 px-3 py-2 rounded-lg">{error}</p>}

              {/* Client Summary Card */}
              <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-sm text-gray-700 leading-relaxed">{brief.client_summary}</p>
              </div>
              
              {/* Financial Snapshot Grid */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Financial Snapshot</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-[11px] text-gray-500 font-medium">Total Assets</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">
                      ${brief.financial_snapshot.total_assets.toLocaleString()}
                    </div>
                    {brief.financial_snapshot.invested_assets != null && brief.financial_snapshot.cash_reserves != null && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        ${brief.financial_snapshot.invested_assets.toLocaleString()} invested Â· ${brief.financial_snapshot.cash_reserves.toLocaleString()} cash
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-[11px] text-gray-500 font-medium">Goal Progress</div>
                    <div className="flex items-end gap-1 mt-1">
                      <span className={`text-xl font-bold ${brief.financial_snapshot.goal_progress_percent >= 60 ? 'text-emerald-600' : brief.financial_snapshot.goal_progress_percent >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {brief.financial_snapshot.goal_progress_percent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div 
                        className={`h-1.5 rounded-full ${brief.financial_snapshot.goal_progress_percent >= 60 ? 'bg-emerald-500' : brief.financial_snapshot.goal_progress_percent >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, brief.financial_snapshot.goal_progress_percent)}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-[11px] text-gray-500 font-medium">Risk Score</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">
                      {brief.financial_snapshot.risk_score}<span className="text-sm text-gray-400 font-normal">/100</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      {brief.financial_snapshot.risk_score >= 70 ? 'Aggressive' : brief.financial_snapshot.risk_score >= 45 ? 'Moderate' : 'Conservative'}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-[11px] text-gray-500 font-medium">Annual Savings</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">
                      {brief.financial_snapshot.annual_savings != null ? `$${brief.financial_snapshot.annual_savings.toLocaleString()}` : 'N/A'}
                    </div>
                    {brief.financial_snapshot.savings_rate_percent != null && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        {brief.financial_snapshot.savings_rate_percent}% of income
                      </div>
                    )}
                  </div>
                </div>
                {/* Portfolio Allocation Bar */}
                {brief.financial_snapshot.portfolio_allocation && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="text-[11px] text-gray-500 font-medium mb-2">Portfolio Allocation</div>
                    <div className="flex rounded-full overflow-hidden h-3">
                      {Object.entries(brief.financial_snapshot.portfolio_allocation).map(([key, val], i) => {
                        const pct = typeof val === 'number' ? (val <= 1 ? val * 100 : val) : 0
                        const colors = ['bg-emerald-600', 'bg-emerald-400', 'bg-emerald-300', 'bg-gray-400', 'bg-gray-300']
                        return <div key={key} className={`${colors[i % colors.length]}`} style={{ width: `${pct}%` }} title={`${key}: ${pct.toFixed(0)}%`} />
                      })}
                    </div>
                    <div className="flex gap-4 mt-2">
                      {Object.entries(brief.financial_snapshot.portfolio_allocation).map(([key, val], i) => {
                        const pct = typeof val === 'number' ? (val <= 1 ? val * 100 : val) : 0
                        const dotColors = ['bg-emerald-600', 'bg-emerald-400', 'bg-emerald-300', 'bg-gray-400', 'bg-gray-300']
                        return (
                          <div key={key} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                            <div className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                            <span className="capitalize">{key}</span>
                            <span className="text-gray-400">{pct.toFixed(0)}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {/* Key Concerns */}
                {brief.financial_snapshot.key_concerns.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {brief.financial_snapshot.key_concerns.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-100 text-amber-800 border border-amber-200">
                        âš ï¸ {c}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* Two-Column: Talking Points + Risks & Opportunities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Talking Points */}
                {brief.talking_points && brief.talking_points.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Key Talking Points</h3>
                    <div className="space-y-2">
                      {brief.talking_points.map((tp, i) => (
                        <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{categoryIcons[tp.category] || 'ðŸ’¬'}</span>
                            <span className="text-sm font-medium text-gray-900 flex-1">{tp.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${priorityColors[tp.priority]}`}>
                              {tp.priority}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 ml-7">{tp.detail}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Risks & Opportunities stacked */}
                <div className="space-y-4">
                  {/* Risks */}
                  {brief.risks && brief.risks.length > 0 && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Risks & Concerns</h3>
                      <div className="space-y-2">
                        {brief.risks.map((r, i) => (
                          <div key={i} className={`p-3 rounded-lg border-l-4 ${severityColors[r.severity]}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">{r.title}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${priorityColors[r.severity]}`}>
                                {r.severity}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{r.detail}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Opportunities */}
                  {brief.opportunities && brief.opportunities.length > 0 && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Opportunities</h3>
                      <div className="space-y-2">
                        {brief.opportunities.map((o, i) => (
                          <div key={i} className={`p-3 rounded-lg border-l-4 ${impactColors[o.impact]}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">{o.title}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${o.impact === 'high' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                                {o.impact} impact
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{o.detail}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>

              {/* Meeting Agenda */}
              {brief.meeting_agenda && brief.meeting_agenda.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Suggested Agenda</h3>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                    {brief.meeting_agenda.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              
              {/* Recent Activity */}
              {brief.recent_activity && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Client Activity</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="text-[11px] text-gray-500 font-medium mb-2">Scenarios Explored</div>
                      <div className="flex flex-wrap gap-1.5">
                        {brief.recent_activity.scenarios_explored.map((s, i) => (
                          <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="text-[11px] text-gray-500 font-medium mb-2">Questions Asked</div>
                      <div className="flex flex-wrap gap-1.5">
                        {brief.recent_activity.questions_asked.map((q, i) => (
                          <span key={i} className="text-xs bg-emerald-50 text-gray-700 px-2 py-1 rounded-md border border-gray-100">{q}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Regulatory Considerations */}
              {brief.regulatory_considerations.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Regulatory Considerations</h3>
                  <div className="space-y-2">
                    {brief.regulatory_considerations.map((item, i) => {
                      const isStructured = typeof item === 'object'
                      return (
                        <div key={i} className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
                          <span className="text-base mt-0.5">ðŸ“‹</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-amber-900">
                              {isStructured ? item.title : item}
                            </div>
                            {isStructured && item.detail && (
                              <p className="text-xs text-amber-700 mt-0.5">{item.detail}</p>
                            )}
                          </div>
                          {isStructured && item.rule_id && (
                            <span className="text-[10px] text-amber-500 font-mono bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0">
                              {item.rule_id}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Failed to generate brief</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Close
          </button>
          <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            <Video className="w-4 h-4 inline mr-2" />
            Start Meeting
          </button>
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€ Post-Meeting Analysis Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PostMeetingAnalysisModalProps {
  appointment: Appointment
  client: ClientProfile
  onClose: () => void
  advisorId: string
  isMockMode?: boolean
}

const PostMeetingAnalysisModal: React.FC<PostMeetingAnalysisModalProps> = ({
  appointment,
  client,
  onClose,
  advisorId,
  isMockMode = true,
}) => {
  const [analysis, setAnalysis] = useState<PostMeetingAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"summary" | "actions" | "email">("summary")
  const [editedEmail, setEditedEmail] = useState("")
  const [meetingNotes, setMeetingNotes] = useState("")
  const [showNotesInput, setShowNotesInput] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (isMockMode) {
      setIsLoading(true)
      setTimeout(() => {
        setAnalysis(MOCK_POST_MEETING_ANALYSIS)
        setEditedEmail(MOCK_POST_MEETING_ANALYSIS.draft_follow_up_email)
        setIsLoading(false)
      }, 1500)
    } else {
      // In live mode, show input for meeting notes first
      setShowNotesInput(true)
      setIsLoading(false)
    }
  }, [appointment.id, isMockMode])
  
  const handleGenerateAnalysis = async () => {
    if (!meetingNotes.trim()) return
    
    setIsLoading(true)
    setShowNotesInput(false)
    setError(null)
    
    try {
      const result = await generatePostMeetingAnalysis(advisorId, client.id, meetingNotes)
      setAiAnalysis(result.summary)
      setEditedEmail(result.followUpEmail)
      setIsLoading(false)
    } catch (err) {
      console.error("Failed to generate analysis:", err)
      setError("Failed to generate analysis. Using mock data.")
      setAnalysis(MOCK_POST_MEETING_ANALYSIS)
      setEditedEmail(MOCK_POST_MEETING_ANALYSIS.draft_follow_up_email)
      setIsLoading(false)
    }
  }
  
  const getSentimentColor = (sentiment: string) => {
    const colors = {
      positive: "text-emerald-600 bg-emerald-100",
      neutral: "text-gray-600 bg-gray-100",
      concerned: "text-amber-600 bg-amber-100",
    }
    return colors[sentiment as keyof typeof colors] || colors.neutral
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="flex items-center gap-3 text-white">
            <FileText className="w-5 h-5" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Post-Meeting Analysis</h2>
                <PoweredByLabel product="Work IQ" variant="dark" />
              </div>
              <p className="text-sm text-emerald-100">{client.name} · {formatDate(appointment.scheduled_at)}</p>
            </div>
            {!isMockMode && <span className="text-xs bg-white/20 px-2 py-0.5 rounded ml-2">Live AI</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Meeting Notes Input for Live Mode */}
        {showNotesInput && (
          <div className="p-4 border-b bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter meeting notes or transcript for AI analysis
            </label>
            <textarea
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder="Paste meeting notes, key discussion points, or transcript..."
              className="w-full h-32 px-3 py-2 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-200"
            />
            <button
              onClick={handleGenerateAnalysis}
              disabled={!meetingNotes.trim()}
              className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Generate Analysis
            </button>
          </div>
        )}
        
        {/* Tabs */}
        {!showNotesInput && (
        <div className="flex border-b bg-gray-50">
          {[
            { id: "summary", label: "Summary" },
            { id: "actions", label: "Action Items" },
            { id: "email", label: "Draft Email" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : showNotesInput ? null : aiAnalysis ? (
            // Show AI-generated analysis
            <>
              {error && <p className="text-amber-600 text-sm mb-4">{error}</p>}
              {activeTab === "summary" && (
                <div className="prose prose-sm max-w-none">
                  {aiAnalysis.split("\n").map((line, i) => {
                    if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold">{line.slice(2)}</h1>
                    if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-4">{line.slice(3)}</h2>
                    if (line.startsWith("- ")) return <p key={i} className="ml-4">• {line.slice(2)}</p>
                    if (line.trim() === "") return <br key={i} />
                    return <p key={i}>{line}</p>
                  })}
                </div>
              )}
              {activeTab === "email" && (
                <div className="space-y-4">
                  <textarea
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="w-full h-64 px-3 py-2 border rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                    <Send className="w-4 h-4 inline mr-2" />
                    Send Email
                  </button>
                </div>
              )}
            </>
          ) : analysis ? (
            <>
              {error && <p className="text-amber-600 text-sm mb-4">{error}</p>}
              {activeTab === "summary" && (
                <div className="space-y-6">
                  {/* Transcript Summary */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Meeting Summary</h3>
                    <p className="text-sm text-gray-600">{analysis.transcript_summary}</p>
                  </section>
                  
                  {/* Client Sentiment */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Client Sentiment</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(analysis.client_sentiment)}`}>
                      {analysis.client_sentiment.charAt(0).toUpperCase() + analysis.client_sentiment.slice(1)}
                    </span>
                  </section>
                  
                  {/* Key Topics */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Key Topics Discussed</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.key_topics.map((topic, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </section>
                  
                  {/* Follow-up Questions */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Suggested Follow-up Questions</h3>
                    <ul className="space-y-1">
                      {analysis.follow_up_questions.map((q, i) => (
                        <li key={i} className="text-sm text-gray-600">• {q}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              )}
              
              {activeTab === "actions" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Action Items</h3>
                  {analysis.action_items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <input type="checkbox" className="mt-1 rounded" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{item.task}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className={`px-2 py-0.5 rounded ${
                            item.assignee === "advisor" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                          }`}>
                            {item.assignee === "advisor" ? "You" : "Client"}
                          </span>
                          {item.due_date && <span>Due: {formatDate(item.due_date)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {activeTab === "email" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Draft Follow-up Email</h3>
                    <button className="text-xs text-emerald-600 hover:text-emerald-700">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      Regenerate
                    </button>
                  </div>
                  <textarea
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="w-full h-80 p-4 border rounded-lg text-sm resize-none font-mono"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Failed to generate analysis</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Close
          </button>
          {activeTab === "email" && (
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              <Send className="w-4 h-4 inline mr-2" />
              Send to Client
            </button>
          )}
          {activeTab === "actions" && (
            <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              <Check className="w-4 h-4 inline mr-2" />
              Save Action Items
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// â”€â”€â”€ Appointment Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface AppointmentCardProps {
  appointment: Appointment
  client: ClientProfile
  onViewBrief: () => void
  onViewAnalysis: () => void
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  client,
  onViewBrief,
  onViewAnalysis,
}) => {
  const isPast = new Date(appointment.scheduled_at) < new Date()
  const isToday = new Date(appointment.scheduled_at).toDateString() === new Date().toDateString()
  
  return (
    <Card className={`p-4 ${isToday && !isPast ? "border-emerald-200 bg-emerald-50/30" : ""}`}>
      <div className="flex items-start gap-4">
        {/* Time */}
        <div className="text-center w-16 flex-shrink-0">
          <div className="text-lg font-semibold text-gray-900">{formatTime(appointment.scheduled_at)}</div>
          <div className="text-xs text-gray-500">{appointment.duration_minutes} min</div>
        </div>
        
        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getMeetingTypeColor(appointment.meeting_type)}`}>
              {getMeetingTypeLabel(appointment.meeting_type)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(appointment.status)}`}>
              {appointment.status}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-700">
              {client.name.split(" ").map(n => n[0]).join("")}
            </div>
            <span className="font-medium text-gray-900">{client.name}</span>
            <span className="text-xs text-gray-500">({client.jurisdiction})</span>
          </div>
          
          {appointment.agenda && (
            <p className="text-sm text-gray-500 line-clamp-1">{appointment.agenda}</p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!isPast && appointment.status !== "cancelled" && (
            <button
              onClick={onViewBrief}
              className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Pre-Brief
            </button>
          )}
          {appointment.status === "completed" && (
            <button
              onClick={onViewAnalysis}
              className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              Analysis
            </button>
          )}
          {isToday && !isPast && appointment.status !== "cancelled" && (
            <button className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1">
              <Video className="w-3 h-3" />
              Join
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  advisorId,
  onViewClient,
  isMockMode = true,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"day" | "week">("week")
  
  // Modal states
  const [briefAppointment, setBriefAppointment] = useState<Appointment | null>(null)
  const [analysisAppointment, setAnalysisAppointment] = useState<Appointment | null>(null)
  
  useEffect(() => {
    loadAppointments()
  }, [advisorId, isMockMode])
  
  const loadAppointments = () => {
    setIsLoading(true)
    setTimeout(() => {
      setAppointments(MOCK_APPOINTMENTS)
      setIsLoading(false)
    }, 500)
  }
  
  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {}
    appointments.forEach(appt => {
      const dateKey = new Date(appt.scheduled_at).toDateString()
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push(appt)
    })
    // Sort each day's appointments by time
    Object.values(grouped).forEach(dayAppts => {
      dayAppts.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    })
    return grouped
  }, [appointments])
  
  // Get dates for current week
  const weekDates = useMemo(() => {
    const dates: Date[] = []
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentDate])
  
  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7))
    setCurrentDate(newDate)
  }
  
  const todayCount = appointments.filter(a => 
    new Date(a.scheduled_at).toDateString() === new Date().toDateString() &&
    a.status !== "cancelled"
  ).length
  
  const upcomingCount = appointments.filter(a => 
    new Date(a.scheduled_at) > new Date() &&
    a.status !== "cancelled"
  ).length
  
  if (isLoading) {
    return (
      <div className="h-full p-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-500">
              {todayCount} today · {upcomingCount} upcoming
            </p>
          </div>
          <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4 inline mr-2" />
            New Appointment
          </button>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek("prev")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex gap-2">
            {weekDates.map(date => {
              const isToday = date.toDateString() === new Date().toDateString()
              const hasAppointments = appointmentsByDate[date.toDateString()]?.length > 0
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setCurrentDate(date)}
                  className={`w-12 py-2 rounded-lg text-center transition-colors ${
                    isToday
                      ? "bg-emerald-600 text-white"
                      : currentDate.toDateString() === date.toDateString()
                      ? "bg-emerald-100 text-emerald-700"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div className="text-xs">{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                  <div className="text-lg font-semibold">{date.getDate()}</div>
                  {hasAppointments && !isToday && (
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mx-auto mt-1" />
                  )}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => navigateWeek("next")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Appointments List */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          {formatFullDate(currentDate.toISOString())}
        </h2>
        
        {appointmentsByDate[currentDate.toDateString()]?.length > 0 ? (
          <div className="space-y-3">
            {appointmentsByDate[currentDate.toDateString()].map(appointment => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                client={MOCK_CLIENTS[appointment.client_id]}
                onViewBrief={() => setBriefAppointment(appointment)}
                onViewAnalysis={() => setAnalysisAppointment(appointment)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarIcon className="w-8 h-8" />}
            title="No appointments"
            description="No appointments scheduled for this day."
          />
        )}
      </div>
      
      {/* Pre-Meeting Brief Modal */}
      {briefAppointment && (
        <PreMeetingBriefModal
          appointment={briefAppointment}
          client={MOCK_CLIENTS[briefAppointment.client_id]}
          onClose={() => setBriefAppointment(null)}
          advisorId={advisorId}
          isMockMode={isMockMode}
        />
      )}
      
      {/* Post-Meeting Analysis Modal */}
      {analysisAppointment && (
        <PostMeetingAnalysisModal
          appointment={analysisAppointment}
          client={MOCK_CLIENTS[analysisAppointment.client_id]}
          onClose={() => setAnalysisAppointment(null)}
          advisorId={advisorId}
          isMockMode={isMockMode}
        />
      )}
    </div>
  )
}

export default AppointmentCalendar
