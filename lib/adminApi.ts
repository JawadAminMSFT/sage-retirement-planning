/**
 * Admin API client functions.
 * Handles all admin-specific API calls.
 */

import type {
  AdminProfile,
  AdminDashboardMetrics,
  InvestmentProduct,
  ComplianceReviewItem,
  ComplianceStatus,
  RegulatoryRule,
  RegulatoryCategory,
  Jurisdiction,
} from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8172'

// ─── Admin Profile ──────────────────────────────────────────────────────────

export async function getAdmin(adminId: string): Promise<AdminProfile> {
  const response = await fetch(`${API_BASE_URL}/admin/${adminId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch admin: ${response.statusText}`)
  }
  return response.json()
}

export async function getAdminDashboard(): Promise<AdminDashboardMetrics> {
  const response = await fetch(`${API_BASE_URL}/admin/dashboard/metrics`)
  if (!response.ok) {
    throw new Error(`Failed to fetch admin dashboard: ${response.statusText}`)
  }
  return response.json()
}

// ─── Product Catalog ────────────────────────────────────────────────────────

export interface GetProductsOptions {
  riskRating?: 'low' | 'medium' | 'high'
  jurisdiction?: Jurisdiction
  assetClass?: string
}

export async function getProducts(options: GetProductsOptions = {}): Promise<{ products: InvestmentProduct[]; count: number }> {
  const params = new URLSearchParams()
  if (options.riskRating) params.set('risk_rating', options.riskRating)
  if (options.jurisdiction) params.set('jurisdiction', options.jurisdiction)
  if (options.assetClass) params.set('asset_class', options.assetClass)

  const url = `${API_BASE_URL}/admin/products${params.toString() ? '?' + params : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`)
  }
  return response.json()
}

export async function getProduct(productId: string): Promise<InvestmentProduct> {
  const response = await fetch(`${API_BASE_URL}/admin/products/${productId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.statusText}`)
  }
  return response.json()
}

// ─── Compliance Review ──────────────────────────────────────────────────────

export interface GetComplianceOptions {
  status?: ComplianceStatus
  riskLevel?: 'low' | 'medium' | 'high' | 'urgent'
}

export async function getComplianceQueue(options: GetComplianceOptions = {}): Promise<ComplianceReviewItem[]> {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.riskLevel) params.set('risk_level', options.riskLevel)

  const url = `${API_BASE_URL}/admin/compliance/queue${params.toString() ? '?' + params : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch compliance queue: ${response.statusText}`)
  }
  return response.json()
}

export async function getPendingCompliance(): Promise<ComplianceReviewItem[]> {
  const response = await fetch(`${API_BASE_URL}/admin/compliance/queue/pending`)
  if (!response.ok) {
    throw new Error(`Failed to fetch pending compliance: ${response.statusText}`)
  }
  return response.json()
}

export async function getComplianceItem(itemId: string): Promise<ComplianceReviewItem> {
  const response = await fetch(`${API_BASE_URL}/admin/compliance/${itemId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch compliance item: ${response.statusText}`)
  }
  return response.json()
}

export async function reviewComplianceItem(
  itemId: string,
  reviewerId: string,
  review: { status: ComplianceStatus; review_notes: string }
): Promise<ComplianceReviewItem> {
  const response = await fetch(`${API_BASE_URL}/admin/compliance/${itemId}/review?reviewer_id=${reviewerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  })
  if (!response.ok) {
    throw new Error(`Failed to review compliance item: ${response.statusText}`)
  }
  return response.json()
}

export async function getComplianceStats(): Promise<{
  total: number
  by_status: Record<string, number>
  by_risk_level: Record<string, number>
  avg_review_time_hours: number | null
}> {
  const response = await fetch(`${API_BASE_URL}/admin/compliance/stats`)
  if (!response.ok) {
    throw new Error(`Failed to fetch compliance stats: ${response.statusText}`)
  }
  return response.json()
}

// ─── Regulatory Rules ───────────────────────────────────────────────────────

export interface GetRegulatoryOptions {
  jurisdiction?: Jurisdiction
  category?: RegulatoryCategory
}

export async function getRegulatoryRules(options: GetRegulatoryOptions = {}): Promise<RegulatoryRule[]> {
  const params = new URLSearchParams()
  if (options.jurisdiction) params.set('jurisdiction', options.jurisdiction)
  if (options.category) params.set('category', options.category)

  const url = `${API_BASE_URL}/admin/regulatory${params.toString() ? '?' + params : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch regulatory rules: ${response.statusText}`)
  }
  return response.json()
}

export async function getRegulatoryRulesByJurisdiction(jurisdiction: Jurisdiction): Promise<RegulatoryRule[]> {
  const response = await fetch(`${API_BASE_URL}/admin/regulatory/${jurisdiction}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch regulatory rules: ${response.statusText}`)
  }
  return response.json()
}

export async function getRegulatoryRule(ruleId: string): Promise<RegulatoryRule> {
  const response = await fetch(`${API_BASE_URL}/admin/regulatory/rule/${ruleId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch regulatory rule: ${response.statusText}`)
  }
  return response.json()
}

export async function createRegulatoryRule(
  createdBy: string,
  rule: Omit<RegulatoryRule, 'id' | 'last_verified' | 'is_active' | 'updated_by' | 'updated_at'>
): Promise<RegulatoryRule> {
  const response = await fetch(`${API_BASE_URL}/admin/regulatory?created_by=${createdBy}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  })
  if (!response.ok) {
    throw new Error(`Failed to create regulatory rule: ${response.statusText}`)
  }
  return response.json()
}

export async function updateRegulatoryRule(
  ruleId: string,
  updatedBy: string,
  updates: Partial<RegulatoryRule>
): Promise<RegulatoryRule> {
  const response = await fetch(`${API_BASE_URL}/admin/regulatory/rule/${ruleId}?updated_by=${updatedBy}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!response.ok) {
    throw new Error(`Failed to update regulatory rule: ${response.statusText}`)
  }
  return response.json()
}

// ─── User Management ────────────────────────────────────────────────────────

export interface AllUsers {
  clients: Array<{ id: string; name: string; email: string; role: 'client'; advisor_id?: string }>
  advisors: Array<{ id: string; name: string; email: string; role: 'advisor' }>
  admins: Array<{ id: string; name: string; email: string; role: 'admin' }>
}

export async function getAllUsers(): Promise<AllUsers> {
  const response = await fetch(`${API_BASE_URL}/admin/users`)
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`)
  }
  return response.json()
}

export async function assignAdvisorToClient(clientId: string, advisorId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${clientId}/assign-advisor`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ advisor_id: advisorId }),
  })
  if (!response.ok) {
    throw new Error(`Failed to assign advisor: ${response.statusText}`)
  }
  return response.json()
}

// ─── Mock Data for Development ──────────────────────────────────────────────

export const MOCK_ADMIN: AdminProfile = {
  id: 'admin-system',
  email: 'admin@sagefinancial.com',
  name: 'System Administrator',
  role: 'admin',
  permissions: ['manage_products', 'review_compliance', 'manage_users', 'view_analytics'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
}

export const MOCK_ADMIN_METRICS: AdminDashboardMetrics = {
  total_clients: 7,
  total_advisors: 2,
  pending_compliance_reviews: 3,
  high_risk_reviews: 1,
  active_products: 15,
  active_regulatory_rules: 16,
}
