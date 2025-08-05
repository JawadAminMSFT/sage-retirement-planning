"use client"

import { useState, useEffect } from "react"
import {
  Leaf,
  LayoutDashboard,
  PieChart,
  Clock,
  MessageSquare,
  Bell,
} from "lucide-react"
import {
  getUserProfiles,
  type ApiMode,
  setApiMode,
  type UserProfile,
} from "../lib/api"
import { ProfileBubble } from "@/components/frontend/ProfileBubble"
import { ProfileSelectModal } from "@/components/frontend/ProfileSelectModal"
import { DashboardView } from "@/components/frontend/DashboardView"
import { PortfolioView } from "@/components/frontend/PortfolioView"
import { ActivityView } from "@/components/frontend/ActivityView"
import { PlanningView } from "@/components/frontend/PlanningView"
import { getPortfolioData } from "@/lib/mockPortfolio"

// ─── Types ──────────────────────────────────────────────────────────────────

type AppView = "dashboard" | "portfolio" | "activity" | "planning"

interface NavItem {
  id: AppView
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "portfolio", label: "Portfolio", icon: PieChart },
  { id: "activity", label: "Activity", icon: Clock },
  { id: "planning", label: "Sage AI", icon: MessageSquare },
]

// ─── Main App ───────────────────────────────────────────────────────────────

export default function RetirementPlanningApp() {
  const [activeView, setActiveView] = useState<AppView>("dashboard")
  const [isMockMode, setIsMockMode] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileBubble, setShowProfileBubble] = useState(false)
  const [availableProfiles, setAvailableProfiles] = useState<UserProfile[]>([])

  // ── Load initial data ──

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setApiMode(isMockMode ? "mock" : "live")
        const profiles = await getUserProfiles()
        setAvailableProfiles(profiles)
        if (!selectedProfile && profiles.length > 0) setSelectedProfile(profiles[0])
      } catch (error) {
        console.error("Failed to load initial data:", error)
      }
    }
    loadInitialData()
  }, [isMockMode])

  // ── Handlers ──

  const handleProfileSelect = (profile: UserProfile) => {
    setSelectedProfile(profile)
    setShowProfileModal(false)
    setShowProfileBubble(false)
  }

  const handleModeChange = (mode: ApiMode) => {
    setApiMode(mode)
    setIsMockMode(mode === "mock")
    setShowProfileBubble(false)
  }

  // Notification count
  const notificationCount = selectedProfile
    ? getPortfolioData({
        age: selectedProfile.age,
        salary: selectedProfile.salary,
        risk_appetite: selectedProfile.risk_appetite,
        target_retire_age: selectedProfile.target_retire_age,
        yearly_savings_rate: selectedProfile.yearly_savings_rate,
        name: selectedProfile.name,
        target_monthly_income: selectedProfile.target_monthly_income,
        investment_assets: selectedProfile.investment_assets,
      }).notifications.filter((n) => !n.read).length
    : 0

  // ── Render ──

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-slate-50/80 to-gray-100">
      {/* Header */}
      <header className="bg-white/95 border-b border-gray-100 sticky top-0 z-40 backdrop-blur-md flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl flex items-center justify-center shadow-lg shadow-gray-900/20">
                <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Sage</h1>
                <p className="text-[11px] text-gray-400 font-medium">Retirement Planning</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveView(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeView === id
                      ? "bg-white text-gray-900 shadow-sm border border-gray-100"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <button
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                onClick={() => setActiveView("dashboard")}
              >
                <Bell className="w-5 h-5 text-gray-400" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                    {notificationCount}
                  </span>
                )}
              </button>
              <ProfileBubble
                selectedProfile={selectedProfile}
                isMockMode={isMockMode}
                showBubble={showProfileBubble}
                onToggleBubble={() => setShowProfileBubble((v) => !v)}
                onModeChange={handleModeChange}
                onOpenProfileModal={() => setShowProfileModal(true)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeView === "dashboard" && (
          <DashboardView
            selectedProfile={selectedProfile}
            onNavigate={setActiveView}
          />
        )}
        {activeView === "portfolio" && (
          <PortfolioView
            selectedProfile={selectedProfile}
            onBack={() => setActiveView("dashboard")}
          />
        )}
        {activeView === "activity" && (
          <ActivityView
            selectedProfile={selectedProfile}
            onBack={() => setActiveView("dashboard")}
          />
        )}
        {activeView === "planning" && (
          <PlanningView
            selectedProfile={selectedProfile}
            isMockMode={isMockMode}
            onBack={() => setActiveView("dashboard")}
          />
        )}
      </main>

      {/* Mobile Bottom Tabs */}
      <nav className="md:hidden bg-white border-t border-gray-100 backdrop-blur-md flex-shrink-0 safe-bottom">
        <div className="flex justify-around py-2 pb-3">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200 ${
                activeView === id
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${
                activeView === id ? "bg-emerald-50" : ""
              }`}>
                <Icon
                  className={`w-5 h-5 ${
                    activeView === id ? "text-emerald-600" : ""
                  }`}
                />
              </div>
              <span className={`text-[10px] font-semibold ${
                activeView === id ? "text-gray-900" : ""
              }`}>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Profile Select Modal */}
      {showProfileModal && (
        <ProfileSelectModal
          profiles={availableProfiles}
          selectedProfileId={selectedProfile?.id}
          isMockMode={isMockMode}
          onSelect={handleProfileSelect}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  )
}
