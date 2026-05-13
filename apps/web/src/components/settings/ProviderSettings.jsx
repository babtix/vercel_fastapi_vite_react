/**
 * OpenRouter provider settings panel.
 *
 * Lets administrators configure the OpenRouter API key, select the global
 * default model, and tune shared model generation parameters.
 * All changes are persisted to the backend .env via PUT /settings/.
 */

import { useState, useEffect } from "react"
import api from "../../lib/api"
import ModelSelector from "./ModelSelector"
import { Bot, Save, Check, Key, AlertCircle, ExternalLink, Zap } from "lucide-react"

export default function ProviderSettings() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await api.get("/settings/")
      setSettings(res.data)
    } catch {
      // Settings page will remain in loading state
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      await api.put("/settings/", settings)
      setMessage({ type: "success", text: "Paramètres enregistrés avec succès" })
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Échec de la sauvegarde",
      })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasApiKey =
    settings.OPENROUTER_API_KEY && settings.OPENROUTER_API_KEY.startsWith("sk-or-")

  const modelParams = [
    { key: "MODEL_TEMPERATURE", label: "Température", type: "number", step: "0.1", min: 0, max: 2 },
    { key: "MODEL_TOP_P", label: "Top P", type: "number", step: "0.05", min: 0, max: 1 },
    { key: "MODEL_TOP_K", label: "Top K", type: "number", step: "1", min: 1 },
    { key: "MODEL_REPEAT_PENALTY", label: "Repeat Penalty", type: "number", step: "0.1", min: 0 },
    { key: "MODEL_NUM_PREDICT", label: "Max Tokens", type: "number", step: "1", min: 1 },
    { key: "MODEL_NUM_CTX", label: "Context Window", type: "number", step: "1", min: 512 },
  ]

  return (
    <div className="space-y-6">
      {/* OpenRouter API Key */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Clé API OpenRouter</p>
              <p className="text-xs text-muted-foreground">Héritée par tous les agents</p>
            </div>
          </div>
          {hasApiKey ? (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
              <Check className="w-3 h-3" />
              Configurée
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">
              <AlertCircle className="w-3 h-3" />
              Non configurée
            </span>
          )}
        </div>

        <div className="relative">
          <input
            id="openrouter-api-key"
            type={showKey ? "text" : "password"}
            value={settings.OPENROUTER_API_KEY ?? ""}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, OPENROUTER_API_KEY: e.target.value }))
            }
            placeholder="sk-or-v1-..."
            className="w-full px-3 py-2.5 pr-24 rounded-xl bg-background border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-accent"
          >
            {showKey ? "Masquer" : "Afficher"}
          </button>
        </div>

        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          Obtenir une clé API sur openrouter.ai
        </a>
      </div>

      {/* Default Model */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Modèle par défaut</p>
            <p className="text-xs text-muted-foreground">
              Hérité par les nouveaux agents · provider:{" "}
              <span className="text-primary font-medium">openrouter</span>
            </p>
          </div>
        </div>
        <ModelSelector
          value={settings.DEFAULT_MODEL_NAME ?? ""}
          provider="openrouter"
          onChange={(name) =>
            setSettings((prev) => ({ ...prev, DEFAULT_MODEL_NAME: name }))
          }
        />
      </div>

      {/* Model Parameters */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Paramètres de génération</p>
            <p className="text-xs text-muted-foreground">Appliqués globalement à tous les agents</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modelParams.map(({ key, label, type, ...props }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{label}</label>
              <input
                type={type}
                value={settings[key] ?? ""}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value,
                  }))
                }
                {...props}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl animate-fade-in ${
            message.type === "success"
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {message.type === "success" ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-primary/20"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Enregistrer
      </button>
    </div>
  )
}
