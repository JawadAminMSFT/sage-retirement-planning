"use client"

import React from "react"
import { ChevronDown, Settings, Database, Cloud } from "lucide-react"
import type { UserProfile, ApiMode, DataSourceMode } from "@/lib/api"
import { formatCurrency } from "@/lib/analysis"

interface ProfileBubbleProps {
  selectedProfile: UserProfile | null
  isMockMode: boolean
  showBubble: boolean
  onToggleBubble: () => void
  onModeChange: (mode: ApiMode) => void
  onOpenProfileModal: () => void
  /** Current data source for live mode (client persona only) */
  dataSourceMode?: DataSourceMode
  /** Callback when data source is changed */
  onDataSourceChange?: (mode: DataSourceMode) => void
  /** Whether the Fabric Data Agent is available (configured on backend) */
  fabricAvailable?: boolean
}

export const ProfileBubble: React.FC<ProfileBubbleProps> = ({
  selectedProfile,
  isMockMode,
  showBubble,
  onToggleBubble,
  onModeChange,
  onOpenProfileModal,
  dataSourceMode = "local",
  onDataSourceChange,
  fabricAvailable = false,
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggleBubble}
        className="flex items-center gap-3 bg-white/90 hover:bg-green-50/90 border border-green-200/60 px-4 py-2 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm shadow-sm group"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center ring-2 ring-green-200/50 group-hover:ring-green-300/60 transition-all">
          <span className="text-white text-sm font-bold">
            {selectedProfile?.name.charAt(0) || "U"}
          </span>
        </div>
        <div className="hidden sm:block text-left">
          <span className="text-sm text-gray-800 font-semibold">
            {selectedProfile?.name || "Select Profile"}
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${isMockMode ? "bg-amber-500" : dataSourceMode === "fabric" ? "bg-blue-500" : "bg-green-500"}`}
            />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
              {isMockMode ? "Demo" : dataSourceMode === "fabric" ? "Fabric" : "Live"}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showBubble ? "rotate-180" : ""}`}
        />
      </button>

      {showBubble && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={onToggleBubble} />

          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200/80 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
            {/* Profile info */}
            <div className="p-5 bg-gradient-to-br from-green-50/80 to-emerald-50/60">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {selectedProfile?.name.charAt(0) || "U"}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedProfile?.name || "No Profile"}
                  </h3>
                  <p className="text-xs text-gray-500">{selectedProfile?.description}</p>
                </div>
              </div>
              {selectedProfile && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Age", value: selectedProfile.age },
                    { label: "Salary", value: formatCurrency(selectedProfile.salary) },
                    { label: "Risk", value: selectedProfile.risk_appetite },
                    { label: "Retire at", value: selectedProfile.target_retire_age },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between bg-white/60 rounded-lg px-2.5 py-1.5"
                    >
                      <span className="text-gray-500">{item.label}</span>
                      <span className="font-semibold text-gray-800 capitalize">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mode toggle */}
            <div className="px-5 py-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${isMockMode ? "bg-amber-500" : "bg-green-500"}`}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {isMockMode ? "Demo Mode" : "Live Mode"}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!isMockMode}
                    onChange={(e) => onModeChange(e.target.checked ? "live" : "mock")}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm" />
                </label>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {isMockMode
                  ? "Using simulated data — no backend required"
                  : "Connected to Azure AI backend"}
              </p>
            </div>

            {/* Data Source selector — only shown in Live mode */}
            {!isMockMode && onDataSourceChange && (
              <div className="px-5 py-3 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2 block">
                  Data Source
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onDataSourceChange("local")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      dataSourceMode === "local"
                        ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    Local
                  </button>
                  <button
                    onClick={() => onDataSourceChange("fabric")}
                    disabled={!fabricAvailable}
                    title={fabricAvailable ? "Query Fabric Data Agent" : "Fabric Data Agent not configured"}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      dataSourceMode === "fabric"
                        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                        : fabricAvailable
                        ? "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        : "bg-gray-50 text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    Fabric
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {dataSourceMode === "fabric"
                    ? "Querying Microsoft Fabric Data Agent"
                    : "Using local profile data"}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="px-3 py-2 border-t border-gray-100">
              <button
                onClick={() => {
                  onOpenProfileModal()
                  onToggleBubble()
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 rounded-xl transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 font-medium">Switch Profile</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ProfileBubble
