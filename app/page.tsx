"use client"

import { useState, useEffect } from "react"
import {
  Leaf,
  LayoutDashboard,
  PieChart,
  Clock,
  MessageSquare,
  Bell,
  Users,
  Calendar,
  Briefcase,
  Shield,
  Settings,
  FileText,
  Scale,
  ChevronDown,
  Wifi,
  WifiOff,
  TrendingUp,
} from "lucide-react"
import {
  getUserProfiles,
  type ApiMode,
  setApiMode,
  type UserProfile,
} from "../lib/api"
import type { UserRole, AdvisorProfile, ClientProfile, AppView } from "@/lib/types"
import { MOCK_ADVISOR, MOCK_ADVISORS, getAdvisor } from "@/lib/advisorApi"
import { ProfileBubble } from "@/components/frontend/ProfileBubble"
import { ProfileSelectModal } from "@/components/frontend/ProfileSelectModal"
import { DashboardView } from "@/components/frontend/DashboardView"
import { PortfolioView } from "@/components/frontend/PortfolioView"
import { ActivityView } from "@/components/frontend/ActivityView"
import { PlanningView } from "@/components/frontend/PlanningView"
import { ModeToggle } from "@/components/frontend/shared/ModeToggle"
import { AdvisorDashboard } from "@/components/frontend/advisor/AdvisorDashboard"
import { ClientListView } from "@/components/frontend/advisor/ClientListView"
import { ClientDetailView } from "@/components/frontend/advisor/ClientDetailView"
import { EscalationQueue } from "@/components/frontend/advisor/EscalationQueue"
import { AppointmentCalendar } from "@/components/frontend/advisor/AppointmentCalendar"
import { AdvisorChatView } from "@/components/frontend/advisor/AdvisorChatView"
import { AdvisorScenarioView } from "@/components/frontend/advisor/AdvisorScenarioView"
import { AdminDashboard } from "@/components/frontend/admin/AdminDashboard"
import { getMockClientsForAdvisor } from "@/lib/advisorApi"
import { getPortfolioData } from "@/lib/mockPortfolio"

// ─── Types ──────────────────────────────────────────────────────────────────

type ClientView = "dashboard" | "portfolio" | "activity" | "planning"
type AdvisorView = "advisor-dashboard" | "advisor-clients" | "advisor-client-detail" | "advisor-escalations" | "advisor-appointments" | "advisor-chat" | "advisor-scenarios"
type AdminView = "admin-dashboard" | "admin-products" | "admin-compliance" | "admin-regulatory" | "admin-users"

interface NavItem {
  id: ClientView | AdvisorView | AdminView
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const clientNavItems: NavItem[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "portfolio", label: "Portfolio", icon: PieChart },
  { id: "activity", label: "Activity", icon: Clock },
  { id: "planning", label: "Sage AI", icon: MessageSquare },
]

const advisorNavItems: NavItem[] = [
  { id: "advisor-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "advisor-clients", label: "Clients", icon: Users },
  { id: "advisor-scenarios", label: "Scenarios", icon: TrendingUp },
  { id: "advisor-escalations", label: "Escalations", icon: Bell },
  { id: "advisor-appointments", label: "Appointments", icon: Calendar },
  { id: "advisor-chat", label: "Sage AI", icon: MessageSquare },
]

const adminNavItems: NavItem[] = [
  { id: "admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "admin-products", label: "Products", icon: FileText },
  { id: "admin-compliance", label: "Compliance", icon: Shield },
  { id: "admin-regulatory", label: "Regulatory", icon: Scale },
  { id: "admin-users", label: "Users", icon: Users },
]

// ─── Main App ───────────────────────────────────────────────────────────────

export default function RetirementPlanningApp() {
  // Persona state
  const [currentPersona, setCurrentPersona] = useState<UserRole>("client")
  
  // Client view state
  const [clientView, setClientView] = useState<ClientView>("dashboard")
  
  // Advisor view state
  const [advisorView, setAdvisorView] = useState<AdvisorView>("advisor-dashboard")
  const [currentAdvisor, setCurrentAdvisor] = useState<AdvisorProfile>(MOCK_ADVISOR)
  const [selectedAdvisorClient, setSelectedAdvisorClient] = useState<ClientProfile | null>(null)
  const [availableAdvisors, setAvailableAdvisors] = useState<AdvisorProfile[]>(MOCK_ADVISORS)
  const [showAdvisorDropdown, setShowAdvisorDropdown] = useState(false)
  
  // Admin view state
  const [adminView, setAdminView] = useState<AdminView>("admin-dashboard")
  
  // Shared state
  const [isMockMode, setIsMockMode] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileBubble, setShowProfileBubble] = useState(false)
  const [availableProfiles, setAvailableProfiles] = useState<UserProfile[]>([])

  // Get current nav items based on persona
  const navItems = currentPersona === "client" 
    ? clientNavItems 
    : currentPersona === "advisor" 
    ? advisorNavItems 
    : adminNavItems

  // Get current active view
  const activeView = currentPersona === "client"
    ? clientView
    : currentPersona === "advisor"
    ? advisorView
    : adminView

  // Set active view based on persona
  const setActiveView = (view: string) => {
    if (currentPersona === "client") {
      setClientView(view as ClientView)
    } else if (currentPersona === "advisor") {
      setAdvisorView(view as AdvisorView)
    } else {
      setAdminView(view as AdminView)
    }
  }

  // ── Persona change handler ──
  const handlePersonaChange = (persona: UserRole) => {
    setCurrentPersona(persona)
    // Reset to default view for each persona
    if (persona === "client") {
      setClientView("dashboard")
    } else if (persona === "advisor") {
      setAdvisorView("advisor-dashboard")
    } else {
      setAdminView("admin-dashboard")
    }
  }

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

  // Load advisor data when switching advisors or modes
  useEffect(() => {
    const loadAdvisorData = async () => {
      if (currentPersona !== "advisor") return
      
      if (isMockMode) {
        // Use mock advisors list
        setAvailableAdvisors(MOCK_ADVISORS)
        const mockAdvisor = MOCK_ADVISORS.find(a => a.id === currentAdvisor.id)
        if (mockAdvisor) setCurrentAdvisor(mockAdvisor)
      } else {
        // Fetch from live API
        try {
          const advisor = await getAdvisor(currentAdvisor.id)
          setCurrentAdvisor(advisor)
        } catch (error) {
          console.error("Failed to load advisor from API:", error)
          // Fallback to mock if API fails
        }
      }
    }
    loadAdvisorData()
  }, [currentPersona, isMockMode, currentAdvisor.id])

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

  // Handle advisor client selection
  const handleAdvisorClientSelect = (client: ClientProfile) => {
    setSelectedAdvisorClient(client)
    setAdvisorView("advisor-client-detail")
  }
  
  // Handle back from client detail
  const handleBackFromClientDetail = () => {
    setSelectedAdvisorClient(null)
    setAdvisorView("advisor-clients")
  }

  // Handle advisor switch
  const handleAdvisorSwitch = async (advisorId: string) => {
    setShowAdvisorDropdown(false)
    if (isMockMode) {
      const advisor = MOCK_ADVISORS.find(a => a.id === advisorId)
      if (advisor) {
        setCurrentAdvisor(advisor)
        setSelectedAdvisorClient(null)
        setAdvisorView("advisor-dashboard")
      }
    } else {
      try {
        const advisor = await getAdvisor(advisorId)
        setCurrentAdvisor(advisor)
        setSelectedAdvisorClient(null)
        setAdvisorView("advisor-dashboard")
      } catch (error) {
        console.error("Failed to switch advisor:", error)
      }
    }
  }

  // Handle mode toggle for advisor
  const handleAdvisorModeToggle = () => {
    const newMode = !isMockMode
    setIsMockMode(newMode)
    setApiMode(newMode ? "mock" : "live")
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

  // Get header color based on persona
  const getHeaderAccent = () => {
    switch (currentPersona) {
      case "advisor":
        return "from-indigo-900 to-indigo-800"
      case "admin":
        return "from-amber-900 to-amber-800"
      default:
        return "from-gray-900 to-gray-800"
    }
  }

  const getLeafColor = () => {
    switch (currentPersona) {
      case "advisor":
        return "text-indigo-400"
      case "admin":
        return "text-amber-400"
      default:
        return "text-emerald-400"
    }
  }

  // ── Render ──

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-slate-50/80 to-gray-100">
      {/* Header */}
      <header className="bg-white/95 border-b border-gray-100 sticky top-0 z-40 backdrop-blur-md flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br ${getHeaderAccent()} rounded-xl flex items-center justify-center shadow-lg shadow-gray-900/20`}>
                <Leaf className={`w-4 h-4 sm:w-5 sm:h-5 ${getLeafColor()}`} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Sage</h1>
                <p className="text-[11px] text-gray-400 font-medium">
                  {currentPersona === "advisor" ? "Advisor Portal" : currentPersona === "admin" ? "Admin Portal" : "Retirement Planning"}
                </p>
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
              {/* Unified Persona/Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowAdvisorDropdown(!showAdvisorDropdown)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                    currentPersona === "advisor" 
                      ? "bg-indigo-50 hover:bg-indigo-100" 
                      : currentPersona === "admin"
                      ? "bg-amber-50 hover:bg-amber-100"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {currentPersona === "advisor" ? (
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                  ) : currentPersona === "admin" ? (
                    <Shield className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Users className="w-4 h-4 text-gray-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    currentPersona === "advisor" 
                      ? "text-indigo-700" 
                      : currentPersona === "admin"
                      ? "text-amber-700"
                      : "text-gray-700"
                  }`}>
                    {currentPersona === "advisor" 
                      ? currentAdvisor.name 
                      : currentPersona === "admin" 
                      ? "Admin"
                      : selectedProfile?.name || "Client"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAdvisorDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Unified Dropdown menu */}
                {showAdvisorDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowAdvisorDropdown(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                      {/* Persona Section */}
                      <div className="p-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500 font-medium px-2 mb-2">Switch Persona</p>
                        <div className="flex gap-1">
                          {[
                            { id: "client" as UserRole, label: "Client", icon: Users, color: "gray" },
                            { id: "advisor" as UserRole, label: "Advisor", icon: Briefcase, color: "indigo" },
                            { id: "admin" as UserRole, label: "Admin", icon: Shield, color: "amber" },
                          ].map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                handlePersonaChange(p.id)
                                setShowAdvisorDropdown(false)
                              }}
                              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                currentPersona === p.id
                                  ? `bg-${p.color}-100 text-${p.color}-700`
                                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                              }`}
                            >
                              <p.icon className="w-3.5 h-3.5" />
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Mode Toggle */}
                      <div className="p-2 border-b border-gray-100">
                        <div className="flex items-center justify-between px-2">
                          <span className="text-xs text-gray-500 font-medium">API Mode</span>
                          <button
                            onClick={handleAdvisorModeToggle}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isMockMode 
                                ? "bg-amber-50 text-amber-700" 
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {isMockMode ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                            {isMockMode ? "Demo" : "Live"}
                          </button>
                        </div>
                      </div>
                      
                      {/* Advisor Selection - only show in advisor mode */}
                      {currentPersona === "advisor" && (
                        <div className="p-2 border-b border-gray-100">
                          <p className="text-xs text-gray-500 font-medium px-2 mb-2">Switch Advisor</p>
                          {availableAdvisors.map((advisor) => (
                            <button
                              key={advisor.id}
                              onClick={() => handleAdvisorSwitch(advisor.id)}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                                advisor.id === currentAdvisor.id 
                                  ? "bg-indigo-50 text-indigo-700" 
                                  : "hover:bg-gray-50 text-gray-700"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                                <span className="text-xs font-semibold text-indigo-700">
                                  {advisor.name.split(" ").map(n => n[0]).join("")}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{advisor.name}</p>
                                <p className="text-xs text-gray-400">{advisor.jurisdictions?.join(", ")}</p>
                              </div>
                              {advisor.id === currentAdvisor.id && (
                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Client Profile - only show in client mode */}
                      {currentPersona === "client" && selectedProfile && (
                        <div className="p-2 border-b border-gray-100">
                          <button
                            onClick={() => {
                              setShowProfileModal(true)
                              setShowAdvisorDropdown(false)
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                              <span className="text-xs font-semibold text-emerald-700">
                                {selectedProfile.name.split(" ").map(n => n[0]).join("")}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{selectedProfile.name}</p>
                              <p className="text-xs text-gray-400">Click to switch profile</p>
                            </div>
                          </button>
                        </div>
                      )}
                      
                      {/* Footer info */}
                      <div className="p-2 bg-gray-50">
                        <p className="text-xs text-gray-400 px-2">
                          {isMockMode ? "Using demo data" : "Connected to live API"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Notification bell - only for client mode */}
              {currentPersona === "client" && (
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
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Client Views */}
        {currentPersona === "client" && (
          <>
            {clientView === "dashboard" && (
              <DashboardView
                selectedProfile={selectedProfile}
                onNavigate={(view) => setClientView(view as ClientView)}
              />
            )}
            {clientView === "portfolio" && (
              <PortfolioView
                selectedProfile={selectedProfile}
                onBack={() => setClientView("dashboard")}
              />
            )}
            {clientView === "activity" && (
              <ActivityView
                selectedProfile={selectedProfile}
                onBack={() => setClientView("dashboard")}
              />
            )}
            {clientView === "planning" && (
              <PlanningView
                selectedProfile={selectedProfile}
                isMockMode={isMockMode}
                onBack={() => setClientView("dashboard")}
              />
            )}
          </>
        )}
        
        {/* Advisor Views */}
        {currentPersona === "advisor" && (
          <>
            {advisorView === "advisor-dashboard" && (
              <AdvisorDashboard
                advisor={currentAdvisor}
                onNavigateToClients={() => setAdvisorView("advisor-clients")}
                onNavigateToAppointments={() => setAdvisorView("advisor-appointments")}
                onSelectClient={handleAdvisorClientSelect}
                onRunScenarioAnalysis={() => {
                  setAdvisorView("advisor-scenarios")
                }}
                isMockMode={isMockMode}
              />
            )}
            {advisorView === "advisor-scenarios" && (
              <AdvisorScenarioView
                advisor={currentAdvisor}
                onSelectClient={handleAdvisorClientSelect}
                onBack={() => setAdvisorView("advisor-dashboard")}
                isMockMode={isMockMode}
              />
            )}
            {advisorView === "advisor-clients" && (
              <ClientListView
                advisorId={currentAdvisor.id}
                onSelectClient={handleAdvisorClientSelect}
                isMockMode={isMockMode}
              />
            )}
            {advisorView === "advisor-client-detail" && selectedAdvisorClient && (
              <ClientDetailView
                client={selectedAdvisorClient}
                advisorId={currentAdvisor.id}
                onBack={handleBackFromClientDetail}
                isMockMode={isMockMode}
              />
            )}
            {advisorView === "advisor-escalations" && (
              <EscalationQueue
                advisorId={currentAdvisor.id}
                isMockMode={isMockMode}
              />
            )}
            {advisorView === "advisor-appointments" && (
              <AppointmentCalendar
                advisorId={currentAdvisor.id}
                isMockMode={isMockMode}
              />
            )}
            {advisorView === "advisor-chat" && (
              <AdvisorChatView
                advisor={currentAdvisor}
                clients={getMockClientsForAdvisor(currentAdvisor.id)}
                isMockMode={isMockMode}
              />
            )}
          </>
        )}
        
        {/* Admin Views */}
        {currentPersona === "admin" && (
          <AdminDashboard
            admin={{
              id: "admin-alice",
              email: "alice.admin@sagefinancial.com",
              name: "Alice Administrator",
              role: "admin",
              permissions: ["manage_products", "review_compliance", "manage_users", "view_analytics"],
              created_at: "2024-01-01T10:00:00Z",
              updated_at: "2026-02-01T10:00:00Z",
            }}
            isMockMode={isMockMode}
          />
        )}
      </main>

      {/* Mobile Bottom Tabs */}
      <nav className="md:hidden bg-white border-t border-gray-100 backdrop-blur-md flex-shrink-0 safe-bottom">
        <div className="flex justify-around py-2 pb-3">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeView === id
            const activeColor = currentPersona === "advisor" 
              ? "text-indigo-600" 
              : currentPersona === "admin" 
              ? "text-amber-600" 
              : "text-emerald-600"
            const activeBg = currentPersona === "advisor" 
              ? "bg-indigo-50" 
              : currentPersona === "admin" 
              ? "bg-amber-50" 
              : "bg-emerald-50"
            
            return (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? activeBg : ""}`}>
                  <Icon className={`w-5 h-5 ${isActive ? activeColor : ""}`} />
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? "text-gray-900" : ""}`}>
                  {label}
                </span>
              </button>
            )
          })}
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
