"use client"

import React from "react"
import { X } from "lucide-react"
import type { UserProfile } from "@/lib/api"
import { formatCurrency } from "@/lib/analysis"

interface ProfileSelectModalProps {
  profiles: UserProfile[]
  selectedProfileId: string | undefined
  isMockMode: boolean
  onSelect: (profile: UserProfile) => void
  onClose: () => void
}

export const ProfileSelectModal: React.FC<ProfileSelectModalProps> = ({
  profiles,
  selectedProfileId,
  isMockMode,
  onSelect,
  onClose,
}) => {
  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Select user profile"
    >
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">Select Profile</h2>
              <p className="text-green-100/80 text-sm mt-0.5">
                {isMockMode
                  ? "Choose a demo profile to explore scenarios"
                  : "Choose a profile to connect with the AI agent"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile list */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="grid gap-3">
            {profiles.map((profile) => {
              const isSelected = selectedProfileId === profile.id
              return (
                <button
                  key={profile.id}
                  onClick={() => onSelect(profile)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 group ${
                    isSelected
                      ? "border-green-500 bg-green-50/80 shadow-md shadow-green-500/10"
                      : "border-gray-200 hover:border-green-300 hover:bg-green-50/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          isSelected
                            ? "bg-gradient-to-br from-green-500 to-emerald-600"
                            : "bg-gray-400 group-hover:bg-green-500"
                        } transition-colors`}
                      >
                        {profile.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                        <p className="text-xs text-gray-500">{profile.description}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                      Age {profile.age}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                    {[
                      { label: "Salary", value: formatCurrency(profile.salary) },
                      { label: "Retire at", value: `Age ${profile.target_retire_age}` },
                      { label: "Risk", value: profile.risk_appetite },
                      { label: "Savings", value: `${Math.round(profile.yearly_savings_rate * 100)}%` },
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-50 rounded-lg px-2.5 py-2">
                        <span className="text-gray-400 block">{item.label}</span>
                        <span className="text-gray-800 font-semibold capitalize">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileSelectModal
