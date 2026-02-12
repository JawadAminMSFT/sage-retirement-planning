"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Send,
  Loader2,
  Sparkles,
  User,
  RefreshCw,
  BookOpen,
  Scale,
  DollarSign,
  Users,
  ChevronDown,
  Copy,
  Check,
  X,
} from "lucide-react"
import type { AdvisorProfile, ClientProfile } from "@/lib/types"
import { Card } from "@/components/frontend/shared/UIComponents"
import { sendAdvisorChat, streamAdvisorChat, generateDailyBrief } from "@/lib/advisorApi"
import type { AdvisorChatCitation } from "@/lib/advisorApi"

// ─── Types ──────────────────────────────────────────────────────────────────

interface AdvisorChatViewProps {
  advisor: AdvisorProfile
  clients: ClientProfile[]
  isMockMode?: boolean
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  citations?: AdvisorChatCitation[]
  relatedClients?: string[]
}

interface QuickQuery {
  id: string
  label: string
  icon: React.ReactNode
  prompt: string
  category: "regulatory" | "client" | "planning"
}

// ─── Quick Queries ──────────────────────────────────────────────────────────

const QUICK_QUERIES: QuickQuery[] = [
  {
    id: "401k-limits",
    label: "2026 401(k) Limits",
    icon: <DollarSign className="w-4 h-4" />,
    prompt: "What are the 2026 401(k) contribution limits, including catch-up contributions?",
    category: "regulatory",
  },
  {
    id: "roth-conversion",
    label: "Roth Conversion Rules",
    icon: <RefreshCw className="w-4 h-4" />,
    prompt: "Explain the current Roth conversion rules and tax implications for high-income clients.",
    category: "regulatory",
  },
  {
    id: "rrsp-limits",
    label: "2026 RRSP Limits (CA)",
    icon: <DollarSign className="w-4 h-4" />,
    prompt: "What are the 2026 RRSP contribution limits for Canadian clients?",
    category: "regulatory",
  },
  {
    id: "cpp-timing",
    label: "CPP Timing Strategy",
    icon: <Scale className="w-4 h-4" />,
    prompt: "What factors should I consider when advising Canadian clients on CPP claiming timing?",
    category: "planning",
  },
  {
    id: "social-security",
    label: "Social Security Strategies",
    icon: <Scale className="w-4 h-4" />,
    prompt: "Summarize the key Social Security claiming strategies for married couples.",
    category: "planning",
  },
  {
    id: "rmd-rules",
    label: "RMD Requirements",
    icon: <BookOpen className="w-4 h-4" />,
    prompt: "What are the current Required Minimum Distribution rules and start ages?",
    category: "regulatory",
  },
]

// ─── Mock Responses ─────────────────────────────────────────────────────────

