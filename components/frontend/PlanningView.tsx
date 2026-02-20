"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Bot, ArrowLeft, History, Plus, Trash2, X, Loader2 } from "lucide-react"
import {
  chatWithAssistantStreaming,
  getQuickScenarios,
  type UserProfile,
  type EvaluationContext,
  type EvaluationResult,
  evaluateAgentRun,
  listConversations,
  getConversation,
  saveConversation,
  deleteConversation,
  type ConversationSummary,
  getApiMode,
  submitScenarioConsent,
} from "@/lib/api"
import {
  type ExtendedChatMessage,
  type AnalysisDisplayData,
  convertAnalysisToDisplayData,
} from "@/lib/analysis"
import { StatusBubble } from "@/components/frontend/StatusBubble"
import { QuickScenariosCard } from "@/components/frontend/QuickScenariosCard"
import { AnalysisCard } from "@/components/frontend/AnalysisCard"
import { useVoiceSession } from "@/components/frontend/shared/voice/useVoiceSession"
import VoiceButton from "@/components/frontend/shared/voice/VoiceButton"
import VoiceWaveform from "@/components/frontend/shared/voice/VoiceWaveform"
import VoiceStatusIndicator from "@/components/frontend/shared/voice/VoiceStatusIndicator"

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlanningViewProps {
  selectedProfile: UserProfile | null
  isMockMode: boolean
  onBack: () => void
  embedded?: boolean
}

// ─── Component ──────────────────────────────────────────────────────────────

