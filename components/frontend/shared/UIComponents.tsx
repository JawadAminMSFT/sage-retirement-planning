"use client"

import React from "react"
import type { ClientStatus, RiskAppetite, Jurisdiction } from "@/lib/types"

// ─── Status Indicator ───────────────────────────────────────────────────────

interface StatusIndicatorProps {
  status: ClientStatus
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

const statusConfig: Record<ClientStatus, { color: string; label: string; bgColor: string }> = {
  healthy: {
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50 text-emerald-700",
    label: "Healthy",
  },
  needs_attention: {
    color: "bg-amber-500",
    bgColor: "bg-amber-50 text-amber-700",
    label: "Needs Attention",
  },
  critical: {
    color: "bg-red-500",
    bgColor: "bg-red-50 text-red-700",
    label: "Critical",
  },
}

const sizeClasses = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  showLabel = false,
  size = "md",
}) => {
  const config = statusConfig[status]
  
  if (showLabel) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor}`}>
        <span className={`${sizeClasses[size]} rounded-full ${config.color}`} />
        {config.label}
      </span>
    )
  }
  
  return (
    <span
      className={`inline-block ${sizeClasses[size]} rounded-full ${config.color}`}
      title={config.label}
    />
  )
}

// ─── Risk Badge ─────────────────────────────────────────────────────────────

interface RiskBadgeProps {
  risk: RiskAppetite
  size?: "sm" | "md"
}

const riskConfig: Record<RiskAppetite, { color: string; label: string }> = {
  low: {
    color: "bg-blue-50 text-blue-700 border-blue-200",
    label: "Low Risk",
  },
  medium: {
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    label: "Medium Risk",
  },
  high: {
    color: "bg-red-50 text-red-700 border-red-200",
    label: "High Risk",
  },
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ risk, size = "md" }) => {
  const config = riskConfig[risk]
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"
  
  return (
    <span className={`inline-flex items-center rounded-md border font-medium ${config.color} ${sizeClass}`}>
      {config.label}
    </span>
  )
}

// ─── Jurisdiction Badge ─────────────────────────────────────────────────────

interface JurisdictionBadgeProps {
  jurisdiction: Jurisdiction
  showFlag?: boolean
  size?: "sm" | "md"
}

const jurisdictionConfig: Record<Jurisdiction, { flag: string; label: string; color: string }> = {
  US: {
    flag: "🇺🇸",
    label: "United States",
    color: "bg-blue-50 text-blue-700",
  },
  CA: {
    flag: "🇨🇦",
    label: "Canada",
    color: "bg-red-50 text-red-700",
  },
}

export const JurisdictionBadge: React.FC<JurisdictionBadgeProps> = ({
  jurisdiction,
  showFlag = true,
  size = "md",
}) => {
  const config = jurisdictionConfig[jurisdiction]
  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-xs px-2 py-1"
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-md font-medium ${config.color} ${sizeClass}`}>
      {showFlag && <span>{config.flag}</span>}
      <span>{jurisdiction}</span>
    </span>
  )
}

// ─── Empty State ────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  )
}

// ─── Card Container ─────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: "none" | "sm" | "md" | "lg"
  onClick?: () => void
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  padding = "md",
  onClick,
}) => {
  const baseClasses = `bg-white rounded-xl border border-gray-100 shadow-sm ${paddingClasses[padding]} ${className}`
  
  if (onClick) {
    return (
      <div 
        className={`${baseClasses} cursor-pointer`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
      >
        {children}
      </div>
    )
  }
  
  return (
    <div className={baseClasses}>
      {children}
    </div>
  )
}

// ─── Metric Display ─────────────────────────────────────────────────────────

interface MetricDisplayProps {
  label: string
  value: string | number
  subValue?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  icon?: React.ReactNode
}

export const MetricDisplay: React.FC<MetricDisplayProps> = ({
  label,
  value,
  subValue,
  trend,
  trendValue,
  icon,
}) => {
  const trendColors = {
    up: "text-emerald-600",
    down: "text-red-600",
    neutral: "text-gray-500",
  }
  
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {(subValue || trendValue) && (
          <p className="text-sm">
            {subValue && <span className="text-gray-500">{subValue}</span>}
            {trendValue && trend && (
              <span className={`ml-1 ${trendColors[trend]}`}>
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
