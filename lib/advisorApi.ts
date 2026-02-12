/**
 * Advisor API client functions.
 * Handles all advisor-specific API calls.
 */

import type {
  AdvisorProfile,
  AdvisorDashboardMetrics,
  AdvisorNote,
  NoteCategory,
  ClientProfile,
  EscalationTicket,
  EscalationStatus,
  EscalationPriority,
  ResolutionType,
  Appointment,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8172'

// ─── Advisor Profile ────────────────────────────────────────────────────────

export async function getAdvisor(advisorId: string): Promise<AdvisorProfile> {
  const response = await fetch(`${API_BASE_URL}/advisor/${advisorId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch advisor: ${response.statusText}`)
  }
  return response.json()
}

export async function updateAdvisor(
  advisorId: string,
  updates: Partial<Pick<AdvisorProfile, 'name' | 'license_number' | 'jurisdictions' | 'specializations' | 'bio'>>
): Promise<AdvisorProfile> {
  const response = await fetch(`${API_BASE_URL}/advisor/${advisorId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!response.ok) {
    throw new Error(`Failed to update advisor: ${response.statusText}`)
  }
  return response.json()
}

export async function getAdvisorDashboard(advisorId: string): Promise<AdvisorDashboardMetrics> {
  const response = await fetch(`${API_BASE_URL}/advisor/${advisorId}/dashboard`)
  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.statusText}`)
  }
  return response.json()
}

// ─── Client Management ──────────────────────────────────────────────────────

export interface GetClientsOptions {
  status?: 'healthy' | 'needs_attention' | 'critical'
  risk?: 'low' | 'medium' | 'high'
  jurisdiction?: 'US' | 'CA'
  sortBy?: 'name' | 'aum' | 'status' | 'age'
  sortOrder?: 'asc' | 'desc'
}

export async function getAdvisorClients(
  advisorId: string,
  options: GetClientsOptions = {}
): Promise<ClientProfile[]> {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.risk) params.set('risk', options.risk)
  if (options.jurisdiction) params.set('jurisdiction', options.jurisdiction)
  if (options.sortBy) params.set('sort_by', options.sortBy)
  if (options.sortOrder) params.set('sort_order', options.sortOrder)

  const url = `${API_BASE_URL}/advisor/${advisorId}/clients${params.toString() ? '?' + params : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch clients: ${response.statusText}`)
  }
  return response.json()
}

export async function getAdvisorClient(advisorId: string, clientId: string): Promise<ClientProfile> {
  const response = await fetch(`${API_BASE_URL}/advisor/${advisorId}/clients/${clientId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch client: ${response.statusText}`)
  }
  return response.json()
}

// ─── Advisor Notes ──────────────────────────────────────────────────────────

export async function getClientNotes(
  advisorId: string,
  clientId: string,
  category?: NoteCategory
): Promise<AdvisorNote[]> {
  const params = category ? `?category=${category}` : ''
  const response = await fetch(`${API_BASE_URL}/advisor/${advisorId}/clients/${clientId}/notes${params}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch notes: ${response.statusText}`)
  }
  return response.json()
}

export async function createClientNote(
  advisorId: string,
  clientId: string,
  note: {
    content: string
    category?: NoteCategory
    is_pinned?: boolean
    related_conversation_id?: string
    related_scenario_id?: string
  }
): Promise<AdvisorNote> {
  const response = await fetch(`${API_BASE_URL}/advisor/${advisorId}/clients/${clientId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  })
  if (!response.ok) {
    throw new Error(`Failed to create note: ${response.statusText}`)
  }
  return response.json()
}

export async function updateNote(
  advisorId: string,
  noteId: string,
  updates: Partial<Pick<AdvisorNote, 'content' | 'category' | 'is_pinned'>>
): Promise<AdvisorNote> {
  const response = await fetch(`${API_BASE_URL}/advisor/${advisorId}/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!response.ok) {
    throw new Error(`Failed to update note: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteNote(advisorId: string, noteId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/advisor/${advisorId}/notes/${noteId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete note: ${response.statusText}`)
  }
}