const MOCK_RESPONSES: Record<string, { content: string; citations?: { title: string; source: string }[] }> = {
  "401k-limits": {
    content: `# 2026 401(k) Contribution Limits

## Employee Contributions
- **Standard Limit**: $23,500 (up from $23,000 in 2025)
- **Catch-up Contribution (Age 50+)**: Additional $7,500
- **Total for 50+**: $31,000

## Key Changes for 2026
The SECURE 2.0 Act introduced enhanced catch-up contributions:
- **Ages 60-63**: Additional catch-up of $11,250 (instead of $7,500)
- **Total for ages 60-63**: $34,750

## Employer + Employee Combined Limit
- **Under 50**: $70,000
- **Age 50+**: $77,500
- **Ages 60-63**: $81,250

## Important Notes
- These limits apply to all 401(k) contributions combined if client has multiple employers
- Roth 401(k) contributions count toward the same limit
- Catch-up contributions for high earners ($145k+ in prior year) must be made as Roth`,
    citations: [
      { title: "IRS Notice 2025-XX: 401(k) Limits", source: "IRS.gov" },
      { title: "SECURE 2.0 Act Section 109", source: "Congress.gov" },
    ],
  },
  "roth-conversion": {
    content: `# Roth Conversion Rules & Strategy

## Basic Rules
- Conversions are taxable as ordinary income in the year of conversion
- No income limits on who can convert
- No limits on conversion amounts
- Cannot be undone (recharacterization eliminated by TCJA)

## Tax Considerations
1. **Timing**: Best to convert in years with lower income
2. **Source of Tax Payment**: Pay taxes from non-retirement funds to maximize growth
3. **State Taxes**: Consider state tax implications (some states don't tax retirement income)

## 5-Year Rules
- **Contributions**: Can be withdrawn anytime tax/penalty-free
- **Converted Amounts**: 5-year waiting period for penalty-free withdrawal if under 59½
- **Earnings**: Must be 59½ AND meet 5-year rule for tax-free withdrawal

## Strategy for High-Income Clients
1. **Backdoor Roth**: Contribute to non-deductible Traditional IRA, then convert
2. **Mega Backdoor Roth**: After-tax 401(k) contributions + in-plan conversion
3. **Tax Bracket Management**: Fill up lower brackets in early retirement years

## Pro Rata Rule Warning
If client has existing pre-tax IRA balances, conversions are taxed proportionally across ALL IRA assets.`,
    citations: [
      { title: "IRS Publication 590-A", source: "IRS.gov" },
      { title: "Roth Conversion Strategies", source: "Journal of Financial Planning" },
    ],
  },
  "rrsp-limits": {
    content: `# 2026 RRSP Contribution Limits (Canada)

## Contribution Limit
- **Maximum**: $32,490 for 2026
- **Calculation**: 18% of previous year's earned income, up to the maximum
- **Carry Forward**: Unused room carries forward indefinitely

## Key Dates
- **Contribution Deadline**: March 3, 2027 (for 2026 tax year)
- **RRSP Conversion**: Must convert to RRIF by December 31 of year client turns 71

## TFSA Limits for Comparison
- **2026 Annual Limit**: $7,000
- **Cumulative Limit** (since 2009): $95,000

## Strategy Considerations
1. **RRSP vs TFSA**: Consider tax bracket now vs. expected retirement bracket
2. **Pension Adjustment**: Reduces RRSP room for clients with workplace pensions
3. **Spousal RRSP**: Can equalize retirement income between spouses
4. **Home Buyers' Plan**: $35,000 can be withdrawn tax-free for first home`,
    citations: [
      { title: "CRA RRSP Limits", source: "canada.ca" },
      { title: "2026 Tax Planning", source: "CPA Canada" },
    ],
  },
}

// ─── Brief Me Modal ─────────────────────────────────────────────────────────

interface BriefMeModalProps {
  advisor: AdvisorProfile
  clients: ClientProfile[]
  onClose: () => void
  isMockMode?: boolean
}

