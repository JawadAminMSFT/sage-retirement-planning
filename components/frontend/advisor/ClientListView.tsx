"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Search,
  Filter,
  ChevronRight,
  ArrowUpDown,
  X,
  Users,
} from "lucide-react"
import type { ClientProfile, ClientStatus, RiskAppetite, Jurisdiction } from "@/lib/types"
import { getAdvisorClients, getMockClientsForAdvisor, type GetClientsOptions } from "@/lib/advisorApi"
import { Card, StatusIndicator, RiskBadge, JurisdictionBadge, EmptyState, Skeleton } from "@/components/frontend/shared/UIComponents"

// ─── Types ──────────────────────────────────────────────────────────────────

interface ClientListViewProps {
  advisorId: string
  onSelectClient: (client: ClientProfile) => void
  isMockMode?: boolean
}

type SortField = "name" | "aum" | "status" | "age"
type SortOrder = "asc" | "desc"

interface Filters {
  status?: ClientStatus
  risk?: RiskAppetite
  jurisdiction?: Jurisdiction
  search: string
}

// ─── Format Helpers ─────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// ─── Filter Bar ─────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  sortField: SortField
  sortOrder: SortOrder
  onSortChange: (field: SortField) => void
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  sortField,
  sortOrder,
  onSortChange,
}) => {
  const [showFilters, setShowFilters] = useState(false)
  
  const activeFilterCount = [filters.status, filters.risk, filters.jurisdiction].filter(Boolean).length
  
  return (
    <div className="space-y-3">
      {/* Search and Filter Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-colors text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showFilters || activeFilterCount > 0
              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
              : "border-gray-200 hover:bg-gray-50 text-gray-600"
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            <select
              value={filters.status || ""}
              onChange={(e) => onFiltersChange({
                ...filters,
                status: e.target.value as ClientStatus || undefined,
              })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="">All</option>
              <option value="healthy">Healthy</option>
              <option value="needs_attention">Needs Attention</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Risk:</span>
            <select
              value={filters.risk || ""}
              onChange={(e) => onFiltersChange({
                ...filters,
                risk: e.target.value as RiskAppetite || undefined,
              })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Jurisdiction Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Region:</span>
            <select
              value={filters.jurisdiction || ""}
              onChange={(e) => onFiltersChange({
                ...filters,
                jurisdiction: e.target.value as Jurisdiction || undefined,
              })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
            >
              <option value="">All</option>
              <option value="US">🇺🇸 United States</option>
              <option value="CA">🇨🇦 Canada</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">Sort by:</span>
            {(["name", "aum", "status", "age"] as SortField[]).map((field) => (
              <button
                key={field}
                onClick={() => onSortChange(field)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  sortField === field
                    ? "bg-indigo-100 text-indigo-700"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {sortField === field && (
                  <ArrowUpDown className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => onFiltersChange({
                search: filters.search,
                status: undefined,
                risk: undefined,
                jurisdiction: undefined,
              })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Client Row ─────────────────────────────────────────────────────────────

interface ClientRowProps {
  client: ClientProfile
  onClick: () => void
}

const ClientRow: React.FC<ClientRowProps> = ({ client, onClick }) => {
  const totalAssets = client.investment_assets + client.current_cash
  const savingsPerMonth = (client.salary * client.yearly_savings_rate) / 12
  
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-indigo-700">
          {client.name.split(" ").map(n => n[0]).join("")}
        </span>
      </div>

      {/* Name & Status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{client.name}</span>
          <StatusIndicator status={client.status} showLabel size="sm" />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-500">{client.age} years old</span>
          <span className="text-gray-300">•</span>
          <span className="text-sm text-gray-500">Retires at {client.target_retire_age}</span>
        </div>
      </div>

      {/* Badges */}
      <div className="hidden md:flex items-center gap-2">
        <RiskBadge risk={client.risk_appetite} size="sm" />
        <JurisdictionBadge jurisdiction={client.jurisdiction} size="sm" />
      </div>

      {/* Assets */}
      <div className="text-right hidden sm:block">
        <p className="font-semibold text-gray-900">{formatCurrency(totalAssets)}</p>
        <p className="text-xs text-gray-500">
          +{formatCurrency(savingsPerMonth)}/mo
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
    </button>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const ClientListView: React.FC<ClientListViewProps> = ({
  advisorId,
  onSelectClient,
  isMockMode = true,
}) => {
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: undefined,
    risk: undefined,
    jurisdiction: undefined,
  })
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  useEffect(() => {
    loadClients()
  }, [advisorId, isMockMode])

  const loadClients = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use mock data in mock mode
      if (isMockMode) {
        const mockData = getMockClientsForAdvisor(advisorId)
        setClients(mockData)
        return
      }
      
      const options: GetClientsOptions = {
        sortBy: sortField,
        sortOrder: sortOrder,
      }
      
      const data = await getAdvisorClients(advisorId, options)
      setClients(data)
    } catch (err) {
      console.error("Failed to load clients:", err)
      setError("Failed to load clients")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle sort change
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // Apply client-side filtering
  const filteredClients = useMemo(() => {
    let result = [...clients]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
      )
    }

    // Status filter
    if (filters.status) {
      result = result.filter(c => c.status === filters.status)
    }

    // Risk filter
    if (filters.risk) {
      result = result.filter(c => c.risk_appetite === filters.risk)
    }

    // Jurisdiction filter
    if (filters.jurisdiction) {
      result = result.filter(c => c.jurisdiction === filters.jurisdiction)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "aum":
          comparison = (a.investment_assets + a.current_cash) - (b.investment_assets + b.current_cash)
          break
        case "status":
          const statusOrder = { critical: 0, needs_attention: 1, healthy: 2 }
          comparison = statusOrder[a.status] - statusOrder[b.status]
          break
        case "age":
          comparison = a.age - b.age
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [clients, filters, sortField, sortOrder])

  // Calculate summary stats
  const totalAUM = useMemo(() => {
    return clients.reduce((sum, c) => sum + c.investment_assets + c.current_cash, 0)
  }, [clients])

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500 mt-1">
              {clients.length} clients • {formatCurrency(totalAUM)} total AUM
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        {/* Client List */}
        <Card padding="none">
          {filteredClients.length > 0 ? (
            <div>
              {filteredClients.map(client => (
                <ClientRow
                  key={client.id}
                  client={client}
                  onClick={() => onSelectClient(client)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="w-6 h-6" />}
              title={filters.search || filters.status || filters.risk || filters.jurisdiction
                ? "No clients match your filters"
                : "No clients yet"
              }
              description={filters.search || filters.status || filters.risk || filters.jurisdiction
                ? "Try adjusting your search or filter criteria"
                : "Clients assigned to you will appear here"
              }
              action={
                filters.search || filters.status || filters.risk || filters.jurisdiction ? (
                  <button
                    onClick={() => setFilters({ search: "", status: undefined, risk: undefined, jurisdiction: undefined })}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Clear all filters
                  </button>
                ) : undefined
              }
            />
          )}
        </Card>

        {/* Results count */}
        {filteredClients.length > 0 && filteredClients.length !== clients.length && (
          <p className="text-sm text-gray-500 text-center">
            Showing {filteredClients.length} of {clients.length} clients
          </p>
        )}
      </div>
    </div>
  )
}

export default ClientListView