// ─── Escalations ────────────────────────────────────────────────────────────

export interface GetEscalationsOptions {
  status?: EscalationStatus
  priority?: EscalationPriority
}

export async function getAdvisorEscalations(
  advisorId: string,
  options: GetEscalationsOptions = {}
): Promise<EscalationTicket[]> {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.priority) params.set('priority', options.priority)

  const url = `${API_BASE_URL}/advisor/${advisorId}/escalations${params.toString() ? '?' + params : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch escalations: ${response.statusText}`)
  }
  return response.json()
}

export async function getPendingEscalations(advisorId: string): Promise<EscalationTicket[]> {
  const response = await fetch(`${API_BASE_URL}/advisor/${advisorId}/escalations/pending`)
  if (!response.ok) {
    throw new Error(`Failed to fetch pending escalations: ${response.statusText}`)
  }
  return response.json()
}

export async function updateEscalation(
  escalationId: string,
  updates: { status?: EscalationStatus; priority?: EscalationPriority }
): Promise<EscalationTicket> {
  const response = await fetch(`${API_BASE_URL}/advisor/escalations/${escalationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!response.ok) {
    throw new Error(`Failed to update escalation: ${response.statusText}`)
  }
  return response.json()
}

export async function resolveEscalation(
  escalationId: string,
  resolution: { resolution_type: ResolutionType; resolution_notes: string }
): Promise<EscalationTicket> {
  const response = await fetch(`${API_BASE_URL}/advisor/escalations/${escalationId}/resolve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resolution),
  })
  if (!response.ok) {
    throw new Error(`Failed to resolve escalation: ${response.statusText}`)
  }
  return response.json()
}

// ─── Appointments ───────────────────────────────────────────────────────────

export interface GetAppointmentsOptions {
  status?: string
  upcomingOnly?: boolean
}

export async function getAdvisorAppointments(
  advisorId: string,
  options: GetAppointmentsOptions = {}
): Promise<Appointment[]> {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.upcomingOnly) params.set('upcoming_only', 'true')

  const url = `${API_BASE_URL}/advisor/${advisorId}/appointments${params.toString() ? '?' + params : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch appointments: ${response.statusText}`)
  }
  return response.json()
}

export async function getTodayAppointments(advisorId: string): Promise<Appointment[]> {
  const response = await fetch(`${API_BASE_URL}/advisor/${advisorId}/appointments/today`)
  if (!response.ok) {
    throw new Error(`Failed to fetch today's appointments: ${response.statusText}`)
  }
  return response.json()
}

// ─── AI Chat for Advisors ───────────────────────────────────────────────────

export interface AdvisorChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface AdvisorChatRequest {
  message: string
  advisor_id: string
  context?: {
    client_id?: string
    jurisdiction?: string
    topic?: string
  }
  history?: AdvisorChatMessage[]
}

export interface AdvisorChatCitation {
  id?: string
  title: string
  source: string
  description?: string
  jurisdiction?: string
  category?: string
  values?: Record<string, unknown>
  last_verified?: string
}

export interface AdvisorChatResponse {
  response: string
  citations?: AdvisorChatCitation[]
  related_clients?: string[]
}

/**
 * Send a chat message to the AI for advisor-specific queries.
 * Uses the dedicated advisor chat endpoint with enriched context.
 */
export async function sendAdvisorChat(request: AdvisorChatRequest): Promise<AdvisorChatResponse> {
  const response = await fetch(`${API_BASE_URL}/advisor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: request.message,
      advisor_id: request.advisor_id,
      context: request.context,
      history: request.history?.map(m => ({
        role: m.role,
        content: m.content,
      })) || [],
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to send chat: ${response.statusText}`)
  }
  
  const data = await response.json()
  return {
    response: data.response,
    citations: data.citations || [],
  }
}

/**
 * Stream a chat response for advisor queries.
 */
export async function streamAdvisorChat(
  request: AdvisorChatRequest,
  onUpdate: (content: string, isComplete: boolean, citations?: AdvisorChatCitation[]) => void
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/advisor/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: request.message,
      advisor_id: request.advisor_id,
      context: request.context,
      history: request.history?.map(m => ({
        role: m.role,
        content: m.content,
      })) || [],
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to start chat stream: ${response.statusText}`)
  }
  
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')
  
  const decoder = new TextDecoder()
  let fullContent = ''
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'content' && data.data) {
            fullContent += data.data
            onUpdate(fullContent, false)
          } else if (data.type === 'complete') {
            const citations: AdvisorChatCitation[] = data.data?.citations || []
            if (data.data?.response) {
              fullContent = data.data.response
            }
            onUpdate(fullContent, true, citations)
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      }
    }
  }
  
  onUpdate(fullContent, true, [])
}

/**
 * Generate a pre-meeting brief for an appointment.
 */
export async function generatePreMeetingBrief(
  advisorId: string,
  clientId: string,
  appointmentId: string
): Promise<import('./types').PreMeetingBrief> {
  const response = await fetch(`${API_BASE_URL}/advisor/pre-meeting-brief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      advisor_id: advisorId,
      client_id: clientId,
      appointment_id: appointmentId,
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to generate brief: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Generate post-meeting analysis from meeting notes.
 */
export async function generatePostMeetingAnalysis(
  advisorId: string,
  clientId: string,
  meetingNotes: string
): Promise<{ summary: string; actionItems: string[]; followUpEmail: string }> {
  const response = await fetch(`${API_BASE_URL}/advisor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Analyze the following meeting notes for my client ${clientId} and provide a structured analysis:

## Meeting Notes
${meetingNotes}

Please generate:

### 1. Meeting Summary
A concise summary of key discussion points and decisions made.

### 2. Action Items
Bulleted list of follow-up tasks, specifying who is responsible (advisor or client) and suggested deadlines.

### 3. Follow-Up Email Draft
A professional email to send to the client summarizing the meeting and next steps.`,
      advisor_id: advisorId,
      context: { client_id: clientId },
      history: [],
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to generate analysis: ${response.statusText}`)
  }
  
  const data = await response.json()
  const content = data.response
  return {
    summary: content,
    actionItems: [],
    followUpEmail: content,
  }
}

/**
 * Generate a daily brief for an advisor.
 */
export async function generateDailyBrief(advisorId: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/advisor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Generate my daily brief for today. Using my actual client portfolio data, appointments, and escalation queue, provide:

## 📅 Today's Schedule
List my appointments for today with client names, times, meeting types, and brief context for each.

## 🚨 Urgent Matters
Highlight any pending escalations or at-risk clients that need immediate attention. Include specific client names and their concerns.

## 📊 Portfolio Overview
Summarize my book of business: total AUM, client count, and any clients whose status is "needs_attention" or "critical" with specific reasons.

## ✅ Priority Tasks
Suggest the top 3-5 actionable items for today based on my escalation queue, upcoming appointments, and client situations.

## 💡 Opportunities
Identify any proactive opportunities (e.g., clients approaching milestones, rebalancing needs, tax planning windows).`,
      advisor_id: advisorId,
      history: [],
    }),
  })
  
  if (!response.ok) {
    throw new Error(`Failed to generate daily brief: ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.response
}

/**
 * Generate an AI-powered client summary using the LLM with real client data.
 */
export async function generateClientSummary(
  advisorId: string,
  clientId: string,
  client: ClientProfile
): Promise<string> {
  const totalAssets = client.investment_assets + client.current_cash
  const yearsToRetire = client.target_retire_age - client.age

  const response = await fetch(`${API_BASE_URL}/advisor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Generate a concise AI summary for my client ${client.name} (ID: ${clientId}).

Client snapshot:
- Age: ${client.age}, ${client.jurisdiction} resident
- Total assets: $${totalAssets.toLocaleString()} (cash: $${client.current_cash.toLocaleString()}, invested: $${client.investment_assets.toLocaleString()})
- Risk appetite: ${client.risk_appetite}
- Portfolio: ${Object.entries(client.portfolio).map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`).join(', ')}
- Savings rate: ${(client.yearly_savings_rate * 100).toFixed(0)}% of $${client.salary.toLocaleString()} salary
- Target: retire at ${client.target_retire_age} (${yearsToRetire} years away), $${client.target_monthly_income.toLocaleString()}/month income
- Status: ${client.status}

Provide a 3-4 sentence executive summary covering:
1. Overall retirement readiness assessment
2. Key strengths or risks in their current plan
3. Most important action item or opportunity

Keep it concise and actionable — this appears in a summary card on the client detail view.`,
      advisor_id: advisorId,
      context: { client_id: clientId },
      history: [],
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to generate client summary: ${response.statusText}`)
  }

  const data = await response.json()
  return data.response
}

/**
 * Generate AI-powered scenario analysis across selected clients.
 */
// ─── Scenario Analysis Types ────────────────────────────────────────────────

export interface ClientAnalysis {
  client_id: string
  client_name: string
  current_outlook: {
    success_rate: number
    monthly_income: number
    assessment: string
  }
  scenario_impact: {
    direction: 'positive' | 'negative' | 'neutral'
    success_rate_change: number
    new_success_rate: number
    income_change: number
    new_monthly_income: number
    summary: string
  }
  risk_level: 'high' | 'medium' | 'low'
  recommendation: string
}

export interface ScenarioAnalysisResult {
  headline: string
  overall_summary: string
  overall_recommendation: string
  client_analyses: ClientAnalysis[]
  key_insights: {
    title: string
    detail: string
    type: 'warning' | 'info' | 'success'
  }[]
  suggested_actions: {
    action: string
    priority: 'high' | 'medium' | 'low'
    affected_clients: string[]
  }[]
}

export async function generateScenarioAnalysis(
  advisorId: string,
  clients: ClientProfile[],
  scenarioType: string,
  scenarioDescription: string,
  scenarioParams: Record<string, any>
): Promise<ScenarioAnalysisResult> {
  const clientData = clients.map(c => ({
    id: c.id,
    name: c.name,
    age: c.age,
    jurisdiction: c.jurisdiction,
    risk_appetite: c.risk_appetite,
    investment_assets: c.investment_assets,
    current_cash: c.current_cash,
    portfolio: c.portfolio,
    yearly_savings_rate: c.yearly_savings_rate,
    salary: c.salary,
    target_retire_age: c.target_retire_age,
    target_monthly_income: c.target_monthly_income,
    status: c.status,
  }))

  const response = await fetch(`${API_BASE_URL}/advisor/scenario-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      advisor_id: advisorId,
      clients: clientData,
      scenario_type: scenarioType,
      scenario_description: scenarioDescription,
      scenario_params: scenarioParams,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to generate scenario analysis: ${response.statusText}`)
  }

  return response.json()
}

// ─── Mock Data for Development ──────────────────────────────────────────────

export const MOCK_ADVISOR: AdvisorProfile = {
  id: 'advisor-jane',
  email: 'jane.smith@sagefinancial.com',
  name: 'Jane Smith',
  role: 'advisor',
  license_number: 'CFP-123456',
  jurisdictions: ['US', 'CA'],
  specializations: ['retirement_planning', 'tax_optimization', 'estate_planning'],
  bio: '20+ years of experience helping clients achieve their retirement goals.',
  client_count: 6,
  total_aum: 2465000,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2026-02-01T14:30:00Z',
}

// List of all available advisors for the advisor switcher
export const MOCK_ADVISORS: AdvisorProfile[] = [
  MOCK_ADVISOR,
  {
    id: 'advisor-mike',
    email: 'mike.johnson@sagefinancial.com',
    name: 'Michael Johnson',
    role: 'advisor',
    license_number: 'CFP-789012',
    jurisdictions: ['US'],
    specializations: ['401k_optimization', 'early_retirement', 'high_net_worth'],
    bio: 'Former Wall Street analyst turned financial advisor. Expert in aggressive growth strategies.',
    client_count: 1,
    total_aum: 900000,
    created_at: '2024-03-20T09:00:00Z',
    updated_at: '2026-02-01T14:30:00Z',
  },
]

export const MOCK_DASHBOARD_METRICS: AdvisorDashboardMetrics = {
  total_aum: 2465000,
  client_count: 6,
  clients_by_status: { healthy: 4, needs_attention: 1, critical: 1 },
  clients_by_risk: { low: 2, medium: 3, high: 1 },
  pending_escalations: 2,
  upcoming_appointments: 3,
  today_appointments: 1,
}

// Mock clients that mirror the user profiles
export const MOCK_CLIENTS: ClientProfile[] = [
  {
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
    description: "Balanced approach with moderate risk tolerance",
    advisor_id: "advisor-jane",
    jurisdiction: "US",
    escalation_enabled: true,
    status: "healthy",
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2026-02-01T14:30:00Z",
  },
  {
    id: "young-professional",
    name: "Sarah Chen",
    email: "sarah.chen@email.com",
    role: "client",
    age: 28,
    current_cash: 15000,
    investment_assets: 45000,
    yearly_savings_rate: 0.2,
    salary: 75000,
    portfolio: { stocks: 0.85, bonds: 0.15 },
    risk_appetite: "high",
    target_retire_age: 60,
    target_monthly_income: 5000,
    description: "Young professional with aggressive growth strategy",
    advisor_id: "advisor-jane",
    jurisdiction: "US",
    escalation_enabled: true,
    status: "healthy",
    created_at: "2024-08-20T14:00:00Z",
    updated_at: "2026-02-05T09:15:00Z",
  },
  {
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
    description: "Mid-career professional with diversified portfolio",
    advisor_id: "advisor-jane",
    jurisdiction: "US",
    escalation_enabled: true,
    status: "needs_attention",
    last_advisor_interaction: "2026-01-15T11:00:00Z",
    created_at: "2023-11-10T08:30:00Z",
    updated_at: "2026-02-08T16:45:00Z",
  },
  {
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
    description: "Conservative approach nearing retirement",
    advisor_id: "advisor-jane",
    jurisdiction: "US",
    escalation_enabled: true,
    status: "healthy",
    last_advisor_interaction: "2026-02-01T10:00:00Z",
    created_at: "2022-05-01T12:00:00Z",
    updated_at: "2026-02-01T10:30:00Z",
  },
  {
    id: "canadian-professional",
    name: "Emma Tremblay",
    email: "emma.tremblay@email.ca",
    role: "client",
    age: 42,
    current_cash: 40000,
    investment_assets: 320000,
    yearly_savings_rate: 0.16,
    salary: 105000,
    portfolio: { stocks: 0.6, bonds: 0.35, cash: 0.05 },
    risk_appetite: "medium",
    target_retire_age: 63,
    target_monthly_income: 5500,
    description: "Canadian professional maximizing RRSP and TFSA",
    advisor_id: "advisor-jane",
    jurisdiction: "CA",
    escalation_enabled: true,
    status: "healthy",
    created_at: "2024-04-10T09:00:00Z",
    updated_at: "2026-02-07T13:45:00Z",
  },
  {
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
    description: "Pre-retiree planning CPP/OAS optimization",
    advisor_id: "advisor-jane",
    jurisdiction: "CA",
    escalation_enabled: true,
    status: "critical",
    last_advisor_interaction: "2026-01-20T14:00:00Z",
    created_at: "2023-09-05T10:30:00Z",
    updated_at: "2026-02-09T08:00:00Z",
  },
]

// Helper to get mock clients for an advisor
export function getMockClientsForAdvisor(advisorId: string): ClientProfile[] {
  return MOCK_CLIENTS.filter(c => c.advisor_id === advisorId)
}
