/**
 * Admin settings page with tabbed navigation.
 *
 * Provides four tabs: Ollama configuration, Agent management,
 * User administration, and UI appearance settings.
 * Only accessible to users with admin privileges.
 */

import { useState } from "react"
import ProviderSettings from "../components/settings/ProviderSettings"
import AgentSettings from "../components/settings/AgentSettings"
import UserManagement from "../components/settings/UserManagement"
import UISettings from "../components/settings/UISettings"
import {
  Settings as SettingsIcon,
  Users,
  Bot,
  Palette,
} from "lucide-react"

const TABS = [
  { id: "provider", label: "Fournisseur LLM", icon: SettingsIcon },
  { id: "agents", label: "Agents IA", icon: Bot },
  { id: "users", label: "Utilisateurs", icon: Users },
  { id: "ui", label: "Apparence", icon: Palette },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState("provider")

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold mb-1">Administration</h1>
          <p className="text-muted-foreground text-sm">
            Gérez les paramètres, agents et utilisateurs
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-8 animate-fade-in">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium flex-1 justify-center transition-all ${activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="animate-fade-in-flat">
          {activeTab === "provider" && <ProviderSettings />}
          {activeTab === "agents" && <AgentSettings />}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "ui" && <UISettings />}
        </div>
      </div>
    </div>
  )
}