export const PlanningView: React.FC<PlanningViewProps> = ({
  selectedProfile,
  isMockMode,
  onBack,
  embedded = false,
}) => {
  const [isClient, setIsClient] = useState(false)
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm Sage, your AI retirement planning assistant. I can help you explore different retirement scenarios, analyze their outcomes, and recommend specific products and strategies. Try asking me something like 'What if I retire at 62 instead of 65?' or use one of the quick scenarios below.",
      timestamp: Date.now(),
      analysis: null,
      showQuickScenarios: true,
    },
  ])
  const [currentMessage, setCurrentMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<string | null>(null)
  const [quickScenarios, setQuickScenarios] = useState<string[]>([])
  const [evaluationResults, setEvaluationResults] = useState<
    Record<string, EvaluationResult>
  >({})
  const [evaluatingMessages, setEvaluatingMessages] = useState<Set<number>>(
    new Set(),
  )
  
  // Conversation history state
  const [showHistory, setShowHistory] = useState(false)
  const [conversationList, setConversationList] = useState<ConversationSummary[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Use ref to track conversation ID for callbacks (avoids stale closure)
  const conversationIdRef = useRef<string | null>(null)
  useEffect(() => {
    conversationIdRef.current = currentConversationId
  }, [currentConversationId])

  // Voice session hook
  const voiceSession = useVoiceSession({
    conversationId: currentConversationId || undefined,
    userProfile: selectedProfile || undefined,
    onTranscript: (text, isFinal, role) => {
      if (isFinal && role === "user") {
        // Add user voice message to chat
        const userMsg: ExtendedChatMessage = {
          role: "user",
          content: text,
          timestamp: Date.now(),
          analysis: null,
        }
        setMessages((prev) => [...prev, userMsg])
      } else if (isFinal && role === "assistant") {
        // Add assistant voice message to chat
        const assistantMsg: ExtendedChatMessage = {
          role: "assistant",
          content: text,
          timestamp: Date.now(),
          analysis: null,
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    },
    onTurnEnd: (userTranscript, assistantTranscript) => {
      // Turn complete - messages already added via onTranscript
      console.log("Voice turn complete")
    },
    onError: (error) => {
      console.error("Voice error:", error)
      // Could show error toast here
    },
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Scroll & hydration ──

  useEffect(() => setIsClient(true), [])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, currentStatus, voiceSession.interimTranscript])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [currentMessage])
  
  // ── Load conversation list when history panel opens ──
  
  useEffect(() => {
    if (showHistory && selectedProfile && getApiMode() === "live") {
      setLoadingHistory(true)
      listConversations(selectedProfile.id)
        .then(setConversationList)
        .finally(() => setLoadingHistory(false))
    }
  }, [showHistory, selectedProfile])
  
  // ── Auto-save conversation after each message ──
  
  const autoSaveConversation = useCallback(async () => {
    if (!selectedProfile || getApiMode() === "mock" || messages.length <= 1) return
    
    const title = messages.find(m => m.role === "user")?.content.slice(0, 50) || "Conversation"
    const savedMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp).toISOString()
    }))
    
    // Use ref to get current conversation ID (avoids stale closure)
    const existingId = conversationIdRef.current
    
    const id = await saveConversation(
      selectedProfile.id,
      title,
      savedMessages,
      existingId || undefined
    )
    
    if (id && !existingId) {
      setCurrentConversationId(id)
      conversationIdRef.current = id
    }
  }, [selectedProfile, messages])
  
  // ── Save on unmount or navigation ──
  
  useEffect(() => {
    // Save when component unmounts
    return () => {
      if (selectedProfile && getApiMode() === "live" && messages.length > 1) {
        const title = messages.find(m => m.role === "user")?.content.slice(0, 50) || "Conversation"
        const savedMessages = messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp).toISOString()
        }))
        // Fire and forget - can't await in cleanup. Use ref for current ID.
        saveConversation(
          selectedProfile.id,
          title,
          savedMessages,
          conversationIdRef.current || undefined
        )
      }
    }
  }, [selectedProfile, messages])
  
  // ── Handle back with save ──
  
  const handleBack = useCallback(async () => {
    // Save before navigating away
    if (selectedProfile && getApiMode() === "live" && messages.length > 1) {
      await autoSaveConversation()
    }
    onBack()
  }, [selectedProfile, messages, autoSaveConversation, onBack])
  
  // ── Handlers for conversation history ──
  
  const handleNewConversation = async () => {
    // Save current conversation before starting new one
    if (messages.length > 1 && selectedProfile && getApiMode() === "live") {
      await autoSaveConversation()
    }
    // Reset both state and ref
    setCurrentConversationId(null)
    conversationIdRef.current = null
    setMessages([{
      role: "assistant",
      content: "Hello! I'm Sage, your AI retirement planning assistant. I can help you explore different retirement scenarios, analyze their outcomes, and recommend specific products and strategies. Try asking me something like 'What if I retire at 62 instead of 65?' or use one of the quick scenarios below.",
      timestamp: Date.now(),
      analysis: null,
      showQuickScenarios: true,
    }])
    setShowHistory(false)
  }
  
  const handleLoadConversation = async (conversationId: string) => {
    if (!selectedProfile) return
    
    setLoadingHistory(true)
    const conversation = await getConversation(selectedProfile.id, conversationId)
    setLoadingHistory(false)
    
    if (conversation) {
      // Set both state and ref
      setCurrentConversationId(conversation.id)
      conversationIdRef.current = conversation.id
      setMessages(conversation.messages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
        analysis: null,
        showQuickScenarios: false,
      })))
      setShowHistory(false)
    }
  }
  
  const handleDeleteConversation = async (conversationId: string) => {
    if (!selectedProfile) return
    
    const success = await deleteConversation(selectedProfile.id, conversationId)
    if (success) {
      setConversationList(prev => prev.filter(c => c.id !== conversationId))
      if (conversationId === currentConversationId) {
        handleNewConversation()
      }
    }
  }

  // ── Load quick scenarios ──

  useEffect(() => {
    getQuickScenarios()
      .then(setQuickScenarios)
      .catch((e) => console.error("Failed to load scenarios:", e))
  }, [isMockMode])

  // ── Send message (streaming) ──

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading || !selectedProfile) return

      const userMessage: ExtendedChatMessage = {
        role: "user",
        content: message,
        timestamp: Date.now(),
        analysis: null,
        showQuickScenarios: false,
      }

      setMessages((prev) => [...prev, userMessage])
      setCurrentMessage("")
      setIsLoading(true)
      setCurrentStatus("Starting analysis...")

      try {
        let accumulatedContent = ""
        let finalAnalysis: AnalysisDisplayData | null = null
        let finalRawAnalysis: Record<string, any> | null = null

        const streamGenerator = chatWithAssistantStreaming({
          message,
          profile: selectedProfile,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        })

        for await (const update of streamGenerator) {
          switch (update.type) {
            case "status":
              setCurrentStatus(update.data.status)
              break

            case "content":
              accumulatedContent += update.data.content
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last?.role === "assistant" && !last.isStatus) {
                  last.content = accumulatedContent
                } else {
                  next.push({
                    role: "assistant",
                    content: accumulatedContent,
                    timestamp: Date.now(),
                    analysis: null,
                    showQuickScenarios: false,
                  })
                }
                return next
              })
              break

            case "analysis":
              if (update.data.analysis && selectedProfile) {
                finalRawAnalysis = update.data.analysis
                finalAnalysis = convertAnalysisToDisplayData(
                  update.data.analysis,
                  selectedProfile,
                )
                setMessages((prev) => {
                  const next = [...prev]
                  const last = next[next.length - 1]
                  if (last?.role === "assistant") {
                    last.analysis = finalAnalysis
                    last.content =
                      "I've completed your retirement analysis. Here are the results:"
                  }
                  return next
                })
              }
              break

            case "complete":
              setCurrentStatus(null)
              if (
                update.data.analysis &&
                selectedProfile
              ) {
                if (!finalRawAnalysis) {
                  finalRawAnalysis = update.data.analysis
                }
                if (!finalAnalysis) {
                  finalAnalysis = convertAnalysisToDisplayData(
                    update.data.analysis,
                    selectedProfile,
                  )
                }
              }
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last?.role === "assistant") {
                  last.content =
                    update.data.response || accumulatedContent
                  if (finalAnalysis) last.analysis = finalAnalysis
                  if (finalRawAnalysis) {
                    last.consentRequest = {
                      status: "pending",
                      scenario_description: message,
                      analysis_payload: finalRawAnalysis,
                    }
                  }
                  if (update.data.evaluation_context)
                    last.evaluationContext = update.data.evaluation_context
                } else if (finalAnalysis) {
                  next.push({
                    role: "assistant",
                    content:
                      update.data.response || "Analysis completed",
                    timestamp: Date.now(),
                    analysis: finalAnalysis,
                    showQuickScenarios: false,
                    evaluationContext:
                      update.data.evaluation_context || null,
                    consentRequest: finalRawAnalysis
                      ? {
                          status: "pending",
                          scenario_description: message,
                          analysis_payload: finalRawAnalysis,
                        }
                      : null,
                  })
                }
                return next
              })
              break
          }
        }
      } catch (error) {
        console.error("Error sending message:", error)
        setCurrentStatus(null)
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: Date.now(),
            analysis: null,
            showQuickScenarios: false,
          },
        ])
      } finally {
        setIsLoading(false)
        setCurrentStatus(null)
        // Auto-save conversation after completion
        setTimeout(() => autoSaveConversation(), 500)
      }
    },
    [isLoading, selectedProfile, messages, autoSaveConversation],
  )

  const handleConsentDecision = useCallback(
    async (messageIndex: number, decision: "accepted" | "rejected") => {
      if (!selectedProfile) return

      const current = messages[messageIndex]
      const consentRequest = current?.consentRequest
      if (!consentRequest || consentRequest.status !== "pending") return

      setMessages((prev) => {
        const next = [...prev]
        const target = next[messageIndex]
        if (target?.consentRequest) {
          target.consentRequest = {
            ...target.consentRequest,
            status: "submitting",
          }
        }
        return next
      })

      try {
        const result = await submitScenarioConsent({
          user_id: selectedProfile.id,
          advisor_id: selectedProfile.advisor_id,
          scenario_description: consentRequest.scenario_description,
          analysis_payload: consentRequest.analysis_payload || {},
          consent_status: decision,
        })

        setMessages((prev) => {
          const next = [...prev]
          const target = next[messageIndex]
          if (target?.consentRequest) {
            target.consentRequest = {
              ...target.consentRequest,
              status: decision,
              escalation_id: result.escalation_id,
            }
          }
          return next
        })
      } catch (error) {
        console.error("Failed to submit scenario consent:", error)
        setMessages((prev) => {
          const next = [...prev]
          const target = next[messageIndex]
          if (target?.consentRequest) {
            target.consentRequest = {
              ...target.consentRequest,
              status: "pending",
            }
          }
          next.push({
            role: "assistant",
            content: "I couldn’t submit your consent decision right now. Please try again.",
            timestamp: Date.now(),
            analysis: null,
            showQuickScenarios: false,
          })
          return next
        })
      }
    },
    [messages, selectedProfile],
  )

  // ── Evaluate ──

  const handleEvaluateMessage = useCallback(
    async (messageIndex: number, context: EvaluationContext) => {
      if (!context || evaluatingMessages.has(messageIndex)) return
      try {
        setEvaluatingMessages((prev) => new Set(prev).add(messageIndex))
        const result = await evaluateAgentRun(context)
        setEvaluationResults((prev) => ({
          ...prev,
          [`${context.thread_id}:${context.run_id}`]: result,
        }))
      } catch (error) {
        console.error("Evaluation failed:", error)
      } finally {
        setEvaluatingMessages((prev) => {
          const s = new Set(prev)
          s.delete(messageIndex)
          return s
        })
      }
    },
    [evaluatingMessages],
  )

  // ── Key handler ──

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(currentMessage)
    }
  }

  // ── Render ──

  return (
    <div className="h-full flex flex-col">
      {/* Chat header - back/title hidden when embedded, but history controls always visible */}
      {!embedded && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/60 bg-white/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="font-semibold text-gray-900">Consult Sage for Advice</h2>
          </div>
          
          {/* History & New Chat buttons (standalone mode) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showHistory
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </button>
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            </div>
        </div>
      )}

      {/* History & New Chat buttons (embedded / pane mode) */}
      {embedded && (
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-gray-100 bg-white/60 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showHistory
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <History className="w-4 h-4" />
              Conversation History
            </h3>
            {loadingHistory ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading conversations...
              </div>
            ) : conversationList.length === 0 ? (
              <p className="text-sm text-gray-500 py-3">
                No saved conversations yet. Your chats will be automatically saved.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {conversationList.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center justify-between bg-white rounded-lg px-4 py-3 border transition-colors ${
                      conv.id === currentConversationId
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <button
                      onClick={() => handleLoadConversation(conv.id)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {conv.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {conv.message_count} messages • {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                      {conv.preview && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {conv.preview}
                        </p>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteConversation(conv.id)}
                      className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8 max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 animate-in fade-in duration-300 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  message.role === "user"
                    ? "bg-gray-700"
                    : "bg-gradient-to-br from-green-500 to-emerald-600"
                }`}
              >
                {message.role === "user" ? (
                  <span className="text-white text-sm font-bold">U</span>
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Content */}
              <div
                className={`flex-1 max-w-5xl ${
                  message.role === "user" ? "text-right" : ""
                }`}
              >
                <div
                  className={`inline-block p-4 rounded-2xl ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-sm"
                      : "bg-gray-50/80 text-gray-900 border border-gray-200/60"
                  }`}
                >
                  {message.content}
                </div>

                <div
                  className={`text-xs text-gray-400 mt-2 ${
                    message.role === "user" ? "text-right" : ""
                  }`}
                >
                  {isClient &&
                    new Date(message.timestamp).toLocaleTimeString()}
                </div>

                {message.role === "assistant" &&
                  message.showQuickScenarios && (
                    <QuickScenariosCard
                      scenarios={quickScenarios}
                      onSelectScenario={sendMessage}
                    />
                  )}

                {message.role === "assistant" && message.analysis && (
                  <AnalysisCard
                    analysis={message.analysis}
                    messageIndex={index}
                    evaluationContext={message.evaluationContext}
                    evaluationResults={evaluationResults}
                    evaluatingMessages={evaluatingMessages}
                    onEvaluate={handleEvaluateMessage}
                    onSendMessage={sendMessage}
                  />
                )}

                {message.role === "assistant" && message.consentRequest && (
                  <div className="mt-4 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70">
                    <h4 className="text-sm font-semibold text-emerald-900">
                      This scenario looks complex — share with your advisor?
                    </h4>
                    <p className="text-sm text-emerald-800 mt-1 leading-relaxed">
                      With your consent, Sage will share this scenario analysis with your advisor so they can review it and follow up with you.
                    </p>

                    {message.consentRequest.status === "pending" && (
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => handleConsentDecision(index, "accepted")}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Yes, share with advisor
                        </button>
                        <button
                          onClick={() => handleConsentDecision(index, "rejected")}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          No, keep private
                        </button>
                      </div>
                    )}

                    {message.consentRequest.status === "submitting" && (
                      <p className="mt-3 text-sm text-emerald-700">Submitting your choice...</p>
                    )}

                    {message.consentRequest.status === "accepted" && (
                      <p className="mt-3 text-sm text-emerald-700 font-medium">
                        Shared with your advisor. They have been notified for review and follow-up.
                      </p>
                    )}

                    {message.consentRequest.status === "rejected" && (
                      <p className="mt-3 text-sm text-gray-700 font-medium">
                        Kept private. This scenario will not be shared with your advisor.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {currentStatus && <StatusBubble status={currentStatus} />}

          {/* Live voice transcript bubble */}
          {voiceSession.interimTranscript && (
            <div
              className={`flex gap-4 animate-in fade-in duration-200 ${
                voiceSession.interimRole === "user" ? "flex-row-reverse" : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  voiceSession.interimRole === "user"
                    ? "bg-gray-700"
                    : "bg-gradient-to-br from-green-500 to-emerald-600"
                }`}
              >
                {voiceSession.interimRole === "user" ? (
                  <span className="text-white text-sm font-bold">U</span>
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Content */}
              <div
                className={`flex-1 max-w-5xl ${
                  voiceSession.interimRole === "user" ? "text-right" : ""
                }`}
              >
                <div
                  className={`inline-block p-4 rounded-2xl ${
                    voiceSession.interimRole === "user"
                      ? "bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-sm"
                      : "bg-gray-50/80 text-gray-900 border border-gray-200/60"
                  }`}
                >
                  <span>{voiceSession.interimTranscript}</span>
                  <span className="inline-block w-1.5 h-4 ml-1 bg-current opacity-60 animate-pulse rounded-sm align-text-bottom" />
                </div>
                <div className={`text-xs text-gray-400 mt-2 flex items-center gap-1.5 ${
                  voiceSession.interimRole === "user" ? "justify-end" : ""
                }`}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Speaking...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200/60 p-4 sm:p-6 bg-white/60 backdrop-blur-sm">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          {/* Voice Button - LEFT */}
          <VoiceButton
            variant="client"
            isActive={voiceSession.status !== "idle"}
            isDisabled={isLoading || !selectedProfile}
            onToggle={voiceSession.toggleSession}
          />

          {/* Conditional Input Area */}
          {voiceSession.status === "idle" ? (
            <textarea
              ref={textareaRef}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about your retirement planning goals..."
              disabled={isLoading || !selectedProfile}
              rows={1}
              className="flex-1 px-4 py-3 border border-green-300/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/60 text-base placeholder-gray-400 bg-white/80 backdrop-blur-sm resize-none leading-normal animate-in fade-in duration-200"
            />
          ) : (
            <div className="flex-1 px-4 py-2 border border-emerald-300 rounded-xl bg-white/80 backdrop-blur-sm relative overflow-hidden animate-in fade-in duration-200">
              {/* Status pill */}
              <div className="flex justify-center mb-1">
                <VoiceStatusIndicator
                  status={voiceSession.status}
                  variant="client"
                />
              </div>

              {/* Waveform */}
              <VoiceWaveform
                audioLevelRef={voiceSession.audioLevelRef}
                variant="client"
                isActive={voiceSession.status === "listening" || voiceSession.status === "speaking"}
                voiceStatus={voiceSession.status}
              />

              {/* Live transcript */}
              {voiceSession.interimTranscript && (
                <div className="mt-1 text-center animate-in fade-in duration-150">
                  <p className="text-xs text-emerald-600/80 truncate max-w-full px-2">
                    {voiceSession.interimRole === "user" ? (
                      <span className="italic">&ldquo;{voiceSession.interimTranscript}&rdquo;</span>
                    ) : (
                      <span>Sage: {voiceSession.interimTranscript}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Send Button - RIGHT */}
          <button
            onClick={() => sendMessage(currentMessage)}
            disabled={
              isLoading || !currentMessage.trim() || !selectedProfile || voiceSession.status !== "idle"
            }
            className="bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlanningView
