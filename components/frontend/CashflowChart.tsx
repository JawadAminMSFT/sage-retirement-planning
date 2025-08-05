"use client"

import React from "react"
import { abbreviateNumber } from "@/lib/analysis"
import type { CashflowDisplay } from "@/lib/analysis"

interface CashflowChartProps {
  cashflows: CashflowDisplay[]
}

/** SVG area + line chart for projected cash flows */
export const CashflowChart: React.FC<CashflowChartProps> = ({ cashflows }) => {
  if (!cashflows.length)
    return <p className="text-sm text-gray-500">No cash flow data.</p>

  const filtered = cashflows.filter((d) => d.year <= 25)
  const dataMax = Math.max(...filtered.map((d) => d.amount), 0)

  const niceMax = (v: number) => {
    if (v <= 0) return 1
    const pow = Math.pow(10, Math.floor(Math.log10(v)))
    const n = v / pow
    let m: number
    if (n <= 1) m = 1
    else if (n <= 2) m = 2
    else if (n <= 5) m = 5
    else m = 10
    const candidate = m * pow
    return candidate < v ? 2 * candidate : candidate
  }

  const yMax = niceMax(dataMax)
  const height = 170
  const paddingLeft = 60
  const paddingRight = 8
  const paddingBottom = 28
  const paddingTop = 8
  const innerHeight = height - paddingTop - paddingBottom
  const years = filtered.map((d) => d.year)
  const lastYear = years[years.length - 1]
  const xMax = Math.min(Math.ceil(lastYear / 5) * 5, 25)
  const width = 520
  const innerWidth = width - paddingLeft - paddingRight

  const points = filtered.map((d) => ({
    x: paddingLeft + (d.year / xMax) * innerWidth,
    y: paddingTop + (1 - d.amount / yMax) * innerHeight,
  }))

  const buildPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i]
      const p1 = pts[i + 1]
      const midX = (p0.x + p1.x) / 2
      d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`
    }
    return d
  }

  const linePath = buildPath(points)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${paddingTop + innerHeight} Z`
  const yTicks = 5
  const xTicks = Array.from(
    { length: Math.floor(xMax / 5) + 1 },
    (_, i) => i * 5,
  )

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-describedby="cashflow-desc"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="cfArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.35" />
          <stop offset="85%" stopColor="#16a34a" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Y grid & labels */}
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const ratio = i / yTicks
        const y = paddingTop + innerHeight - ratio * innerHeight
        const value = ratio * yMax
        return (
          <g key={i}>
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={paddingLeft - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-gray-600 font-medium"
              style={{ fontSize: "11px", fontFamily: "inherit" }}
            >
              ${abbreviateNumber(value)}
            </text>
          </g>
        )
      })}
      {/* X axis ticks */}
      {xTicks.map((yr, i) => (
        <g key={i}>
          <text
            x={paddingLeft + (yr / xMax) * innerWidth}
            y={height - 6}
            textAnchor="middle"
            className="fill-gray-700 font-medium"
            style={{ fontSize: "11px", fontFamily: "inherit" }}
          >
            Yr {yr}
          </text>
        </g>
      ))}
      {/* Area */}
      <path d={areaPath} fill="url(#cfArea)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="#16a34a" strokeWidth={3} />
      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#16a34a" />
          <title>{`Year ${filtered[i].year}: $${filtered[i].amount.toLocaleString()}`}</title>
        </g>
      ))}
    </svg>
  )
}

export default CashflowChart
