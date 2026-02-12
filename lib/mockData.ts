import type { UserProfile, ChatResponse, HealthResponse, ScenariosResponse } from "./api"

// Mock User Profiles
export const mockUserProfiles: UserProfile[] = [
  {
    id: "demo-user",
    name: "John Doe",
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
  },
  {
    id: "young-professional",
    name: "Sarah Chen",
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
  },
  {
    id: "mid-career",
    name: "Michael Rodriguez",
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
  },
  {
    id: "conservative-saver",
    name: "Linda Thompson",
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
  },
  {
    id: "high-earner",
    name: "David Kim",
    age: 38,
    current_cash: 100000,
    investment_assets: 800000,
    yearly_savings_rate: 0.25,
    salary: 180000,
    portfolio: { stocks: 0.7, bonds: 0.2, alternatives: 0.1 },
    risk_appetite: "high",
    target_retire_age: 55,
    target_monthly_income: 8000,
    description: "High earner targeting early retirement",
  },
]

// Mock Quick Scenarios
export const mockQuickScenarios: string[] = [
  "What if I retire 2 years earlier?",
  "How would a market crash affect my plan?",
  "Should I increase my savings rate by 5%?",
  "What if I need $100k for healthcare costs?",
  "How does inflation impact my retirement income?",
  "What if I work part-time in retirement?",
  "Should I pay off my mortgage before retiring?",
  "What if I inherit $200k from my parents?",
  "How would changing jobs affect my retirement?",
  "What if I want to retire abroad?",
]

// Mock Follow-up Questions
export const mockFollowUpQuestions: string[] = [
  "What's the minimum increase that makes a difference?",
  "How does this compare to working longer?",
  "Can I automate these additional contributions?",
  "What if I can only do this for 3 years?",
  "How can I make my plan more crash-resistant?",
  "Should I increase my bond allocation?",
  "What are the biggest risks to consider?",
  "How much should I save in an HSA?",
]

