"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Send,
  Loader2,
  Sparkles,
  RefreshCw,
  BookOpen,
  Scale,
  DollarSign,
  Copy,
  Check,
  Target,
  Shield,
  ExternalLink,
} from "lucide-react"
import type { AdvisorProfile, ClientProfile } from "@/lib/types"
import { Card } from "@/components/frontend/shared/UIComponents"
import { streamAdvisorChat } from "@/lib/advisorApi"
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

const MOCK_RESPONSES: Record<string, { content: string; citations?: AdvisorChatCitation[] }> = {
  "401k-limits": {
    content: `## 2026 401(k) Contribution Limits

### Employee Contributions
- **Standard Limit**: $23,500 (up from $23,000 in 2025) [REF:us-401k-limit-2026]
- **Catch-up Contribution (Age 50+)**: Additional $7,500 [REF:us-401k-catchup-2026]
- **Total for 50+**: $31,000

### Key Changes for 2026
- **Ages 60-63**: Additional catch-up of $11,250 (instead of $7,500)
- **Total for ages 60-63**: $34,750

### Important Notes
- These limits apply to all 401(k) contributions combined if client has multiple employers
- Roth 401(k) contributions count toward the same limit`,
    citations: [
      { id: "us-401k-limit-2026", title: "401(k) Contribution Limit 2026", source: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits" },
      { id: "us-401k-catchup-2026", title: "401(k) Catch-Up Contribution 2026", source: "https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-catch-up-contributions" },
    ],
  },
  "roth-conversion": {
    content: `## Roth Conversion Rules & Strategy

### Basic Rules
- **Taxable Event**: Conversions are taxable as ordinary income in the year of conversion
- **No Income Limits**: Anyone can convert regardless of income
- **No Amount Limits**: No cap on conversion amounts
- **Irreversible**: Cannot be undone (recharacterization eliminated by TCJA)

### Strategy for High-Income Clients
1. **Backdoor Roth**: Contribute to non-deductible Traditional IRA, then convert
2. **Mega Backdoor Roth**: After-tax 401(k) contributions + in-plan conversion
3. **Tax Bracket Management**: Fill up lower brackets in early retirement years

### Pro Rata Rule Warning
If client has existing pre-tax IRA balances, conversions are taxed proportionally across ALL IRA assets.`,
    citations: [
      { id: "us-roth-conversion", title: "Roth Conversion Tax Treatment", source: "https://www.irs.gov/retirement-plans/roth-iras" },
    ],
  },
  "rrsp-limits": {
    content: `## 2026 RRSP Contribution Limits (Canada)

### Contribution Limit
- **Maximum**: $32,490 for 2026 [REF:ca-rrsp-limit-2026]
- **Calculation**: 18% of previous year's earned income, up to the maximum
- **Carry Forward**: Unused room carries forward indefinitely

### TFSA Limits for Comparison
- **2026 Annual Limit**: $7,000 [REF:ca-tfsa-limit-2026]
- **Cumulative Limit** (since 2009): $102,000

### Strategy Considerations
1. **RRSP vs TFSA**: Consider tax bracket now vs. expected retirement bracket
2. **Pension Adjustment**: Reduces RRSP room for clients with workplace pensions
3. **Spousal RRSP**: Can equalize retirement income between spouses`,
    citations: [
      { id: "ca-rrsp-limit-2026", title: "RRSP Contribution Limit 2026", source: "https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/registered-retirement-savings-plans.html" },
      { id: "ca-tfsa-limit-2026", title: "TFSA Contribution Limit 2026", source: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html" },
    ],
  },
}

// ─── Citation Tooltip Component ─────────────────────────────────────────────

const CitationTooltip: React.FC<{
  citation: AdvisorChatCitation
  num: number
}> = ({ citation, num }) => {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-block">
      <button
        className="inline-flex items-center justify-center w-[18px] h-[18px] text-[10px] font-bold text-indigo-700 bg-indigo-100 rounded-full align-super cursor-help hover:bg-indigo-200 transition-colors ml-0.5"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        aria-label={`Citation ${num}: ${citation.title}`}
      >
        {num}
      </button>
      {show && (
        <span className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 pointer-events-auto">
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
            <a href={citation.source} target="_blank" rel="noopener noreferrer"
              className="text-indigo-400 hover:underline text-[10px] block mt-1"
            >{citation.source}</a>
          )}
          {citation.jurisdiction && (
            <span className="block text-gray-500 text-[10px] mt-1">
              {citation.jurisdiction.toUpperCase()}{citation.category ? ` · ${citation.category}` : ''}
              {citation.last_verified ? ` · Verified: ${citation.last_verified}` : ''}
            </span>
          )}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  )
}

// ─── Inline Citation + Bold Renderer ────────────────────────────────────────

function renderTextWithCitations(
  text: string,
  citationMap: Map<string, number>,
  citations?: AdvisorChatCitation[]
): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const refPattern = /\[REF:([a-zA-Z0-9_-]+)\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  const renderInline = (segment: string, keyPrefix: string): React.ReactNode[] => {
    const inlineParts: React.ReactNode[] = []
    const boldPattern = /\*\*(.+?)\*\*/g
    let last = 0
    let bMatch: RegExpExecArray | null
    while ((bMatch = boldPattern.exec(segment)) !== null) {
      if (bMatch.index > last) inlineParts.push(segment.slice(last, bMatch.index))
      inlineParts.push(<strong key={`${keyPrefix}-b-${bMatch.index}`}>{bMatch[1]}</strong>)
      last = bMatch.index + bMatch[0].length
    }
    if (last < segment.length) inlineParts.push(segment.slice(last))
    return inlineParts
  }

  while ((match = refPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...renderInline(text.slice(lastIndex, match.index), `pre-${match.index}`))
    }
    const refId = match[1]
    const num = citationMap.get(refId)
    const citation = citations?.find(c => c.id === refId)
    if (num && citation) {
      parts.push(<CitationTooltip key={`ref-${refId}-${match.index}`} citation={citation} num={num} />)
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(...renderInline(text.slice(lastIndex), `post-${lastIndex}`))
  }
  return parts
}

// ─── Rich Response Card Renderer ────────────────────────────────────────────

interface ParsedSection {
  type: "heading" | "keyvalue" | "list" | "paragraph"
  title?: string
  level?: number
  items?: { key?: string; value: string }[]
  text?: string
}

function parseResponseSections(content: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  const lines = content.split("\n")
  let currentSection: ParsedSection | null = null

  const flush = () => { if (currentSection) { sections.push(currentSection); currentSection = null } }

  for (const line of lines) {
    const t = line.trim()
    if (t === "") { flush(); continue }
    if (t.startsWith("# ") && !t.startsWith("## ")) { flush(); sections.push({ type: "heading", title: t.slice(2), level: 1 }); continue }
    if (t.startsWith("## ") && !t.startsWith("### ")) { flush(); sections.push({ type: "heading", title: t.slice(3), level: 2 }); continue }
    if (t.startsWith("### ")) { flush(); sections.push({ type: "heading", title: t.slice(4), level: 3 }); continue }

    const kvMatch = t.match(/^[-*]\s+\*\*(.+?)\*\*[:\s]+(.+)/)
    if (kvMatch) {
      if (!currentSection || currentSection.type !== "keyvalue") { flush(); currentSection = { type: "keyvalue", items: [] } }
      currentSection.items!.push({ key: kvMatch[1], value: kvMatch[2] })
      continue
    }

    const numMatch = t.match(/^\d+\.\s+(?:\*\*(.+?)\*\*[:\s]+)?(.+)/)
    if (numMatch) {
      if (!currentSection || currentSection.type !== "list") { flush(); currentSection = { type: "list", items: [] } }
      currentSection.items!.push({ key: numMatch[1] || undefined, value: numMatch[2] })
      continue
    }

    if (t.startsWith("- ") || t.startsWith("* ")) {
      if (!currentSection || currentSection.type !== "list") { flush(); currentSection = { type: "list", items: [] } }
      currentSection.items!.push({ value: t.slice(2) })
      continue
    }

    flush()
    sections.push({ type: "paragraph", text: t })
  }
  flush()
  return sections
}

// ─── Response Card Component ────────────────────────────────────────────────

const ResponseCard: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content.replace(/\[REF:[a-zA-Z0-9_-]+\]/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const citationMap = new Map<string, number>()
  if (message.citations) message.citations.forEach((c, i) => { if (c.id) citationMap.set(c.id, i + 1) })

  const sections = parseResponseSections(message.content)
  const hasStructure = sections.some(s => s.type === "heading" || s.type === "keyvalue")

  // Simple text reply — no card header
  if (!hasStructure) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[85%]">
          <div className="bg-white border rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
            <div className="text-sm text-gray-700 leading-relaxed space-y-2">
              {sections.map((s, i) => {
                if (s.type === "paragraph" && s.text) return <p key={i}>{renderTextWithCitations(s.text, citationMap, message.citations)}</p>
                if (s.type === "list" && s.items) return (
                  <ul key={i} className="space-y-1 ml-1">
                    {s.items.map((it, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">•</span>
                        <span>{renderTextWithCitations(it.value, citationMap, message.citations)}</span>
                      </li>
                    ))}
                  </ul>
                )
                return null
              })}
            </div>
            <CitationFooter citations={message.citations} />
          </div>
          <CopyAction copied={copied} onCopy={handleCopy} />
        </div>
      </div>
    )
  }

  // Structured response — rich card with header
  let mainTitle = ""
  const bodyParts: React.ReactNode[] = []

  sections.forEach((section, idx) => {
    if (section.type === "heading" && (section.level === 1 || section.level === 2) && !mainTitle) {
      mainTitle = section.title || ""
      return
    }
    if (section.type === "heading" && section.level === 2) {
      bodyParts.push(
        <div key={`h2-${idx}`} className="mt-5 mb-3 first:mt-0">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
            {renderTextWithCitations(section.title || "", citationMap, message.citations)}
          </h3>
        </div>
      )
      return
    }
    if (section.type === "heading" && section.level === 3) {
      bodyParts.push(
        <div key={`h3-${idx}`} className="mt-4 mb-2 first:mt-0">
          <h4 className="text-sm font-medium text-gray-800 flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            {renderTextWithCitations(section.title || "", citationMap, message.citations)}
          </h4>
        </div>
      )
      return
    }
    if (section.type === "keyvalue" && section.items) {
      bodyParts.push(
        <div key={`kv-${idx}`} className="grid grid-cols-1 gap-2">
          {section.items.map((item, j) => (
            <div key={j} className="flex items-start gap-3 py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0 text-sm">
                {item.key && <span className="font-semibold text-gray-900">{renderTextWithCitations(item.key, citationMap, message.citations)}: </span>}
                <span className="text-gray-600">{renderTextWithCitations(item.value, citationMap, message.citations)}</span>
              </div>
            </div>
          ))}
        </div>
      )
      return
    }
    if (section.type === "list" && section.items) {
      bodyParts.push(
        <div key={`list-${idx}`} className="space-y-1.5 ml-1">
          {section.items.map((item, j) => (
            <div key={j} className="flex items-start gap-2.5 py-1">
              {item.key ? (
                <>
                  <span className="w-5 h-5 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded text-xs font-bold flex-shrink-0 mt-0.5">{j + 1}</span>
                  <div className="text-sm">
                    <span className="font-medium text-gray-900">{renderTextWithCitations(item.key, citationMap, message.citations)}: </span>
                    <span className="text-gray-600">{renderTextWithCitations(item.value, citationMap, message.citations)}</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span className="text-sm text-gray-600">{renderTextWithCitations(item.value, citationMap, message.citations)}</span>
                </>
              )}
            </div>
          ))}
        </div>
      )
      return
    }
    if (section.type === "paragraph" && section.text) {
      bodyParts.push(<p key={`p-${idx}`} className="text-sm text-gray-600 leading-relaxed">{renderTextWithCitations(section.text, citationMap, message.citations)}</p>)
    }
  })

  return (
    <div className="flex justify-start mb-5">
      <div className="max-w-[90%] w-full">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {mainTitle && (
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-base font-semibold text-white">{mainTitle}</h2>
              </div>
            </div>
          )}
          <div className="px-5 py-4 space-y-3">{bodyParts}</div>
          <CitationFooter citations={message.citations} />
        </div>
        <CopyAction copied={copied} onCopy={handleCopy} />
      </div>
    </div>
  )
}

