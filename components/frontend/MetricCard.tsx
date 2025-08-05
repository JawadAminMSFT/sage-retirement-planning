import React from "react"
import { cn } from "@/lib/utils"
import { ArrowUp, ArrowDown } from "lucide-react"

// MetricCard Props
export interface MetricCardProps {
  title: string
  primaryValue: string | number
  primaryUnit?: string
  secondaryLabel?: string
  secondaryValue?: string | number
  baselineLabel?: string
  baselineValue?: string | number
  deltaValue?: number
  deltaUnit?: "%" | "currency" | "years" | string
  deltaAriaLabel?: string
  description?: string
  variant?: "positive" | "negative" | "neutral" | "goal" | "duration"
  icon?: React.ReactNode
  loading?: boolean
  progressPercent?: number // 0-100 optional ring
  className?: string
  children?: React.ReactNode
}

// Helper to format delta with sign
function formatDelta(value?: number, unit?: string) {
  if (value === undefined || value === null) return null
  const sign = value > 0 ? "+" : value < 0 ? "-" : ""
  const abs = Math.abs(value)
  if (unit === "%") return `${sign}${abs}${unit}`
  if (unit === "currency") return `${sign}$${abs.toLocaleString()}`
  if (unit === "years") return `${sign}${abs} yr${abs === 1 ? "" : "s"}`
  return `${sign}${abs}${unit || ""}`
}

// Choose semantic styling based on variant or delta sign
function variantFromDelta(delta?: number, explicit?: MetricCardProps["variant"]): MetricCardProps["variant"] {
  if (explicit) return explicit
  if (delta === undefined) return "neutral"
  if (delta > 0) return "positive"
  if (delta < 0) return "negative"
  return "neutral"
}

const variantStyles: Record<NonNullable<MetricCardProps['variant']>, string> = {
  positive: "bg-gradient-to-br from-emerald-50 to-emerald-100/40 border-emerald-200 hover:shadow-emerald-200/40",
  negative: "bg-gradient-to-br from-red-50 to-red-100/40 border-red-200 hover:shadow-red-200/40",
  neutral: "bg-gradient-to-br from-gray-50 to-gray-100/40 border-gray-200 hover:shadow-gray-200/40",
  goal: "bg-gradient-to-br from-teal-50 to-teal-100/40 border-teal-200 hover:shadow-teal-200/40",
  duration: "bg-gradient-to-br from-lime-50 to-lime-100/40 border-lime-200 hover:shadow-lime-200/40",
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  primaryValue,
  primaryUnit,
  secondaryLabel,
  secondaryValue,
  baselineLabel,
  baselineValue,
  deltaValue,
  deltaUnit,
  deltaAriaLabel,
  description,
  variant,
  icon,
  loading,
  progressPercent,
  className,
  children
}) => {
  const effectiveVariant = variantFromDelta(deltaValue, variant) || 'neutral'
  const deltaFormatted = formatDelta(deltaValue, deltaUnit)

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-5 transition-all duration-300 backdrop-blur-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background focus-within:ring-emerald-500",
        "hover:shadow-md",
        variantStyles[effectiveVariant],
        className
      )}
      role="group"
      aria-label={title}
    >
      {/* Top Row */}
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <div className="w-7 h-7 flex items-center justify-center rounded-md bg-white/60 shadow-sm ring-1 ring-black/5">
            {icon}
          </div>
        )}
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase flex-1">{title}</h3>
        {progressPercent !== undefined && progressPercent !== null && (
          <div
            className="relative w-9 h-9 shrink-0"
            role="img"
            aria-label={`Progress ${progressPercent}%`}
          >
            <svg viewBox="0 0 36 36" className="w-9 h-9">
              <circle
                className="text-gray-200"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                r="16"
                cx="18"
                cy="18"
              />
              <circle
                className={cn(
                  "transition-all duration-500 ease-out",
                  effectiveVariant === "negative" && "text-red-500",
                  effectiveVariant === "positive" && "text-emerald-500",
                  effectiveVariant === "goal" && "text-teal-500",
                  effectiveVariant === "duration" && "text-lime-500",
                  effectiveVariant === "neutral" && "text-gray-500"
                )}
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                fill="transparent"
                r="16"
                cx="18"
                cy="18"
                strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 * (1 - Math.min(Math.max(progressPercent, 0), 100) / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-700 leading-none">{Math.round(progressPercent)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Primary Value */}
      <div className="mb-2">
        <div className="text-3xl font-bold text-gray-900 tracking-tight leading-none">
          {primaryValue}
          {primaryUnit && <span className="text-sm ml-1 font-medium text-gray-400">{primaryUnit}</span>}
        </div>
        {deltaFormatted && (
          <div
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold mt-1.5 px-2 py-0.5 rounded-md",
              deltaValue && deltaValue > 0 && "bg-emerald-100 text-emerald-700",
              deltaValue && deltaValue < 0 && "bg-red-100 text-red-700",
              deltaValue === 0 && "bg-gray-100 text-gray-600"
            )}
            aria-label={deltaAriaLabel || `Change: ${deltaFormatted}`}
          >
            {deltaValue && deltaValue !== 0 ? (
              deltaValue > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
            ) : null}
            <span>{deltaFormatted}</span>
          </div>
        )}
      </div>

      {/* Baseline vs Secondary Comparison */}
      {(baselineLabel || secondaryLabel) && (
        <div className="flex gap-4 text-xs mb-1">
          {baselineLabel && (
            <div>
              <span className="text-gray-400">{baselineLabel}</span>{" "}
              <span className="text-gray-700 font-medium">{baselineValue}</span>
            </div>
          )}
          {secondaryLabel && (
            <div>
              <span className="text-gray-400">{secondaryLabel}</span>{" "}
              <span className="text-gray-700 font-medium">{secondaryValue}</span>
            </div>
          )}
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}

      {children}

      {loading && (
        <div className="absolute inset-0 rounded-xl bg-white/60 backdrop-blur-sm flex items-center justify-center text-xs font-medium text-gray-600">
          Loading...
        </div>
      )}
    </div>
  )
}

export default MetricCard