// Mock Analysis Data Templates
export const mockAnalysisTemplates = {
  savingsRateIncrease: {
    title: "Increased Savings Rate (+5%)",
    riskLevel: "Low Risk" as const,
    successRate: 92,
    successRateChange: 7,
    additionalSavings: { amount: 450, change: "5% increase" },
    retirementIncome: { amount: 3650, change: "+$450" },
    extraYears: { years: 6, description: "income duration" },
    products: [
      {
        name: "Target Date 2030",
        allocation: 60,
        return: "7.8% return",
        description: "Age-appropriate growth",
        icon: "🎯",
      },
      {
        name: "International Index",
        allocation: 20,
        return: "7.2% return",
        description: "Diversification",
        icon: "📈",
      },
      {
        name: "Bond Aggregate",
        allocation: 20,
        return: "4% return",
        description: "Risk reduction",
        icon: "🛡️",
      },
    ],
    cashflows: [
      { year: 1, amount: 58000 },
      { year: 2, amount: 60000 },
      { year: 3, amount: 62000 },
      { year: 4, amount: 65000 },
      { year: 5, amount: 68000 },
    ],
  },

  earlyRetirement: {
    title: "Early Retirement (Age 63)",
    riskLevel: "Medium Risk" as const,
    successRate: 78,
    successRateChange: -7,
    retirementIncome: { amount: 2850, change: "-$350" },
    extraYears: { years: -2, description: "reduced accumulation" },
    products: [
      {
        name: "Growth Portfolio",
        allocation: 70,
        return: "8.5% return",
        description: "Higher growth for shorter timeline",
        icon: "📈",
      },
      {
        name: "International Growth",
        allocation: 20,
        return: "9% return",
        description: "Global diversification",
        icon: "🌍",
      },
      {
        name: "Bond Index",
        allocation: 10,
        return: "4% return",
        description: "Stability component",
        icon: "🛡️",
      },
    ],
    cashflows: [
      { year: 1, amount: 40000 },
      { year: 2, amount: 42000 },
      { year: 3, amount: 44000 },
      { year: 4, amount: 46000 },
      { year: 5, amount: 48000 },
    ],
  },

  marketCrash: {
    title: "Market Crash Resilience",
    riskLevel: "Medium Risk" as const,
    successRate: 82,
    successRateChange: -3,
    retirementIncome: { amount: 3050, change: "-$150" },
    extraYears: { years: -1, description: "recovery period" },
    products: [
      {
        name: "Defensive Balanced Portfolio",
        allocation: 40,
        return: "6.5% return",
        description: "Crash-resistant allocation",
        icon: "🛡️",
      },
      {
        name: "Bond Aggregate",
        allocation: 40,
        return: "4% return",
        description: "Stability during volatility",
        icon: "📊",
      },
      {
        name: "Value Stocks",
        allocation: 20,
        return: "7.5% return",
        description: "Recovery potential",
        icon: "💎",
      },
    ],
    cashflows: [
      { year: 1, amount: 38000 },
      { year: 2, amount: 41000 },
      { year: 3, amount: 44000 },
      { year: 4, amount: 47000 },
      { year: 5, amount: 50000 },
    ],
  },

  healthcareCosts: {
    title: "Healthcare Cost Impact",
    riskLevel: "Medium Risk" as const,
    successRate: 79,
    successRateChange: -6,
    additionalSavings: { amount: 288, change: "healthcare buffer" },
    retirementIncome: { amount: 2367, change: "-$833" },
    products: [
      {
        name: "Healthcare-Focused Portfolio",
        allocation: 40,
        return: "7% return",
        description: "Healthcare sector exposure",
        icon: "🏥",
      },
      {
        name: "Stable Value Fund",
        allocation: 30,
        return: "4.5% return",
        description: "Predictable returns",
        icon: "📈",
      },
      {
        name: "Healthcare Sector ETF",
        allocation: 30,
        return: "8% return",
        description: "Sector-specific growth",
        icon: "💊",
      },
    ],
    cashflows: [
      { year: 1, amount: 35000 },
      { year: 2, amount: 37000 },
      { year: 3, amount: 39000 },
      { year: 4, amount: 41000 },
      { year: 5, amount: 43000 },
    ],
  },

  default: {
    title: "Current Scenario Analysis",
    riskLevel: "Medium Risk" as const,
    successRate: 85,
    retirementIncome: { amount: 3200, change: "baseline" },
    products: [
      {
        name: "Balanced Portfolio",
        allocation: 50,
        return: "7% return",
        description: "Balanced growth approach",
        icon: "⚖️",
      },
      {
        name: "Bond Index",
        allocation: 30,
        return: "4.2% return",
        description: "Income generation",
        icon: "📊",
      },
      {
        name: "International Index",
        allocation: 20,
        return: "7.2% return",
        description: "Global diversification",
        icon: "🌍",
      },
    ],
    cashflows: [
      { year: 1, amount: 42000 },
      { year: 2, amount: 44500 },
      { year: 3, amount: 47000 },
      { year: 4, amount: 49500 },
      { year: 5, amount: 52000 },
    ],
  },
}

// Mock streaming simulation
async function* simulateMockStreaming(message: string, profile: UserProfile) {
  const statusUpdates = [
    { status: "Starting analysis..." },
    { status: "Thinking..." },
    { status: "Fetching investment products..." },
    { status: "Running calculations..." },
    { status: "Generating recommendations..." },
    { status: "Finalizing analysis..." },
  ]

  // Emit status updates
  for (const update of statusUpdates) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    yield {
      type: "status" as const,
      data: update,
      timestamp: Date.now(),
    }
  }

  // Generate final response
  const finalResponse = generateMockChatResponse(message, profile)

  // Stream content in chunks
  const words = finalResponse.response.split(" ")
  let accumulatedContent = ""

  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join(" ") + " "
    accumulatedContent += chunk

    await new Promise((resolve) => setTimeout(resolve, 100))
    yield {
      type: "content" as const,
      data: { content: chunk },
      timestamp: Date.now(),
    }
  }

  // Send final complete response
  yield {
    type: "complete" as const,
    data: {
      response: finalResponse.response,
      analysis: finalResponse.analysis,
      status: "completed",
    },
    timestamp: Date.now(),
  }
}