const CitationFooter: React.FC<{ citations?: AdvisorChatCitation[] }> = ({ citations }) => {
  if (!citations || citations.length === 0) return null
  return (
    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5" /> Regulatory Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => (
          <a key={i} href={c.source || '#'} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs bg-white text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full hover:bg-indigo-50 transition-colors"
          >
            <span className="w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">{i + 1}</span>
            <span className="truncate max-w-[200px]">{c.title}</span>
            <ExternalLink className="w-3 h-3 text-indigo-400 flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}

const CopyAction: React.FC<{ copied: boolean; onCopy: () => void }> = ({ copied, onCopy }) => (
  <div className="flex gap-2 mt-1 ml-2">
    <button onClick={onCopy} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  </div>
)

// ─── Main Component ─────────────────────────────────────────────────────────

export const AdvisorChatView: React.FC<AdvisorChatViewProps> = ({
  advisor,
  clients,
  isMockMode = true,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<"all" | "regulatory" | "client" | "planning">("all")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const msgCounter = useRef(0)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
  
  useEffect(() => { scrollToBottom() }, [messages])

  const nextId = (prefix: string) => {
    msgCounter.current += 1
    return `${prefix}-${Date.now()}-${msgCounter.current}`
  }
  
  const handleSend = async (content: string = inputValue) => {
    if (!content.trim() || isLoading) return
    
    const userMessage: ChatMessage = {
      id: nextId("user"),
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }
    
    const assistantMessageId = nextId("assistant")
    
    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    
    if (isMockMode) {
      setTimeout(() => {
        const matchedQuery = QUICK_QUERIES.find(q => 
          content.toLowerCase().includes(q.label.toLowerCase()) ||
          q.prompt.toLowerCase() === content.toLowerCase()
        )
        
        const responseData = matchedQuery && MOCK_RESPONSES[matchedQuery.id]
          ? MOCK_RESPONSES[matchedQuery.id]
          : {
              content: `## Analysis: ${content.substring(0, 50)}

### Key Points
- **Client Context**: Always review the specific client's situation, risk tolerance, and goals
- **Regulatory Compliance**: Ensure any advice aligns with current US and Canadian regulations
- **Documentation**: Keep detailed records of recommendations and client decisions

### Recommended Actions
1. **Review Client Profiles**: Check affected clients in your portfolio
2. **Verify Compliance**: Cross-reference with current regulatory requirements
3. **Document Decisions**: Record all recommendations and rationale`,
              citations: [] as AdvisorChatCitation[],
            }
        
        setMessages(prev => [...prev, {
          id: assistantMessageId,
          role: "assistant",
          content: responseData.content,
          timestamp: new Date().toISOString(),
          citations: responseData.citations,
        }])
        setIsLoading(false)
      }, 1500)
    } else {
      let timeoutId: NodeJS.Timeout | null = null
      let hasResponded = false
      
      try {
        setMessages(prev => [...prev, {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        }])
        
        timeoutId = setTimeout(() => {
          if (!hasResponded) {
            setMessages(prev => 
              prev.map(m => m.id === assistantMessageId ? { ...m, content: "The AI service is taking longer than expected. Please try again or switch to Mock Mode." } : m)
            )
            setIsLoading(false)
          }
        }, 15000)
        
        await streamAdvisorChat(
          {
            message: content.trim(),
            advisor_id: advisor.id,
            context: { jurisdiction: advisor.jurisdictions?.[0] },
            history: messages.map(m => ({ role: m.role, content: m.content })),
          },
          (streamedContent, isComplete, citations) => {
            hasResponded = true
            if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
            setMessages(prev => 
              prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: streamedContent, ...(isComplete && citations ? { citations } : {}) }
                  : m
              )
            )
            if (isComplete) setIsLoading(false)
          }
        )
      } catch (error) {
        console.error("Chat error:", error)
        if (timeoutId) clearTimeout(timeoutId)
        setMessages(prev => 
          prev.map(m => m.id === assistantMessageId 
            ? { ...m, content: "I encountered an error connecting to the AI service. Please try again or switch to Mock Mode." }
            : m
          )
        )
        setIsLoading(false)
      }
    }
  }
  
  const handleQuickQuery = (query: QuickQuery) => { handleSend(query.prompt) }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
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
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">How can I help you today?</h2>
              <p className="text-gray-500">Ask about regulations, client strategies, or planning scenarios</p>
            </div>
            
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
            {messages.map(message => {
              if (message.role === "assistant" && !message.content) return null
              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex justify-end mb-4">
                    <div className="max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                )
              }
              return <ResponseCard key={message.id} message={message} />
            })}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input */}
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
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Sage AI provides guidance based on current regulations. Always verify advice and document recommendations.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdvisorChatView
