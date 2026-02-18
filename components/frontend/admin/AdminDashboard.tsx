"use client"

import React, { useState, useEffect } from "react"
import {
  Package,
  Shield,
  Users,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Save,
  X,
  DollarSign,
  Globe,
  Briefcase,
} from "lucide-react"
import type { AdminProfile, RegulatoryRule, ComplianceReviewItem, InvestmentProduct } from "@/lib/types"
import { Card, EmptyState, Skeleton } from "@/components/frontend/shared/UIComponents"
import { PoweredByLabel } from "@/components/frontend/shared/PoweredByLabel"

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdminDashboardProps {
  admin: AdminProfile
  isMockMode?: boolean
}

type AdminView = "dashboard" | "products" | "compliance" | "regulatory" | "users"

interface DashboardMetrics {
  total_products: number
  active_products: number
  pending_compliance: number
  high_risk_items: number
  total_users: number
  total_advisors: number
  regulatory_rules: number
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_METRICS: DashboardMetrics = {
  total_products: 24,
  active_products: 21,
  pending_compliance: 5,
  high_risk_items: 2,
  total_users: 156,
  total_advisors: 8,
  regulatory_rules: 16,
}

const MOCK_PRODUCTS: InvestmentProduct[] = [
  {
    id: "prod-1",
    name: "Vanguard Total Stock Market Index",
    ticker: "VTSAX",
    asset_class: "equity",
    sub_class: "US Large Cap Blend",
    risk_rating: "medium",
    exp_return: 0.08,
    expense_ratio: 0.0004,
    minimum_investment: 3000,
    jurisdictions: ["US"],
    account_types: ["401k", "roth_401k", "traditional_ira", "roth_ira", "brokerage"],
    description: "Broad US equity market exposure",
    is_active: true,
    created_by: "admin-alice",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2026-01-10T14:30:00Z",
  },
  {
    id: "prod-2",
    name: "Vanguard Total Bond Market Index",
    ticker: "VBTLX",
    asset_class: "fixed_income",
    sub_class: "US Investment Grade",
    risk_rating: "low",
    exp_return: 0.04,
    expense_ratio: 0.0005,
    minimum_investment: 3000,
    jurisdictions: ["US"],
    account_types: ["401k", "roth_401k", "traditional_ira", "roth_ira", "brokerage"],
    description: "Broad US bond market exposure",
    is_active: true,
    created_by: "admin-alice",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2026-01-10T14:30:00Z",
  },
  {
    id: "prod-3",
    name: "iShares S&P/TSX 60 Index ETF",
    ticker: "XIU",
    asset_class: "equity",
    sub_class: "Canadian Large Cap",
    risk_rating: "medium",
    exp_return: 0.07,
    expense_ratio: 0.0018,
    minimum_investment: 0,
    jurisdictions: ["CA"],
    account_types: ["rrsp", "tfsa", "non_registered"],
    description: "Large-cap Canadian equity exposure",
    is_active: true,
    created_by: "admin-alice",
    created_at: "2024-02-01T09:00:00Z",
    updated_at: "2026-01-15T11:00:00Z",
  },
  {
    id: "prod-4",
    name: "Target Date 2040 Fund",
    ticker: "TDF2040",
    asset_class: "target_date",
    risk_rating: "medium",
    exp_return: 0.065,
    expense_ratio: 0.0012,
    minimum_investment: 1000,
    jurisdictions: ["US", "CA"],
    account_types: ["401k", "roth_401k", "traditional_ira", "roth_ira", "rrsp"],
    description: "Automatic glide path to 2040 retirement",
    is_active: true,
    created_by: "admin-bob",
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2026-01-20T09:00:00Z",
  },
  {
    id: "prod-5",
    name: "Real Estate Investment Trust Fund",
    ticker: "REIT",
    asset_class: "alternatives",
    sub_class: "Real Estate",
    risk_rating: "high",
    exp_return: 0.09,
    expense_ratio: 0.0025,
    minimum_investment: 5000,
    jurisdictions: ["US"],
    account_types: ["brokerage", "traditional_ira", "roth_ira"],
    description: "Diversified REIT exposure",
    is_active: false,
    created_by: "admin-alice",
    created_at: "2024-04-01T10:00:00Z",
    updated_at: "2026-02-01T15:00:00Z",
  },
]

const MOCK_COMPLIANCE: ComplianceReviewItem[] = [
  {
    id: "comp-1",
    source_type: "chat_response",
    source_id: "msg-12345",
    user_id: "demo-user",
    ai_response: "Based on your income level, you should definitely max out your Roth IRA before contributing to a traditional IRA.",
    context: "Client asked about IRA contribution strategy",
    auto_flagged: true,
    flag_reason: "Potential unsuitable advice - did not consider full financial picture",
    risk_level: "medium",
    status: "pending",
    created_at: "2026-02-10T14:30:00Z",
  },
  {
    id: "comp-2",
    source_type: "chat_response",
    source_id: "msg-12346",
    user_id: "pre-retiree-ca",
    ai_response: "I recommend you withdraw from your RRSP before age 65 to minimize OAS clawback.",
    context: "Client asked about retirement income strategy",
    auto_flagged: true,
    flag_reason: "Tax advice that may not be suitable without full analysis",
    risk_level: "high",
    status: "pending",
    created_at: "2026-02-09T10:15:00Z",
  },
  {
    id: "comp-3",
    source_type: "scenario_projection",
    source_id: "scenario-789",
    user_id: "mid-career",
    ai_response: "This aggressive portfolio allocation will guarantee higher returns over the long term.",
    context: "Client ran scenario with 90% stock allocation",
    auto_flagged: true,
    flag_reason: "Used 'guarantee' language which is misleading",
    risk_level: "high",
    status: "pending",
    created_at: "2026-02-08T16:45:00Z",
  },
  {
    id: "comp-4",
    source_type: "advisor_note",
    source_id: "note-456",
    user_id: "advisor-jane",
    ai_response: "Recommended client pursue backdoor Roth strategy without documenting income verification.",
    context: "Advisor note about high-income client",
    auto_flagged: false,
    risk_level: "low",
    status: "approved",
    reviewer_id: "admin-alice",
    review_notes: "Reviewed - advisor confirmed income verification was done verbally.",
    reviewed_at: "2026-02-07T09:00:00Z",
    created_at: "2026-02-06T11:30:00Z",
  },
  {
    id: "comp-5",
    source_type: "chat_response",
    source_id: "msg-12347",
    user_id: "young-professional",
    ai_response: "At your age, it makes sense to focus on growth investments. Here are some options to consider...",
    context: "Client asked about investment options",
    auto_flagged: false,
    risk_level: "low",
    status: "pending",
    created_at: "2026-02-05T13:20:00Z",
  },
]

// Mock regulatory rules data
const MOCK_REGULATORY_RULES: RegulatoryRule[] = [
  {
    id: "rule-401k-2026",
    jurisdiction: "US",
    category: "contribution_limits",
    title: "401(k) Contribution Limits 2026",
    description: "Annual contribution limits for 401(k) plans. For 2026, the employee contribution limit is $23,500. Catch-up contribution for age 50+ is $7,500. Enhanced catch-up for ages 60-63 is $11,250 under SECURE 2.0.",
    current_values: {
      standard_limit: 23500,
      catchup_50plus: 7500,
      enhanced_catchup_60_63: 11250,
      employer_combined_limit: 70000,
    },
    account_types: ["401k", "roth_401k"],
    effective_date: "2026-01-01",
    source_url: "https://www.irs.gov/retirement-plans",
    last_verified: "2025-11-15",
    is_active: true,
    updated_by: "admin-alice",
    updated_at: "2025-11-15T14:30:00Z",
  },
  {
    id: "rule-ira-2026",
    jurisdiction: "US",
    category: "contribution_limits",
    title: "IRA Contribution Limits 2026",
    description: "Annual contribution limits for Traditional and Roth IRAs. For 2026, the IRA contribution limit is $7,000. Catch-up contribution for age 50+ is $1,000. Roth IRA income limits: Single filers $161,000-$176,000, MFJ $240,000-$250,000.",
    current_values: {
      annual_limit: 7000,
      catchup_50plus: 1000,
      roth_income_limit_single: [161000, 176000],
      roth_income_limit_mfj: [240000, 250000],
    },
    account_types: ["traditional_ira", "roth_ira"],
    effective_date: "2026-01-01",
    source_url: "https://www.irs.gov/retirement-plans/ira-contribution-limits",
    last_verified: "2025-11-15",
    is_active: true,
    updated_by: "admin-alice",
    updated_at: "2025-11-15T14:30:00Z",
  },
  {
    id: "rule-rmd-2026",
    jurisdiction: "US",
    category: "withdrawal_rules",
    title: "Required Minimum Distributions",
    description: "RMD rules and start ages under SECURE 2.0. RMD start age is 73 for those born 1951-1959, and 75 for those born 1960 or later. Failure to take RMD results in 25% excise tax (reduced from 50%), or 10% if corrected timely.",
    current_values: {
      start_age_born_1951_1959: 73,
      start_age_born_1960_plus: 75,
      penalty_rate: 0.25,
      corrected_penalty_rate: 0.10,
    },
    account_types: ["traditional_ira", "401k"],
    age_requirements: { min: 73 },
    effective_date: "2024-01-01",
    source_url: "https://www.irs.gov/retirement-plans/required-minimum-distributions",
    last_verified: "2025-06-15",
    is_active: true,
    updated_by: "admin-alice",
    updated_at: "2025-06-15T09:00:00Z",
  },
  {
    id: "rule-rrsp-2026",
    jurisdiction: "CA",
    category: "contribution_limits",
    title: "RRSP Contribution Limits 2026",
    description: "Annual RRSP contribution room for Canadian clients. For 2026, the RRSP contribution limit is 18% of prior year earned income up to $32,490. Unused contribution room carries forward indefinitely. Must convert to RRIF by December 31 of the year turning 71.",
    current_values: {
      percentage_of_income: 0.18,
      maximum_limit: 32490,
      rrif_conversion_age: 71,
    },
    account_types: ["rrsp"],
    effective_date: "2026-01-01",
    source_url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html",
    last_verified: "2025-11-20",
    is_active: true,
    updated_by: "admin-alice",
    updated_at: "2025-11-20T11:00:00Z",
  },
  {
    id: "rule-tfsa-2026",
    jurisdiction: "CA",
    category: "contribution_limits",
    title: "TFSA Contribution Limits 2026",
    description: "Tax-Free Savings Account annual limits. For 2026, the TFSA annual contribution limit is $7,000. Cumulative room since 2009 (for those 18+ since 2009) is $95,000. Withdrawals are added back to contribution room in the following year.",
    current_values: {
      annual_limit: 7000,
      cumulative_limit_since_2009: 95000,
    },
    account_types: ["tfsa"],
    age_requirements: { min: 18 },
    effective_date: "2026-01-01",
    source_url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html",
    last_verified: "2025-11-20",
    is_active: true,
    updated_by: "admin-alice",
    updated_at: "2025-11-20T11:00:00Z",
  },
  {
    id: "rule-cpp-2026",
    jurisdiction: "CA",
    category: "government_benefits",
    title: "CPP/QPP Benefits 2026",
    description: "Canada Pension Plan claiming rules and benefits. Maximum CPP retirement benefit at age 65 is $1,364.60/month in 2026. Early claiming (age 60) reduces benefits by 0.6%/month (36% at 60). Deferral past 65 increases by 0.7%/month up to age 70 (42% increase).",
    current_values: {
      max_benefit_at_65: 1364.60,
      early_reduction_per_month: 0.006,
      deferral_increase_per_month: 0.007,
      earliest_age: 60,
      latest_age: 70,
    },
    account_types: [],
    age_requirements: { min: 60, max: 70 },
    effective_date: "2026-01-01",
    source_url: "https://www.canada.ca/en/services/benefits/publicpensions/cpp.html",
    last_verified: "2026-01-05",
    is_active: true,
    updated_by: "admin-alice",
    updated_at: "2026-01-05T09:00:00Z",
  },
  {
    id: "rule-oas-2026",
    jurisdiction: "CA",
    category: "government_benefits",
    title: "OAS Benefits and Clawback 2026",
    description: "Old Age Security rules and recovery tax thresholds. OAS eligibility starts at age 65. Maximum monthly benefit in Q1 2026 is approximately $727. OAS clawback begins at net income of $90,997 and is fully clawed back at ~$148,000.",
    current_values: {
      max_monthly_benefit: 727,
      clawback_threshold: 90997,
      full_clawback_threshold: 148000,
    },
    account_types: [],
    age_requirements: { min: 65 },
    effective_date: "2026-01-01",
    source_url: "https://www.canada.ca/en/services/benefits/publicpensions/oas.html",
    last_verified: "2026-01-05",
    is_active: true,
    updated_by: "admin-alice",
    updated_at: "2026-01-05T09:00:00Z",
  },
  {
    id: "rule-ss-2026",
    jurisdiction: "US",
    category: "government_benefits",
    title: "Social Security Benefits 2026",
    description: "Social Security claiming rules and benefit calculations. Full Retirement Age (FRA) is 67 for those born 1960+. Early claiming at 62 reduces benefits up to 30%. Delayed retirement credits of 8%/year up to age 70.",
    current_values: {
      full_retirement_age: 67,
      earliest_claiming_age: 62,
      latest_claiming_age: 70,
      early_reduction_max: 0.30,
      delayed_credit_per_year: 0.08,
    },
    account_types: [],
    age_requirements: { min: 62, max: 70 },
    effective_date: "2026-01-01",
    source_url: "https://www.ssa.gov/benefits/retirement/planner/agereduction.html",
    last_verified: "2025-12-01",
    is_active: true,
    updated_by: "admin-alice",
    updated_at: "2025-12-01T14:00:00Z",
  },
]

// ─── Helper Functions ───────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(2) + "%"
}

function getRiskColor(risk: string): string {
  const colors: Record<string, string> = {
    very_low: "bg-green-100 text-green-700",
    low: "bg-blue-100 text-blue-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    very_high: "bg-red-100 text-red-700",
  }
  return colors[risk] || colors.medium
}

function getAssetClassLabel(assetClass: string): string {
  const labels: Record<string, string> = {
    equity: "Equity",
    fixed_income: "Fixed Income",
    balanced: "Balanced",
    alternatives: "Alternatives",
    cash: "Cash",
    target_date: "Target Date",
  }
  return labels[assetClass] || assetClass
}

// ─── Product Catalog Component ──────────────────────────────────────────────

interface ProductCatalogProps {
  isMockMode?: boolean
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ isMockMode }) => {
  const [products, setProducts] = useState<InvestmentProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterJurisdiction, setFilterJurisdiction] = useState<"all" | "US" | "CA">("all")
  const [filterAssetClass, setFilterAssetClass] = useState<string>("all")
  const [showInactive, setShowInactive] = useState(false)
  const [editingProduct, setEditingProduct] = useState<InvestmentProduct | null>(null)
  
  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setProducts(MOCK_PRODUCTS)
      setIsLoading(false)
    }, 500)
  }, [isMockMode])
  
  const filteredProducts = products.filter(p => {
    if (!showInactive && !p.is_active) return false
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !p.ticker?.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterJurisdiction !== "all" && !p.jurisdictions.includes(filterJurisdiction)) return false
    if (filterAssetClass !== "all" && p.asset_class !== filterAssetClass) return false
    return true
  })
  
  const toggleProductActive = (productId: string) => {
    setProducts(products.map(p => 
      p.id === productId ? { ...p, is_active: !p.is_active } : p
    ))
  }
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Product Catalog</h2>
        <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4 inline mr-2" />
          Add Product
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={filterJurisdiction}
          onChange={(e) => setFilterJurisdiction(e.target.value as typeof filterJurisdiction)}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="all">All Jurisdictions</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
        <select
          value={filterAssetClass}
          onChange={(e) => setFilterAssetClass(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="all">All Asset Classes</option>
          <option value="equity">Equity</option>
          <option value="fixed_income">Fixed Income</option>
          <option value="balanced">Balanced</option>
          <option value="alternatives">Alternatives</option>
          <option value="target_date">Target Date</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          Show Inactive
        </label>
      </div>
      
      {/* Product List */}
      <div className="space-y-3">
        {filteredProducts.map(product => (
          <Card key={product.id} className={`p-4 ${!product.is_active ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{product.name}</span>
                  {product.ticker && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {product.ticker}
                    </span>
                  )}
                  {!product.is_active && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Inactive</span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                    {getAssetClassLabel(product.asset_class)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getRiskColor(product.risk_rating)}`}>
                    {product.risk_rating.replace("_", " ")} risk
                  </span>
                  {product.jurisdictions.map(j => (
                    <span key={j} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {j === "US" ? "🇺🇸 US" : "🇨🇦 CA"}
                    </span>
                  ))}
                </div>
                
                <p className="text-sm text-gray-500">{product.description}</p>
                
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Return: {formatPercent(product.exp_return)}</span>
                  <span>Expense: {formatPercent(product.expense_ratio)}</span>
                  <span>Min: ${product.minimum_investment.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleProductActive(product.id)}
                  className={`p-2 rounded-lg hover:bg-gray-100 ${product.is_active ? "text-green-600" : "text-gray-400"}`}
                  title={product.is_active ? "Deactivate" : "Activate"}
                >
                  {product.is_active ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => setEditingProduct(product)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Compliance Queue Component ─────────────────────────────────────────────

interface ComplianceQueueProps {
  isMockMode?: boolean
}

const ComplianceQueue: React.FC<ComplianceQueueProps> = ({ isMockMode }) => {
  const [items, setItems] = useState<ComplianceReviewItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
  const [selectedItem, setSelectedItem] = useState<ComplianceReviewItem | null>(null)
  
  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setItems(MOCK_COMPLIANCE)
      setIsLoading(false)
    }, 500)
  }, [isMockMode])
  
  const filteredItems = items.filter(item => {
    if (statusFilter === "all") return true
    return item.status === statusFilter
  })
  
  const handleReview = (itemId: string, decision: "approved" | "rejected", notes: string) => {
    setItems(items.map(item => 
      item.id === itemId
        ? {
            ...item,
            status: decision,
            reviewer_id: "admin-alice",
            review_notes: notes,
            reviewed_at: new Date().toISOString(),
          }
        : item
    ))
    setSelectedItem(null)
  }
  
  const pendingCount = items.filter(i => i.status === "pending").length
  const highRiskCount = items.filter(i => i.status === "pending" && i.risk_level === "high").length
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Compliance Review Queue</h2>
            <PoweredByLabel product="Foundry IQ" variant="light" />
          </div>
          <p className="text-sm text-gray-500">
            {pendingCount} pending • {highRiskCount} high risk
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: "pending", label: "Pending" },
          { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" },
          { value: "all", label: "All" },
        ].map(filter => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value as typeof statusFilter)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              statusFilter === filter.value
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      
      {/* Items List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-8 h-8" />}
          title="No items to review"
          description="All compliance items have been reviewed."
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <Card 
              key={item.id} 
              className={`p-4 cursor-pointer hover:border-indigo-200 transition-colors ${
                item.risk_level === "high" ? "border-l-4 border-l-red-500" :
                item.risk_level === "medium" ? "border-l-4 border-l-amber-500" :
                ""
              }`}
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.risk_level === "high" ? "bg-red-100 text-red-700" :
                      item.risk_level === "medium" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {item.risk_level} risk
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {item.source_type.replace("_", " ")}
                    </span>
                    {item.auto_flagged && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        Auto-flagged
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      item.status === "approved" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-900 line-clamp-2 mb-1">{item.ai_response}</p>
                  
                  {item.flag_reason && (
                    <p className="text-xs text-amber-600 mb-2">⚠️ {item.flag_reason}</p>
                  )}
                  
                  <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                </div>
                
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {/* Review Modal */}
      {selectedItem && (
        <ComplianceReviewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onReview={handleReview}
        />
      )}
    </div>
  )
}

interface ComplianceReviewModalProps {
  item: ComplianceReviewItem
  onClose: () => void
  onReview: (itemId: string, decision: "approved" | "rejected", notes: string) => void
}

const ComplianceReviewModal: React.FC<ComplianceReviewModalProps> = ({ item, onClose, onReview }) => {
  const [notes, setNotes] = useState(item.review_notes || "")
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Compliance Review</h2>
            <PoweredByLabel product="Foundry IQ" variant="light" />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              item.risk_level === "high" ? "bg-red-100 text-red-700" :
              item.risk_level === "medium" ? "bg-amber-100 text-amber-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {item.risk_level} risk
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
              {item.source_type.replace("_", " ")}
            </span>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">AI Response</h3>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-900">{item.ai_response}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Context</h3>
            <p className="text-sm text-gray-600">{item.context}</p>
          </div>
          
          {item.flag_reason && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <h3 className="text-sm font-medium text-amber-700 mb-1">Flag Reason</h3>
              <p className="text-sm text-amber-600">{item.flag_reason}</p>
            </div>
          )}
          
          {item.status === "pending" && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Review Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your review notes..."
                className="w-full p-3 border rounded-lg text-sm resize-none"
                rows={3}
              />
            </div>
          )}
          
          {item.status !== "pending" && item.review_notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Review Notes</h3>
              <p className="text-sm text-gray-600">{item.review_notes}</p>
              <p className="text-xs text-gray-500 mt-1">
                Reviewed by {item.reviewer_id} on {item.reviewed_at && formatDate(item.reviewed_at)}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Close
          </button>
          {item.status === "pending" && (
            <>
              <button
                onClick={() => onReview(item.id, "rejected", notes)}
                className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                <XCircle className="w-4 h-4 inline mr-1" />
                Reject
              </button>
              <button
                onClick={() => onReview(item.id, "approved", notes)}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Approve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Regulatory Rules View ──────────────────────────────────────────────────

interface RegulatoryRulesViewProps {
  isMockMode?: boolean
}

const RegulatoryRulesView: React.FC<RegulatoryRulesViewProps> = ({ isMockMode = true }) => {
  const [rules, setRules] = useState<RegulatoryRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<"all" | "US" | "CA">("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  
  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setRules(MOCK_REGULATORY_RULES)
      setIsLoading(false)
    }, 500)
  }, [isMockMode])
  
  const filteredRules = rules.filter(rule => {
    if (selectedJurisdiction !== "all" && rule.jurisdiction !== selectedJurisdiction) return false
    if (selectedCategory !== "all" && rule.category !== selectedCategory) return false
    return true
  })
  
  const categories = [...new Set(rules.map(r => r.category))]
  
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      contribution_limits: "Contribution Limits",
      withdrawal_rules: "Withdrawal Rules",
      tax_treatment: "Tax Treatment",
      government_benefits: "Government Benefits",
      age_requirements: "Age Requirements",
    }
    return labels[category] || category
  }
  
  const getJurisdictionFlag = (jurisdiction: string): string => {
    return jurisdiction === "US" ? "🇺🇸" : "🇨🇦"
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Regulatory Rules</h2>
            <PoweredByLabel product="Foundry IQ" variant="light" />
          </div>
          <p className="text-sm text-gray-500">US and Canadian retirement planning regulations</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex gap-2">
          {["all", "US", "CA"].map(j => (
            <button
              key={j}
              onClick={() => setSelectedJurisdiction(j as typeof selectedJurisdiction)}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                selectedJurisdiction === j
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {j === "all" ? "All Jurisdictions" : j === "US" ? "🇺🇸 US" : "🇨🇦 Canada"}
            </button>
          ))}
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg bg-white"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
          ))}
        </select>
      </div>
      
      {/* Rules List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : filteredRules.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-8 h-8" />}
          title="No rules found"
          description="No regulatory rules match your filters."
        />
      ) : (
        <div className="space-y-3">
          {filteredRules.map(rule => (
            <Card key={rule.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getJurisdictionFlag(rule.jurisdiction)}</span>
                      <h3 className="font-medium text-gray-900">{rule.title}</h3>
                      {rule.is_active ? (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{rule.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>Category: {getCategoryLabel(rule.category)}</span>
                      <span>Effective: {formatDate(rule.effective_date)}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedRule === rule.id ? "rotate-90" : ""}`} />
                </div>
              </div>
              
              {expandedRule === rule.id && (
                <div className="px-4 pb-4 border-t bg-gray-50">
                  <div className="mt-3 p-3 bg-white rounded-lg border">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Rule Details</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{rule.description}</p>
                    {rule.current_values && Object.keys(rule.current_values).length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {Object.entries(rule.current_values).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="text-gray-500">{key.replace(/_/g, ' ')}: </span>
                            <span className="font-medium text-gray-700">
                              {typeof value === 'number' ? value.toLocaleString() : JSON.stringify(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {rule.source_url && (
                    <a
                      href={rule.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <Globe className="w-4 h-4" />
                      View Source
                    </a>
                  )}
                  <div className="flex justify-end gap-2 mt-3">
                    <button className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
                      <Edit2 className="w-4 h-4 inline mr-1" />
                      Edit
                    </button>
                    <button className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Admin Dashboard ───────────────────────────────────────────────────

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  admin,
  isMockMode = true,
}) => {
  const [currentView, setCurrentView] = useState<AdminView>("dashboard")
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setMetrics(MOCK_METRICS)
      setIsLoading(false)
    }, 500)
  }, [isMockMode])
  
  const navItems = [
    { id: "dashboard", label: "Overview", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "products", label: "Products", icon: <Package className="w-4 h-4" /> },
    { id: "compliance", label: "Compliance", icon: <Shield className="w-4 h-4" /> },
    { id: "regulatory", label: "Regulatory", icon: <Briefcase className="w-4 h-4" /> },
    { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
  ]
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b">
        <h1 className="text-xl font-semibold text-gray-900">Admin Console</h1>
        <p className="text-sm text-gray-500">System administration and compliance management</p>
      </div>
      
      {/* Navigation */}
      <div className="flex-shrink-0 border-b bg-white">
        <div className="flex gap-1 px-4 overflow-x-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as AdminView)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                currentView === item.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentView === "dashboard" && (
          <div className="max-w-6xl mx-auto">
            {/* Metrics Grid */}
            {isLoading ? (
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : metrics && (
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Active Products</p>
                        <p className="text-xl font-semibold text-gray-900">{metrics.active_products}</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pending Compliance</p>
                        <p className="text-xl font-semibold text-gray-900">{metrics.pending_compliance}</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">High Risk Items</p>
                        <p className="text-xl font-semibold text-gray-900">{metrics.high_risk_items}</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Users</p>
                        <p className="text-xl font-semibold text-gray-900">{metrics.total_users}</p>
                      </div>
                    </div>
                  </Card>
                </div>
                
                {/* Quick Actions */}
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
                <div className="grid grid-cols-3 gap-4">
                  <Card 
                    className="p-4 cursor-pointer hover:border-indigo-200 transition-colors"
                    onClick={() => setCurrentView("compliance")}
                  >
                    <h3 className="font-medium text-gray-900 mb-1">Review Compliance Queue</h3>
                    <p className="text-sm text-gray-500">{metrics.pending_compliance} items pending review</p>
                  </Card>
                  <Card 
                    className="p-4 cursor-pointer hover:border-indigo-200 transition-colors"
                    onClick={() => setCurrentView("products")}
                  >
                    <h3 className="font-medium text-gray-900 mb-1">Manage Products</h3>
                    <p className="text-sm text-gray-500">{metrics.active_products} active products</p>
                  </Card>
                  <Card 
                    className="p-4 cursor-pointer hover:border-indigo-200 transition-colors"
                    onClick={() => setCurrentView("regulatory")}
                  >
                    <h3 className="font-medium text-gray-900 mb-1">Update Regulatory Rules</h3>
                    <p className="text-sm text-gray-500">{metrics.regulatory_rules} rules configured</p>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}
        
        {currentView === "products" && (
          <div className="max-w-4xl mx-auto">
            <ProductCatalog isMockMode={isMockMode} />
          </div>
        )}
        
        {currentView === "compliance" && (
          <div className="max-w-4xl mx-auto">
            <ComplianceQueue isMockMode={isMockMode} />
          </div>
        )}
        
        {currentView === "regulatory" && (
          <div className="max-w-4xl mx-auto">
            <RegulatoryRulesView isMockMode={isMockMode} />
          </div>
        )}
        
        {currentView === "users" && (
          <div className="max-w-4xl mx-auto">
            <EmptyState
              icon={<Users className="w-8 h-8" />}
              title="User Management"
              description="Manage advisors, clients, and system users. Coming soon."
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
