"use client"

import React, { useEffect } from "react"
import { X, Leaf } from "lucide-react"
import { PoweredByLabel } from "@/components/frontend/shared/PoweredByLabel"

// ─── Types ──────────────────────────────────────────────────────────────────

interface SageChatPaneProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  variant?: "client" | "advisor"
}

// ─── Floating Sage Button ───────────────────────────────────────────────────

interface SageFloatingButtonProps {
  onClick: () => void
  variant?: "client" | "advisor"
}

export const SageFloatingButton: React.FC<SageFloatingButtonProps> = ({
  onClick,
  variant = "client",
}) => {
  const isAdvisor = variant === "advisor"
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 group"
      aria-label="Open Sage AI Chat"
    >
      <div className="relative">
        {/* Pulse ring */}
        <div className={`absolute inset-0 w-14 h-14 ${isAdvisor ? "bg-indigo-500/20" : "bg-emerald-500/20"} rounded-2xl animate-ping opacity-50 group-hover:opacity-75`} />
        {/* Button */}
        <div className="relative w-14 h-14 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl flex items-center justify-center shadow-xl shadow-gray-900/30 hover:shadow-2xl hover:shadow-gray-900/40 hover:-translate-y-0.5 transition-all duration-300">
          <Leaf className={`w-6 h-6 ${isAdvisor ? "text-indigo-400" : "text-emerald-400"}`} />
        </div>
      </div>
    </button>
  )
}

// ─── Slide-In Chat Pane ─────────────────────────────────────────────────────

export const SageChatPane: React.FC<SageChatPaneProps> = ({
  isOpen,
  onClose,
  children,
  variant = "client",
}) => {
  const isAdvisor = variant === "advisor"

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-50 transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "min(66.666%, 960px)" }}
      >
        <div className="h-full bg-white shadow-2xl flex flex-col overflow-hidden border-l border-gray-200">
          {/* Pane Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-900 to-gray-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 bg-gradient-to-br ${isAdvisor ? "from-indigo-500 to-indigo-600" : "from-emerald-500 to-emerald-600"} rounded-xl flex items-center justify-center shadow-lg ${isAdvisor ? "shadow-indigo-500/20" : "shadow-emerald-500/20"}`}>
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">Sage AI</h2>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-gray-400">Retirement Planning Assistant</p>
                  <PoweredByLabel product="Copilot" variant="dark" />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

export default SageChatPane
