"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Bot, ArrowLeft } from "lucide-react"
import {
  chatWithAssistantStreaming,
  getQuickScenarios,
  type UserProfile,
  type EvaluationContext,
  type EvaluationResult,
  evaluateAgentRun,
} from "@/lib/api"
import {
  type ExtendedChatMessage,
  type AnalysisDisplayData,
  convertAnalysisToDisplayData,
} from "@/lib/analysis"
import { StatusBubble } from "@/components/frontend/StatusBubble"
import { QuickScenariosCard } from "@/components/frontend/QuickScenariosCard"
import { AnalysisCard } from "@/components/frontend/AnalysisCard"

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlanningViewProps {
  selectedProfile: UserProfile | null
  isMockMode: boolean
  onBack: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export const PlanningView: React.FC<PlanningViewProps> = ({
  selectedProfile,
  isMockMode,
  onBack,
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── Scroll & hydration ──

  useEffect(() => setIsClient(true), [])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, currentStatus])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [currentMessage])

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
                !finalAnalysis &&
                selectedProfile
              ) {
                finalAnalysis = convertAnalysisToDisplayData(
                  update.data.analysis,
                  selectedProfile,
                )
              }
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last?.role === "assistant") {
                  last.content =
                    update.data.response || accumulatedContent
                  if (finalAnalysis) last.analysis = finalAnalysis
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
      }
    },
    [isLoading, selectedProfile, messages],
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
      {/* Chat header (mobile back button) */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200/60 bg-white/60 backdrop-blur-sm md:hidden">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="font-semibold text-gray-900">Plan with Sage</h2>
      </div>

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
              </div>
            </div>
          ))}

          {currentStatus && <StatusBubble status={currentStatus} />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200/60 p-4 sm:p-6 bg-white/60 backdrop-blur-sm">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me about your retirement planning goals..."
            disabled={isLoading || !selectedProfile}
            rows={1}
            className="flex-1 px-4 py-3 border border-green-300/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/60 text-base placeholder-gray-400 bg-white/80 backdrop-blur-sm resize-none leading-normal"
          />
          <button
            onClick={() => sendMessage(currentMessage)}
            disabled={
              isLoading || !currentMessage.trim() || !selectedProfile
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
