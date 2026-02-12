/**
 * Centralized TypeScript types for Sage multi-persona application.
 * Supports Client, Advisor, and Admin personas.
 */

// ─── User Roles & Personas ──────────────────────────────────────────────────

export type UserRole = 'client' | 'advisor' | 'admin'
export type Jurisdiction = 'US' | 'CA'
export type ClientStatus = 'healthy' | 'needs_attention' | 'critical'
export type RiskAppetite = 'low' | 'medium' | 'high'

// ─── Base User Types ────────────────────────────────────────────────────────

export interface BaseUser {
  id: string
  email: string
  name: string
  role: UserRole
  created_at: string
  updated_at: string
}

// ─── Client Types ───────────────────────────────────────────────────────────

export interface ClientProfile extends BaseUser {
  role: 'client'
  age: number
  current_cash: number
  investment_assets: number
  yearly_savings_rate: number
  salary: number
  portfolio: Record<string, number>
  risk_appetite: RiskAppetite
  target_retire_age: number
  target_monthly_income: number
  description?: string
  advisor_id?: string
  jurisdiction: Jurisdiction
  escalation_enabled: boolean
  last_advisor_interaction?: string
  status: ClientStatus
}

// For backwards compatibility with existing code
export interface UserProfile {
  id: string
  name: string
  age: number
  current_cash: number
  investment_assets: number
  yearly_savings_rate: number
  salary: number
  portfolio: Record<string, number>
  risk_appetite: RiskAppetite
  target_retire_age: number
  target_monthly_income: number
  description?: string
  email?: string
  advisor_id?: string
  jurisdiction?: Jurisdiction
  escalation_enabled?: boolean
  last_advisor_interaction?: string
  status?: ClientStatus
}

// ─── Advisor Types ──────────────────────────────────────────────────────────

export interface AdvisorProfile extends BaseUser {
  role: 'advisor'
  license_number?: string
  jurisdictions: Jurisdiction[]
  specializations: string[]
  bio?: string
  client_count?: number
  total_aum?: number
}

export interface AdvisorDashboardMetrics {
  total_aum: number
  client_count: number
  clients_by_status: Record<string, number>
  clients_by_risk: Record<string, number>
  pending_escalations: number
  upcoming_appointments: number
  today_appointments: number
}

export interface AdvisorNote {
  id: string
  advisor_id: string
  client_id: string
  content: string
  category: NoteCategory
  is_pinned: boolean
  related_conversation_id?: string
  related_scenario_id?: string
  created_at: string
  updated_at: string
}

export type NoteCategory = 'general' | 'risk_observation' | 'opportunity' | 'compliance' | 'followup'

// ─── Admin Types ────────────────────────────────────────────────────────────

export type AdminPermission = 'manage_products' | 'review_compliance' | 'manage_users' | 'view_analytics'

export interface AdminProfile extends BaseUser {
  role: 'admin'
  permissions: AdminPermission[]
}

export interface AdminDashboardMetrics {
  total_clients: number
  total_advisors: number
  pending_compliance_reviews: number
  high_risk_reviews: number
  active_products: number
  active_regulatory_rules: number
}

// ─── Escalation Types ───────────────────────────────────────────────────────

export type EscalationReason = 'user_requested' | 'ai_complexity' | 'regulatory_question' | 'high_value_decision'
export type EscalationStatus = 'pending' | 'in_progress' | 'resolved' | 'escalated_to_compliance'
export type EscalationPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ResolutionType = 'answered' | 'meeting_scheduled' | 'referred_out' | 'no_action_needed'

export interface EscalationTicket {
  id: string
  client_id: string
  advisor_id: string
  source_conversation_id?: string
  reason: EscalationReason
  trigger_message?: string
  ai_confidence_score?: number
  context_summary: string
  client_question: string
  suggested_response?: string
  status: EscalationStatus
  priority: EscalationPriority
  resolution_notes?: string
  resolution_type?: ResolutionType
  created_at: string
  acknowledged_at?: string
  resolved_at?: string
}

// ─── Appointment Types ──────────────────────────────────────────────────────

export type MeetingType = 'initial_consultation' | 'periodic_review' | 'escalation_followup' | 'scenario_planning'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export interface Appointment {
  id: string
  client_id: string
  advisor_id: string
  scheduled_at: string
  duration_minutes: number
  timezone: string
  meeting_type: MeetingType
  related_escalation_id?: string
  agenda?: string
  status: AppointmentStatus
  pre_meeting_brief?: PreMeetingBrief
  post_meeting_notes?: string
  created_at: string
  updated_at: string
}

export interface PreMeetingBrief {
  id: string
  appointment_id: string
  client_summary: string
  financial_snapshot: {
    total_assets: number
    invested_assets?: number
    cash_reserves?: number
    annual_savings?: number
    savings_rate_percent?: number
    portfolio_allocation?: Record<string, number>
    goal_progress_percent: number
    risk_score: number
    key_concerns: string[]
  }
  talking_points?: {
    title: string
    detail: string
    priority: 'high' | 'medium' | 'low'
    category: 'performance' | 'contribution' | 'tax' | 'risk' | 'planning' | 'regulatory'
  }[]
  risks?: {
    title: string
    detail: string
    severity: 'high' | 'medium' | 'low'
  }[]
  opportunities?: {
    title: string
    detail: string
    impact: 'high' | 'medium' | 'low'
  }[]
  meeting_agenda?: string[]
  recent_activity: {
    last_login: string
    scenarios_explored: string[]
    questions_asked: string[]
  }
  suggested_topics: string[]
  regulatory_considerations: (string | {
    rule_id?: string
    title: string
    detail: string
  })[]
  generated_at: string
}

// ─── Product Types ──────────────────────────────────────────────────────────

export type AccountType = 
  // US accounts
  | '401k' | 'roth_401k' | 'traditional_ira' | 'roth_ira' | 'brokerage' | 'hsa'
  // Canadian accounts
  | 'rrsp' | 'tfsa' | 'rrif' | 'resp' | 'non_registered'

export interface InvestmentProduct {
  id: string
  name: string
  ticker?: string
  asset_class: string
  sub_class?: string
  risk_rating: string
  exp_return: number
  expense_ratio: number
  minimum_investment: number
  jurisdictions: Jurisdiction[]
  account_types: AccountType[]
  description: string
  prospectus_url?: string
  is_active: boolean
  created_by?: string
  created_at?: string
  updated_at?: string
}

// ─── Compliance Types ───────────────────────────────────────────────────────

export type ComplianceStatus = 'pending' | 'approved' | 'rejected' | 'needs_modification'
export type ComplianceSourceType = 'chat_response' | 'scenario_projection' | 'advisor_note' | 'escalation_resolution'

export interface ComplianceReviewItem {
  id: string
  source_type: ComplianceSourceType
  source_id: string
  user_id: string
  ai_response: string
  context: string
  auto_flagged: boolean
  flag_reason?: string
  risk_level: EscalationPriority
  status: ComplianceStatus
  reviewer_id?: string
  review_notes?: string
  reviewed_at?: string
  created_at: string
}

// ─── Regulatory Types ───────────────────────────────────────────────────────

export type RegulatoryCategory = 
  | 'contribution_limits' 
  | 'withdrawal_rules' 
  | 'tax_treatment' 
  | 'government_benefits' 
  | 'age_requirements'

export interface RegulatoryRule {
  id: string
  jurisdiction: Jurisdiction
  category: RegulatoryCategory
  title: string
  description: string
  current_values: Record<string, any>
  account_types: AccountType[]
  age_requirements?: { min?: number; max?: number }
  income_requirements?: { min?: number; max?: number }
  effective_date: string
  source_url?: string
  last_verified: string
  is_active: boolean
  updated_by: string
  updated_at: string
}

// ─── UI State Types ─────────────────────────────────────────────────────────

export type AppView = 
  // Client views
  | 'dashboard' | 'portfolio' | 'activity' | 'planning'
  // Advisor views  
  | 'advisor-dashboard' | 'advisor-clients' | 'advisor-appointments' | 'advisor-chat'
  // Admin views
  | 'admin-dashboard' | 'admin-products' | 'admin-compliance' | 'admin-regulatory' | 'admin-users'

export interface AppState {
  currentPersona: UserRole
  activeView: AppView
  selectedClient?: ClientProfile
  currentAdvisor?: AdvisorProfile
  currentAdmin?: AdminProfile
}
