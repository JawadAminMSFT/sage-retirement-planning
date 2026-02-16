"use client"

import React from "react"

// ─── Microsoft AI Stack Labels ──────────────────────────────────────────────

export type MicrosoftAIProduct =
  | "Copilot"
  | "Fabric IQ"
  | "Foundry IQ"
  | "Microsoft Graph"
  | "Work IQ"

interface PoweredByLabelProps {
  product: MicrosoftAIProduct
  variant?: "light" | "dark" | "muted" | "inline"
  className?: string
}

const PRODUCT_COLORS: Record<MicrosoftAIProduct, { bg: string; text: string; dot: string }> = {
  Copilot: { bg: "bg-violet-50", text: "text-violet-500", dot: "bg-violet-400" },
  "Fabric IQ": { bg: "bg-teal-50", text: "text-teal-500", dot: "bg-teal-400" },
  "Foundry IQ": { bg: "bg-blue-50", text: "text-blue-500", dot: "bg-blue-400" },
  "Microsoft Graph": { bg: "bg-orange-50", text: "text-orange-500", dot: "bg-orange-400" },
  "Work IQ": { bg: "bg-pink-50", text: "text-pink-500", dot: "bg-pink-400" },
}

const DARK_COLORS: Record<MicrosoftAIProduct, { text: string; dot: string }> = {
  Copilot: { text: "text-violet-300", dot: "bg-violet-400" },
  "Fabric IQ": { text: "text-teal-300", dot: "bg-teal-400" },
  "Foundry IQ": { text: "text-blue-300", dot: "bg-blue-400" },
  "Microsoft Graph": { text: "text-orange-300", dot: "bg-orange-400" },
  "Work IQ": { text: "text-pink-300", dot: "bg-pink-400" },
}

export const PoweredByLabel: React.FC<PoweredByLabelProps> = ({
  product,
  variant = "muted",
  className = "",
}) => {
  const colors = PRODUCT_COLORS[product]
  const darkColors = DARK_COLORS[product]

  if (variant === "dark") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wide ${darkColors.text} opacity-70 ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${darkColors.dot} opacity-80`} />
        {product}
      </span>
    )
  }

  if (variant === "light") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        {product}
      </span>
    )
  }

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-medium ${colors.text} opacity-60 ${className}`}
      >
        <span className={`w-1 h-1 rounded-full ${colors.dot}`} />
        {product}
      </span>
    )
  }

  // muted (default)
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-medium text-gray-400 tracking-wide opacity-70 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} opacity-60`} />
      {product}
    </span>
  )
}

export default PoweredByLabel