// Mock Chat Response Generator
export const generateMockChatResponse = (message: string, profile: UserProfile): ChatResponse => {
  let analysisTemplate = mockAnalysisTemplates.default
  let responseText = ""

  // Determine response based on message content
  if (message.toLowerCase().includes("savings rate")) {
    analysisTemplate = mockAnalysisTemplates.savingsRateIncrease
    responseText = `Great question, ${profile.name}! I've analyzed the impact of increasing your savings rate by 5%. Based on your current profile (age ${profile.age}, ${profile.risk_appetite} risk tolerance), this is one of the most powerful levers you have for improving your retirement outcome.`
  } else if (message.toLowerCase().includes("retire") && message.toLowerCase().includes("earlier")) {
    analysisTemplate = mockAnalysisTemplates.earlyRetirement
    responseText = `I've analyzed retiring 2 years earlier for your profile, ${profile.name}. Given your current age of ${profile.age} and target retirement age of ${profile.target_retire_age}, early retirement is appealing but comes with important trade-offs to consider.`
  } else if (message.toLowerCase().includes("market crash") || message.toLowerCase().includes("crash")) {
    analysisTemplate = mockAnalysisTemplates.marketCrash
    responseText = `Excellent question about market resilience, ${profile.name}! I've analyzed how a significant market crash would affect your retirement plan. Based on your ${profile.risk_appetite} risk tolerance and current portfolio allocation, here's what you should know.`
  } else if (message.toLowerCase().includes("healthcare")) {
    analysisTemplate = mockAnalysisTemplates.healthcareCosts
    responseText = `Healthcare costs are a crucial consideration, ${profile.name}. I've analyzed the impact of needing an additional $100k for healthcare expenses during retirement, considering your current financial situation.`
  } else {
    responseText = `I've analyzed your scenario, ${profile.name}. Based on your profile (${profile.risk_appetite} risk tolerance, $${profile.salary.toLocaleString()} salary), I've created a customized projection that considers your current financial situation.`
  }

  return {
    response: responseText,
    analysis: {
      scenario: profile,
      recommended_changes: {
        diversification: "Optimize portfolio allocation",
        savings: "Consider increasing contributions",
        risk_management: "Review risk tolerance annually",
      },
      predictions: {
        metrics: {
          monthly_income: analysisTemplate.retirementIncome?.amount || 3200,
          success_rate_pct: analysisTemplate.successRate,
          risk_level: analysisTemplate.riskLevel.toLowerCase().replace(" risk", "") as "low" | "medium" | "high",
          flexibility: "High",
          time_horizon_years: profile.target_retire_age - profile.age,
        },
        deltas: analysisTemplate.additionalSavings
          ? {
              additional_savings_monthly: analysisTemplate.additionalSavings.amount,
              retirement_income_monthly: analysisTemplate.retirementIncome?.amount || 3200,
              retirement_income_delta: analysisTemplate.retirementIncome?.amount
                ? analysisTemplate.retirementIncome.amount - 3200
                : 0,
              success_rate_delta_pct: analysisTemplate.successRateChange || 0,
              extra_years_income_duration: analysisTemplate.extraYears?.years || 0,
            }
          : undefined,
        products: analysisTemplate.products.map((p) => ({
          name: p.name,
          allocation: p.allocation / 100,
          exp_return: Number.parseFloat(p.return.replace(/[^\d.]/g, "")) / 100,
          risk_rating: analysisTemplate.riskLevel.toLowerCase().replace(" risk", ""),
          asset_class: p.name.toLowerCase().replace(/\s+/g, "_"),
        })),
        cashflows: analysisTemplate.cashflows.map((c) => ({
          year: c.year,
          end_assets: c.amount,
        })),
      },
      follow_ups: mockFollowUpQuestions.slice(0, 4),
      alternatives: [
        "Conservative approach with lower risk",
        "Aggressive growth strategy",
        "Balanced portfolio optimization",
        "Alternative investment consideration",
      ],
      considerations: `This analysis is tailored for ${profile.name} based on your ${profile.risk_appetite} risk tolerance and ${profile.target_retire_age - profile.age}-year time horizon. The recommendations consider your current financial situation and retirement goals.`,
    },
    status: "completed",
  }
}

// Export the streaming function
export { simulateMockStreaming }

// ─── Mock Scenario Projection ───────────────────────────────────────────────

import type { ScenarioProjectionRequest, ScenarioProjectionResponse } from "./api"

export function generateMockProjection(
  request: ScenarioProjectionRequest
): ScenarioProjectionResponse {
  const { scenario_description, timeframe_months, current_portfolio } = request
  const scenario = scenario_description.toLowerCase()

  // Time multiplier for projections
  const timeMultiplier = timeframe_months / 12

  // Base market return assumptions
  let marketReturn = 0.07 * timeMultiplier
  let contributionBoost = 0

  // Parse scenario for keywords to adjust projections
  if (scenario.includes("increase") && scenario.includes("contribution")) {
    contributionBoost = 0.03 * timeMultiplier
  }
  if (scenario.includes("max") || scenario.includes("maximize")) {
    contributionBoost = 0.05 * timeMultiplier
  }
  if (scenario.includes("15%") || scenario.includes("20%")) {
    contributionBoost = 0.04 * timeMultiplier
  }
  if (scenario.includes("market crash") || scenario.includes("downturn") || scenario.includes("drop")) {
    marketReturn = -0.15 * timeMultiplier
  }
  if (scenario.includes("recession")) {
    marketReturn = -0.10 * timeMultiplier
  }
  if (scenario.includes("bull") || scenario.includes("growth")) {
    marketReturn = 0.12 * timeMultiplier
  }
  if (scenario.includes("stop") && scenario.includes("contribution")) {
    contributionBoost = -0.03 * timeMultiplier
  }
  if (scenario.includes("roth") || scenario.includes("ira")) {
    contributionBoost += 0.01 * timeMultiplier
  }
  if (scenario.includes("401k") || scenario.includes("401(k)")) {
    contributionBoost += 0.015 * timeMultiplier
  }

  const totalChangePercent = (marketReturn + contributionBoost) * 100
  const totalChange = Math.round(current_portfolio.total_value * (marketReturn + contributionBoost))
  const projectedTotal = current_portfolio.total_value + totalChange

  // Project accounts
  const projectedAccounts = current_portfolio.accounts.map((acc) => {
    // 401k and Roth get extra boost from contribution scenarios
    let accountBoost = marketReturn + contributionBoost
    if (acc.name.includes("401") && scenario.includes("401")) {
      accountBoost += 0.02 * timeMultiplier
    }
    if (acc.name.includes("Roth") && scenario.includes("roth")) {
      accountBoost += 0.015 * timeMultiplier
    }

    const change = Math.round(acc.balance * accountBoost)
    return {
      id: acc.id,
      name: acc.name,
      current_value: acc.balance,
      projected_value: acc.balance + change,
      change,
      change_percent: +(accountBoost * 100).toFixed(2),
    }
  })

  // Project holdings
  const projectedHoldings = current_portfolio.holdings.map((h) => {
    // Stocks more volatile in crash scenarios
    let holdingReturn = marketReturn + contributionBoost
    if (scenario.includes("crash") || scenario.includes("drop")) {
      if (h.symbol === "VTI" || h.symbol === "VXUS" || h.symbol === "VGT") {
        holdingReturn = marketReturn * 1.3 // More volatile
      } else if (h.symbol === "BND") {
        holdingReturn = 0.02 * timeMultiplier // Bonds stable
      }
    }

    const change = Math.round(h.value * holdingReturn)
    const projectedValue = h.value + change
    const projectedAllocation = +(
      (projectedValue / projectedTotal) *
      100
    ).toFixed(1)

    return {
      symbol: h.symbol,
      name: h.name,
      current_value: h.value,
      projected_value: projectedValue,
      current_allocation: h.allocation,
      projected_allocation: projectedAllocation,
      change,
      change_percent: +(holdingReturn * 100).toFixed(2),
    }
  })

  // Generate summary based on scenario
  let summary = ""
  let headline = ""
  if (scenario.includes("increase") && scenario.includes("contribution")) {
    headline = "Increased contributions accelerate growth"
    summary = `By increasing your contribution rate, your portfolio would grow an additional ${formatCurrency(Math.abs(totalChange))} over ${timeframe_months} months. This assumes ${(marketReturn / timeMultiplier * 100).toFixed(0)}% annual market returns and accounts for the 2026 contribution limits.`
  } else if (scenario.includes("max")) {
    headline = "Maximized contributions boost retirement"
    summary = `Maximizing your retirement contributions would boost your portfolio by ${formatCurrency(Math.abs(totalChange))} over ${timeframe_months} months. The tax-advantaged growth compounds significantly over your remaining working years.`
  } else if (scenario.includes("crash") || scenario.includes("drop")) {
    headline = "Market downturn impacts portfolio value"
    summary = `In a market downturn scenario, your portfolio could decline by ${formatCurrency(Math.abs(totalChange))} (${Math.abs(totalChangePercent).toFixed(1)}%) over ${timeframe_months} months. However, continued contributions would buy shares at lower prices, benefiting long-term returns.`
  } else if (scenario.includes("stop") && scenario.includes("contribution")) {
    headline = "Paused contributions slow growth"
    summary = `Pausing contributions would slow your portfolio growth. You would have ${formatCurrency(Math.abs(totalChange))} less over ${timeframe_months} months compared to maintaining your current savings rate.`
  } else {
    headline = `Portfolio ${totalChange >= 0 ? "growth" : "decline"} projected`
    summary = `Based on your scenario, your portfolio would ${totalChange >= 0 ? "grow by" : "decline by"} ${formatCurrency(Math.abs(totalChange))} (${Math.abs(totalChangePercent).toFixed(1)}%) over ${timeframe_months} months. This projection accounts for market returns and any changes to your contribution strategy.`
  }

  // Generate structured risks and opportunities based on scenario
  const risks: { title: string; detail: string; severity: "high" | "medium" | "low" }[] = []
  const opportunities: { title: string; detail: string; impact: "high" | "medium" | "low" }[] = []
  const action_items: { action: string; priority: "high" | "medium" | "low"; category: "contribution" | "allocation" | "tax" | "planning" }[] = []
  let key_factors: string[] = []

  if (scenario.includes("increase") || scenario.includes("max")) {
    risks.push(
      { title: "Reduced Take-Home Pay", detail: "Increased contributions will lower your monthly disposable income. Ensure you maintain an adequate emergency fund.", severity: "medium" },
      { title: "Market Volatility", detail: "Market fluctuations could temporarily reduce account values, though long-term trends favor staying invested.", severity: "low" },
    )
    opportunities.push(
      { title: "Tax-Advantaged Compounding", detail: "Pre-tax contributions grow tax-deferred, significantly accelerating wealth accumulation over time.", impact: "high" },
      { title: "Stronger Retirement Foundation", detail: "Higher contributions now build a larger base for compound growth in later years.", impact: "high" },
    )
    action_items.push(
      { action: "Review your monthly budget to ensure increased contributions are sustainable", priority: "high", category: "planning" },
      { action: "Verify you're capturing the full employer match before increasing further", priority: "high", category: "contribution" },
      { action: "Consider splitting increases between pre-tax and Roth for tax diversification", priority: "medium", category: "tax" },
    )
    key_factors = ["Higher contribution rate", "Tax-advantaged growth", "Compound interest over time"]
  } else if (scenario.includes("crash") || scenario.includes("drop")) {
    risks.push(
      { title: "Significant Value Decline", detail: "Portfolio could drop 15-30% in a severe downturn, with recovery typically taking 2-4 years historically.", severity: "high" },
      { title: "Sequence-of-Returns Risk", detail: "If near retirement, a crash could permanently impact your retirement timeline and income.", severity: "high" },
      { title: "Emotional Decision-Making", detail: "Market drops often trigger panic selling, which locks in losses and misses the recovery.", severity: "medium" },
    )
    opportunities.push(
      { title: "Dollar-Cost Averaging Benefit", detail: "Continued contributions during a downturn buy more shares at lower prices, enhancing long-term returns.", impact: "high" },
      { title: "Tax-Loss Harvesting", detail: "Losses in taxable accounts can offset gains and reduce your tax bill by up to $3,000/year.", impact: "medium" },
      { title: "Rebalancing Opportunity", detail: "A crash creates a natural rebalancing moment to buy undervalued asset classes.", impact: "medium" },
    )
    action_items.push(
      { action: "Maintain regular contributions — do not pause during downturns", priority: "high", category: "contribution" },
      { action: "Review asset allocation to ensure it matches your risk tolerance", priority: "high", category: "allocation" },
      { action: "Consider tax-loss harvesting in taxable brokerage accounts", priority: "medium", category: "tax" },
    )
    key_factors = ["Market decline magnitude", "Recovery timeline", "Continued contributions"]
  } else if (scenario.includes("stop")) {
    risks.push(
      { title: "Lost Employer Match", detail: "Stopping contributions means forfeiting free money from employer matching — typically 3-6% of salary.", severity: "high" },
      { title: "Irreplaceable Compounding Time", detail: "Each year without contributions permanently reduces your retirement nest egg. Time in market cannot be recovered.", severity: "high" },
    )
    opportunities.push(
      { title: "Build Emergency Reserves", detail: "Redirecting funds to build a 3-6 month emergency fund can provide financial stability.", impact: "medium" },
      { title: "Resume When Ready", detail: "Contributions can be restarted at any time, and catch-up contributions are available after age 50.", impact: "medium" },
    )
    action_items.push(
      { action: "If possible, contribute at least enough to capture full employer match", priority: "high", category: "contribution" },
      { action: "Set a specific date to resume full contributions", priority: "high", category: "planning" },
      { action: "Explore whether a Roth conversion during lower-income years makes sense", priority: "low", category: "tax" },
    )
    key_factors = ["Lost employer match", "Reduced compounding", "Lower future balance"]
  } else {
    risks.push(
      { title: "Projection Uncertainty", detail: "Actual market returns may differ significantly from the assumed 7% annual average used in this projection.", severity: "medium" },
      { title: "Inflation Erosion", detail: "Even with positive returns, inflation at 2.5%+ annually reduces the real purchasing power of your savings.", severity: "low" },
    )
    opportunities.push(
      { title: "Dollar-Cost Averaging", detail: "Consistent investing through regular contributions smooths out market volatility over time.", impact: "medium" },
      { title: "Time in Market Advantage", detail: "Historically, staying invested outperforms trying to time market entries and exits.", impact: "high" },
    )
    action_items.push(
      { action: "Review your portfolio allocation annually to stay on track", priority: "medium", category: "allocation" },
      { action: "Consider increasing contributions by 1% each year", priority: "medium", category: "contribution" },
    )
    key_factors = ["Market return assumptions", "Contribution consistency", "Time horizon"]
  }

  return {
    projection: {
      total_value: projectedTotal,
      total_change: totalChange,
      total_change_percent: +totalChangePercent.toFixed(2),
      accounts: projectedAccounts,
      holdings: projectedHoldings,
    },
    assumptions: {
      market_return_annual: 0.07,
      inflation_rate: 0.025,
      contribution_limit_401k: 23000,
      contribution_limit_ira: 7000,
    },
    headline,
    summary,
    key_factors,
    risks,
    opportunities,
    action_items,
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Mock API responses
export const mockApiResponses = {
  health: {
    status: "healthy",
    agent_id: "mock-agent-12345",
  } as HealthResponse,

  scenarios: {
    scenarios: mockQuickScenarios,
  } as ScenariosResponse,

  profiles: mockUserProfiles,
}