const BriefMeModal: React.FC<BriefMeModalProps> = ({ advisor, clients, onClose, isMockMode = true }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [briefContent, setBriefContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    setIsLoading(true)
    setError(null)
    
    const mockBrief = `# Good Morning, ${advisor.name.split(" ")[0]}! 👋

## Today's Overview (February 11, 2026)

### 📅 Today's Schedule
- **2:00 PM** - John Doe (Periodic Review)
- **4:00 PM** - Robert Nguyen (Escalation Follow-up)

### 🚨 Urgent Attention Needed
1. **Robert Nguyen** (Critical) - CPP timing decision pending. Meeting scheduled for today.
2. **Michael Rodriguez** (Needs Attention) - Backdoor Roth question escalated yesterday.

### 📊 Portfolio Alert
- **Linda Thompson's** portfolio has drifted 3% from target allocation due to recent bond price movements. Consider rebalancing discussion in next review.

### 🎯 Key Tasks
- [ ] Review CPP deferral scenarios for Robert before 4 PM meeting
- [ ] Respond to Michael's Roth IRA escalation
- [ ] Send follow-up to Linda after yesterday's meeting
- [ ] Prepare Q1 review summary for John

### 📈 Market Context
- S&P 500: +0.3% YTD
- Bond yields stable at ~4.2%
- No major policy changes affecting client strategies

### 💡 Opportunity Spotlight
**Sarah Chen** (Young Professional) has $15k in cash savings earning low interest. Given her high risk tolerance and long time horizon, this might be a good time to discuss increasing her investment allocation.`

    if (isMockMode) {
      // Simulate streaming for mock mode
      let currentIndex = 0
      const interval = setInterval(() => {
        if (currentIndex <= mockBrief.length) {
          setBriefContent(mockBrief.substring(0, currentIndex))
          currentIndex += 15
        } else {
          setIsLoading(false)
          clearInterval(interval)
        }
      }, 20)
      return () => clearInterval(interval)
    } else {
      // Call real API
      generateDailyBrief(advisor.id)
        .then((response) => {
          // Stream the response for visual effect
          let currentIndex = 0
          const interval = setInterval(() => {
            if (currentIndex <= response.length) {
              setBriefContent(response.substring(0, currentIndex))
              currentIndex += 15
            } else {
              setIsLoading(false)
              clearInterval(interval)
            }
          }, 15)
        })
        .catch((err) => {
          console.error("Failed to generate brief:", err)
          setError("Failed to generate brief. Please try again.")
          setIsLoading(false)
        })
    }
  }, [advisor, isMockMode])
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-lg font-semibold">AI Brief</h2>
            {!isMockMode && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Live AI</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : (
          <div className="prose prose-sm max-w-none">
            {briefContent.split("\n").map((line, i) => {
              if (line.startsWith("# ")) {
                return <h1 key={i} className="text-xl font-bold text-gray-900 mb-4">{line.substring(2)}</h1>
              }
              if (line.startsWith("## ")) {
                return <h2 key={i} className="text-lg font-semibold text-gray-800 mt-6 mb-2">{line.substring(3)}</h2>
              }
              if (line.startsWith("### ")) {
                return <h3 key={i} className="text-md font-semibold text-gray-700 mt-4 mb-2">{line.substring(4)}</h3>
              }
              if (line.startsWith("- ")) {
                return <p key={i} className="text-gray-600 ml-4">• {line.substring(2)}</p>
              }
              if (line.startsWith("1. ") || line.startsWith("2. ")) {
                return <p key={i} className="text-gray-600 ml-4">{line}</p>
              }
              if (line.trim() === "") {
                return <br key={i} />
              }
              return <p key={i} className="text-gray-600">{line}</p>
            })}
            {isLoading && (
              <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1" />
            )}
          </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Chat Message Component ─────────────────────────────────────────────────

interface ChatMessageProps {
  message: ChatMessage
}

const ChatMessageComponent: React.FC<ChatMessageProps> = ({ message }) => {
  const [copied, setCopied] = useState(false)
  const [tooltipRef, setTooltipRef] = useState<string | null>(null)
  
  const handleCopy = () => {
    // Strip [REF:...] markers from copied text
    const cleanText = message.content.replace(/\[REF:[a-zA-Z0-9_-]+\]/g, '')
    navigator.clipboard.writeText(cleanText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Build a map from citation id to index for superscript numbering
  const citationMap = new Map<string, number>()
  if (message.citations) {
    message.citations.forEach((c, i) => {
      if (c.id) citationMap.set(c.id, i + 1)
    })
  }
  
  /**
   * Render a text segment, replacing [REF:rule-id] with numbered superscript tooltips.
   */
  const renderWithCitations = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    const refPattern = /\[REF:([a-zA-Z0-9_-]+)\]/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = refPattern.exec(text)) !== null) {
      // Text before this ref
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      const refId = match[1]
      const num = citationMap.get(refId)
      const citation = message.citations?.find(c => c.id === refId)

      if (num && citation) {
        parts.push(
          <span key={`ref-${refId}-${match.index}`} className="relative inline-block">
            <button
              className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-indigo-700 bg-indigo-100 rounded-full align-super cursor-help hover:bg-indigo-200 transition-colors ml-0.5"
              onMouseEnter={() => setTooltipRef(refId)}
              onMouseLeave={() => setTooltipRef(null)}
              onClick={() => setTooltipRef(tooltipRef === refId ? null : refId)}
              aria-label={`Citation ${num}: ${citation.title}`}
            >
              {num}
            </button>
            {tooltipRef === refId && (
              <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 pointer-events-auto">
                <span className="block font-semibold text-indigo-300 mb-1">{citation.title}</span>
                {citation.description && (
                  <span className="block text-gray-300 mb-1">{citation.description}</span>
                )}
                {citation.values && Object.keys(citation.values).length > 0 && (
                  <span className="block text-gray-400 text-[10px] mb-1">
                    {Object.entries(citation.values).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')}
                  </span>
                )}
                {citation.source && (
                  <a
                    href={citation.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline text-[10px] block mt-1"
                  >
                    {citation.source}
                  </a>
                )}
                {citation.jurisdiction && (
                  <span className="block text-gray-500 text-[10px] mt-1">
                    {citation.jurisdiction.toUpperCase()}{citation.category ? ` · ${citation.category}` : ''}
                    {citation.last_verified ? ` · Verified: ${citation.last_verified}` : ''}
                  </span>
                )}
                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></span>
              </span>
            )}
          </span>
        )
      } else {
        // Unknown ref — just show the raw text
        parts.push(text.slice(match.index, match.index + match[0].length))
      }
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts
  }
  
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%]">
        <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          {/* Render markdown-like content with inline citation tooltips */}
          <div className="text-sm text-gray-700 prose prose-sm max-w-none">
            {message.content.split("\n").map((line, i) => {
              if (line.startsWith("# ")) {
                return <h1 key={i} className="text-lg font-bold text-gray-900 mt-2 mb-2">{renderWithCitations(line.substring(2))}</h1>
              }
              if (line.startsWith("## ")) {
                return <h2 key={i} className="text-md font-semibold text-gray-800 mt-3 mb-1">{renderWithCitations(line.substring(3))}</h2>
              }
              if (line.startsWith("- **")) {
                const match = line.match(/- \*\*(.+?)\*\*: (.+)/)
                if (match) {
                  return <p key={i} className="ml-2">• <strong>{renderWithCitations(match[1])}</strong>: {renderWithCitations(match[2])}</p>
                }
              }
              if (line.startsWith("- ")) {
                return <p key={i} className="ml-2">• {renderWithCitations(line.substring(2))}</p>
              }
              if (line.match(/^\d+\. /)) {
                return <p key={i} className="ml-2">{renderWithCitations(line)}</p>
              }
              if (line.trim() === "") {
                return <br key={i} />
              }
              return <p key={i}>{renderWithCitations(line)}</p>
            })}
          </div>
          
          {/* Citation Sources Footer */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Scale className="w-3 h-3" /> Regulatory Sources:</p>
              <div className="flex flex-wrap gap-2">
                {message.citations.map((citation, i) => (
                  <a
                    key={i}
                    href={citation.source || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-indigo-200 text-indigo-800 rounded-full">{i + 1}</span>
                    {citation.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 mt-1 ml-2">
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const AdvisorChatView: React.FC<AdvisorChatViewProps> = ({
  advisor,
  clients,
  isMockMode = true,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showBriefMe, setShowBriefMe] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<"all" | "regulatory" | "client" | "planning">("all")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const handleSend = async (content: string = inputValue) => {
    if (!content.trim() || isLoading) return
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    
    if (isMockMode) {
      // Simulate AI response in mock mode
      setTimeout(() => {
        // Check if it matches a quick query
        const matchedQuery = QUICK_QUERIES.find(q => 
          content.toLowerCase().includes(q.label.toLowerCase()) ||
          q.prompt.toLowerCase() === content.toLowerCase()
        )
        
        let responseData = matchedQuery && MOCK_RESPONSES[matchedQuery.id]
          ? MOCK_RESPONSES[matchedQuery.id]
          : {
              content: `I understand you're asking about: "${content.substring(0, 50)}..."

Let me help you with that. Based on my analysis of your client portfolio and current regulatory requirements:

## Summary
This is a great question that relates to retirement planning best practices. Here are the key points to consider:

1. **Client Context**: Always review the specific client's situation, risk tolerance, and goals
2. **Regulatory Compliance**: Ensure any advice aligns with current US and Canadian regulations
3. **Documentation**: Keep detailed records of recommendations and client decisions

Would you like me to elaborate on any specific aspect or apply this to a particular client's situation?`,
              citations: [],
            }
        
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: responseData.content,
          timestamp: new Date().toISOString(),
          citations: responseData.citations,
        }
        
        setMessages(prev => [...prev, assistantMessage])
        setIsLoading(false)
      }, 1500)
    } else {
      // Use real AI API with timeout protection
      const assistantMessageId = `msg-${Date.now()}`
      let timeoutId: NodeJS.Timeout | null = null
      let hasResponded = false
      
      try {
        // Add a placeholder message that will be updated with streaming content
        setMessages(prev => [...prev, {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        }])
        
        // Set a 15-second timeout - if no response, fall back to mock
        timeoutId = setTimeout(() => {
          if (!hasResponded) {
            console.warn("Streaming timeout - falling back to mock response")
            const fallbackResponse = `I apologize, but the AI service is taking longer than expected. Here's what I can tell you about "${content.substring(0, 30)}...":

## Quick Guidance
For detailed information on this topic, I recommend:
1. Checking the latest regulatory guidelines
2. Reviewing client-specific documentation
3. Consulting with compliance if needed

Would you like to try asking a more specific question, or switch to Mock Mode for instant responses?`
            
            setMessages(prev => 
              prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: fallbackResponse }
                  : m
              )
            )
            setIsLoading(false)
          }
        }, 15000)
        
        await streamAdvisorChat(
          {
            message: content.trim(),
            advisor_id: advisor.id,
            context: {
              jurisdiction: advisor.jurisdictions?.[0],
            },
            history: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
          },
          (streamedContent, isComplete, citations) => {
            hasResponded = true
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
            setMessages(prev => 
              prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: streamedContent, ...(isComplete && citations ? { citations } : {}) }
                  : m
              )
            )
            if (isComplete) {
              setIsLoading(false)
            }
          }
        )
      } catch (error) {
        console.error("Chat error:", error)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        
        // Update the placeholder message with error
        setMessages(prev => 
          prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, content: "I apologize, but I encountered an error connecting to the AI service. Please try again or switch to Mock Mode for instant responses." }
              : m
          )
        )
        setIsLoading(false)
      }
    }
  }
  
  const handleQuickQuery = (query: QuickQuery) => {
    handleSend(query.prompt)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  const filteredQueries = selectedCategory === "all"
    ? QUICK_QUERIES
    : QUICK_QUERIES.filter(q => q.category === selectedCategory)
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Sage AI for Advisors</h1>
            <p className="text-sm text-gray-500">Regulatory guidance, client insights, and planning strategies</p>
          </div>
          <button
            onClick={() => setShowBriefMe(true)}
            className="px-4 py-2 text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Brief Me
          </button>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            {/* Welcome */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">How can I help you today?</h2>
              <p className="text-gray-500">Ask about regulations, client strategies, or planning scenarios</p>
            </div>
            
            {/* Category Filter */}
            <div className="flex justify-center gap-2 mb-4">
              {[
                { id: "all", label: "All" },
                { id: "regulatory", label: "Regulatory" },
                { id: "planning", label: "Planning" },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            
            {/* Quick Queries */}
            <div className="grid grid-cols-2 gap-3">
              {filteredQueries.map(query => (
                <button
                  key={query.id}
                  onClick={() => handleQuickQuery(query)}
                  className="flex items-center gap-3 p-4 bg-white border rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                    {query.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{query.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map(message => (
              // Skip rendering empty assistant messages (they're placeholders for streaming)
              message.role === "assistant" && !message.content ? null : (
                <ChatMessageComponent key={message.id} message={message} />
              )
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="flex-shrink-0 p-4 bg-white border-t">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about regulations, client strategies, or planning scenarios..."
                className="w-full px-4 py-3 pr-12 border rounded-xl resize-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Sage AI provides guidance based on current regulations. Always verify advice and document recommendations.
          </p>
        </div>
      </div>
      
      {/* Brief Me Modal */}
      {showBriefMe && (
        <BriefMeModal
          advisor={advisor}
          clients={clients}
          onClose={() => setShowBriefMe(false)}
          isMockMode={isMockMode}
        />
      )}
    </div>
  )
}

export default AdvisorChatView
