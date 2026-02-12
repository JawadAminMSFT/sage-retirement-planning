"use client"

import React, { useState, useEffect } from "react"
import {
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  ChevronRight,
  Filter,
  X,
  Check,
  Calendar,
  FileText,
  Loader2,
  Send,
} from "lucide-react"
import type { EscalationTicket, EscalationStatus, EscalationPriority, ResolutionType, ClientProfile } from "@/lib/types"
import { Card, EmptyState, Skeleton } from "@/components/frontend/shared/UIComponents"

// ─── Types ──────────────────────────────────────────────────────────────────

interface EscalationQueueProps {
  advisorId: string
  onViewClient?: (clientId: string) => void
  isMockMode?: boolean
}

interface EscalationDetailModalProps {
  escalation: EscalationTicket
  client?: ClientProfile
  onClose: () => void
  onResolve: (resolution: { type: ResolutionType; notes: string }) => void
  onUpdateStatus: (status: EscalationStatus) => void
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_ESCALATIONS: EscalationTicket[] = [
  {
    id: "esc-1",
    client_id: "mid-career",
    advisor_id: "advisor-jane",
    reason: "regulatory_question",
    client_question: "Can I contribute to both Roth IRA and 401k if I exceed income limits?",
    context_summary: "Client has income near Roth IRA phase-out threshold ($161k single). Currently maxing 401k. Needs guidance on backdoor Roth strategy legality and execution.",
    suggested_response: "For high earners like yourself who exceed the Roth IRA income limits, the 'backdoor Roth' strategy is a valid option. This involves contributing to a traditional IRA (non-deductible) and then converting to Roth...",
    status: "pending",
    priority: "high",
    created_at: "2026-02-10T11:00:00Z",
    ai_confidence_score: 0.72,
  },
  {
    id: "esc-2",
    client_id: "pre-retiree-ca",
    advisor_id: "advisor-jane",
    reason: "high_value_decision",
    client_question: "Should I take CPP at 60 or wait until 65?",
    context_summary: "Client is 58, planning to retire at 65. CPP deferral analysis needed. Health status: good. Has substantial RRSP savings.",
    suggested_response: "Based on your financial situation and good health, delaying CPP to 65 or even 70 could significantly increase your lifetime benefits. Let me run a detailed comparison...",
    status: "pending",
    priority: "urgent",
    created_at: "2026-02-11T08:30:00Z",
    ai_confidence_score: 0.65,
  },
  {
    id: "esc-3",
    client_id: "demo-user",
    advisor_id: "advisor-jane",
    reason: "user_requested",
    client_question: "I want to discuss my overall retirement strategy with a human advisor",
    context_summary: "Client requested direct advisor consultation after exploring multiple scenarios. Has been using Sage actively for 3 months.",
    status: "in_progress",
    priority: "medium",
    created_at: "2026-02-09T15:45:00Z",
    acknowledged_at: "2026-02-09T16:00:00Z",
    ai_confidence_score: 1.0,
  },
  {
    id: "esc-4",
    client_id: "conservative-saver",
    advisor_id: "advisor-jane",
    reason: "ai_complexity",
    client_question: "How do I coordinate Social Security with my pension and 401k withdrawals?",
    context_summary: "Complex withdrawal sequencing question involving multiple income sources. Client has DB pension, 401k, Roth IRA, and will receive Social Security. Tax optimization needed.",
    suggested_response: "Coordinating multiple retirement income sources requires careful tax planning. I recommend we review your projected income from each source and create a withdrawal sequence that minimizes your tax burden over time...",
    status: "pending",
    priority: "medium",
    created_at: "2026-02-08T10:20:00Z",
    ai_confidence_score: 0.58,
  },
]

const MOCK_CLIENTS: Record<string, ClientProfile> = {
  "mid-career": {
    id: "mid-career",
    name: "Michael Rodriguez",
    email: "michael.rodriguez@email.com",
    role: "client",
    age: 45,
    current_cash: 50000,
    investment_assets: 400000,
    yearly_savings_rate: 0.18,
    salary: 120000,
    portfolio: { stocks: 0.65, bonds: 0.25, real_estate: 0.1 },
    risk_appetite: "medium",
    target_retire_age: 62,
    target_monthly_income: 6000,
    advisor_id: "advisor-jane",
    jurisdiction: "US",
    escalation_enabled: true,
    status: "needs_attention",
    created_at: "2023-11-10T08:30:00Z",
    updated_at: "2026-02-08T16:45:00Z",
  },
  "pre-retiree-ca": {
    id: "pre-retiree-ca",
    name: "Robert Nguyen",
    email: "robert.nguyen@email.ca",
    role: "client",
    age: 58,
    current_cash: 95000,
    investment_assets: 750000,
    yearly_savings_rate: 0.10,
    salary: 92000,
    portfolio: { stocks: 0.35, bonds: 0.55, cash: 0.1 },
    risk_appetite: "low",
    target_retire_age: 65,
    target_monthly_income: 5000,
    advisor_id: "advisor-jane",
    jurisdiction: "CA",
    escalation_enabled: true,
    status: "critical",
    created_at: "2023-09-05T10:30:00Z",
    updated_at: "2026-02-09T08:00:00Z",
  },
  "demo-user": {
    id: "demo-user",
    name: "John Doe",
    email: "john.doe@email.com",
    role: "client",
    age: 40,
    current_cash: 30000,
    investment_assets: 250000,
    yearly_savings_rate: 0.15,
    salary: 96000,
    portfolio: { stocks: 0.7, bonds: 0.3 },
    risk_appetite: "medium",
    target_retire_age: 65,
    target_monthly_income: 4000,
    advisor_id: "advisor-jane",
    jurisdiction: "US",
    escalation_enabled: true,
    status: "healthy",
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2026-02-01T14:30:00Z",
  },
  "conservative-saver": {
    id: "conservative-saver",
    name: "Linda Thompson",
    email: "linda.thompson@email.com",
    role: "client",
    age: 55,
    current_cash: 80000,
    investment_assets: 600000,
    yearly_savings_rate: 0.12,
    salary: 85000,
    portfolio: { stocks: 0.4, bonds: 0.5, cash: 0.1 },
    risk_appetite: "low",
    target_retire_age: 67,
    target_monthly_income: 4500,
    advisor_id: "advisor-jane",
    jurisdiction: "US",
    escalation_enabled: true,
    status: "healthy",
    created_at: "2022-05-01T12:00:00Z",
    updated_at: "2026-02-01T10:30:00Z",
  },
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(dateStr).toLocaleDateString()
}

function getPriorityColor(priority: EscalationPriority): string {
  const colors = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-gray-100 text-gray-700 border-gray-200",
  }
  return colors[priority]
}

function getStatusColor(status: EscalationStatus): string {
  const colors = {
    pending: "bg-yellow-100 text-yellow-700",
    in_progress: "bg-blue-100 text-blue-700",
    resolved: "bg-green-100 text-green-700",
    escalated_to_compliance: "bg-purple-100 text-purple-700",
  }
  return colors[status]
}

function getReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    user_requested: "Client Requested",
    ai_complexity: "AI Complexity",
    regulatory_question: "Regulatory",
    high_value_decision: "High-Value Decision",
  }
  return labels[reason] || reason
}

// ─── Escalation Card ────────────────────────────────────────────────────────

interface EscalationCardProps {
  escalation: EscalationTicket
  client?: ClientProfile
  onClick: () => void
}

const EscalationCard: React.FC<EscalationCardProps> = ({ escalation, client, onClick }) => {
  return (
    <Card 
      className={`p-4 cursor-pointer hover:shadow-md transition-all border-l-4 ${
        escalation.priority === "urgent" ? "border-l-red-500" :
        escalation.priority === "high" ? "border-l-orange-500" :
        escalation.priority === "medium" ? "border-l-amber-500" :
        "border-l-gray-400"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(escalation.priority)}`}>
              {escalation.priority}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(escalation.status)}`}>
              {escalation.status.replace("_", " ")}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {getReasonLabel(escalation.reason)}
            </span>
          </div>
          
          {/* Client Info */}
          {client && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-700">
                {client.name.split(" ").map(n => n[0]).join("")}
              </div>
              <span className="text-sm font-medium text-gray-900">{client.name}</span>
              <span className="text-xs text-gray-500">({client.jurisdiction})</span>
            </div>
          )}
          
          {/* Question */}
          <p className="text-sm text-gray-900 font-medium line-clamp-2">{escalation.client_question}</p>
          
          {/* Context */}
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{escalation.context_summary}</p>
          
          {/* Footer */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(escalation.created_at)}
            </span>
            {escalation.ai_confidence_score !== undefined && (
              <span className={`flex items-center gap-1 ${
                escalation.ai_confidence_score < 0.7 ? "text-amber-600" : "text-gray-500"
              }`}>
                AI Confidence: {(escalation.ai_confidence_score * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </Card>
  )
}

// ─── Escalation Detail Modal ────────────────────────────────────────────────

const EscalationDetailModal: React.FC<EscalationDetailModalProps> = ({
  escalation,
  client,
  onClose,
  onResolve,
  onUpdateStatus,
}) => {
  const [resolutionType, setResolutionType] = useState<ResolutionType>("answered")
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [showResolutionForm, setShowResolutionForm] = useState(false)
  const [customResponse, setCustomResponse] = useState(escalation.suggested_response || "")
  
  const handleResolve = () => {
    onResolve({ type: resolutionType, notes: resolutionNotes })
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Escalation Details</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(escalation.priority)}`}>
                {escalation.priority}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(escalation.status)}`}>
                {escalation.status.replace("_", " ")}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Client Info */}
          {client && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-medium text-indigo-700">
                {client.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <div className="font-medium text-gray-900">{client.name}</div>
                <div className="text-sm text-gray-500">
                  Age {client.age} • {client.jurisdiction} • {client.risk_appetite} risk
                </div>
              </div>
            </div>
          )}
          
          {/* Question */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Client Question</h3>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-gray-900">{escalation.client_question}</p>
            </div>
          </div>
          
          {/* Context */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Context Summary</h3>
            <p className="text-sm text-gray-600">{escalation.context_summary}</p>
          </div>
          
          {/* AI Suggested Response */}
          {escalation.suggested_response && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">AI Suggested Response</h3>
              <textarea
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                className="w-full p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-sm resize-none"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">Edit the response before sending to client</p>
            </div>
          )}
          
          {/* Resolution Form */}
          {showResolutionForm && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Resolve Escalation</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Resolution Type</label>
                  <select
                    value={resolutionType}
                    onChange={(e) => setResolutionType(e.target.value as ResolutionType)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="answered">Answered</option>
                    <option value="meeting_scheduled">Meeting Scheduled</option>
                    <option value="referred_out">Referred Out</option>
                    <option value="no_action_needed">No Action Needed</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Resolution Notes</label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Add notes about how this was resolved..."
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex gap-2">
            {escalation.status === "pending" && (
              <button
                onClick={() => onUpdateStatus("in_progress")}
                className="px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
              >
                Mark In Progress
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            {!showResolutionForm ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowResolutionForm(true)}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  Resolve
                </button>
                {customResponse && (
                  <button className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <Send className="w-4 h-4 inline mr-1" />
                    Send Response
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowResolutionForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={!resolutionNotes.trim()}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Confirm Resolution
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const EscalationQueue: React.FC<EscalationQueueProps> = ({
  advisorId,
  onViewClient,
  isMockMode = true,
}) => {
  const [escalations, setEscalations] = useState<EscalationTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEscalation, setSelectedEscalation] = useState<EscalationTicket | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<EscalationStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<EscalationPriority | "all">("all")
  
  useEffect(() => {
    loadEscalations()
  }, [advisorId, isMockMode])
  
  const loadEscalations = () => {
    setIsLoading(true)
    setTimeout(() => {
      setEscalations(MOCK_ESCALATIONS)
      setIsLoading(false)
    }, 500)
  }
  
  const filteredEscalations = escalations.filter(e => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false
    if (priorityFilter !== "all" && e.priority !== priorityFilter) return false
    return true
  })
  
  // Sort: pending first, then by priority
  const sortedEscalations = [...filteredEscalations].sort((a, b) => {
    // Pending/in_progress before resolved
    const statusOrder = { pending: 0, in_progress: 1, resolved: 2, escalated_to_compliance: 3 }
    const statusDiff = statusOrder[a.status] - statusOrder[b.status]
    if (statusDiff !== 0) return statusDiff
    
    // Then by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
  
  const pendingCount = escalations.filter(e => e.status === "pending").length
  const inProgressCount = escalations.filter(e => e.status === "in_progress").length
  
  const handleResolve = (resolution: { type: ResolutionType; notes: string }) => {
    if (!selectedEscalation) return
    
    setEscalations(escalations.map(e => 
      e.id === selectedEscalation.id
        ? { 
            ...e, 
            status: "resolved" as EscalationStatus,
            resolution_type: resolution.type,
            resolution_notes: resolution.notes,
            resolved_at: new Date().toISOString()
          }
        : e
    ))
    setSelectedEscalation(null)
  }
  
  const handleUpdateStatus = (status: EscalationStatus) => {
    if (!selectedEscalation) return
    
    setEscalations(escalations.map(e => 
      e.id === selectedEscalation.id
        ? { 
            ...e, 
            status,
            acknowledged_at: status === "in_progress" ? new Date().toISOString() : e.acknowledged_at
          }
        : e
    ))
    setSelectedEscalation(prev => prev ? { ...prev, status } : null)
  }
  
  if (isLoading) {
    return (
      <div className="h-full p-4">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Escalations</h1>
            <p className="text-sm text-gray-500">
              {pendingCount} pending • {inProgressCount} in progress
            </p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as EscalationStatus | "all")}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as EscalationPriority | "all")}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      
      {/* Escalation List */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {sortedEscalations.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="w-8 h-8" />}
            title="No escalations"
            description="All client questions are being handled by Sage AI."
          />
        ) : (
          <div className="space-y-3">
            {sortedEscalations.map(escalation => (
              <EscalationCard
                key={escalation.id}
                escalation={escalation}
                client={MOCK_CLIENTS[escalation.client_id]}
                onClick={() => setSelectedEscalation(escalation)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Detail Modal */}
      {selectedEscalation && (
        <EscalationDetailModal
          escalation={selectedEscalation}
          client={MOCK_CLIENTS[selectedEscalation.client_id]}
          onClose={() => setSelectedEscalation(null)}
          onResolve={handleResolve}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  )
}

export default EscalationQueue
