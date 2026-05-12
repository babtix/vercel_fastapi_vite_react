import { useState, useEffect } from "react"
import api from "../../lib/api"
import ModelSelector from "./ModelSelector"
import { Bot, Save, Check } from "lucide-react"

export default function OllamaSettings() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

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
    } catch {
      setMessage({ type: "error", text: "Échec de la sauvegarde" })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const fields = [
    { key: "OLLAMA_URL", label: "URL d'Ollama", type: "text" },
    { key: "OLLAMA_TIMEOUT", label: "Timeout (secondes)", type: "number", step: "1" },
    { key: "MODEL_TEMPERATURE", label: "Température", type: "number", step: "0.1", min: 0, max: 2 },
    { key: "MODEL_TOP_P", label: "Top P", type: "number", step: "0.05", min: 0, max: 1 },
    { key: "MODEL_TOP_K", label: "Top K", type: "number", step: "1", min: 1 },
    { key: "MODEL_REPEAT_PENALTY", label: "Repeat Penalty", type: "number", step: "0.1", min: 0 },
    { key: "MODEL_NUM_PREDICT", label: "Num Predict (max tokens)", type: "number", step: "1", min: 1 },
    { key: "MODEL_NUM_CTX", label: "Num Context (taille contexte)", type: "number", step: "1", min: 512 },
  ]

  return (
    <div className="space-y-6">
      {/* Default Model Selector */}
      <div className="space-y-2 bg-card border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-4 h-4 text-primary" />
          <label className="text-sm font-semibold">Modèle par défaut</label>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Le modèle Ollama utilisé par défaut pour les nouveaux agents
        </p>
        <ModelSelector
          value={settings.DEFAULT_MODEL_NAME ?? ""}
          provider="ollama"
          onChange={(name) =>
            setSettings((prev) => ({ ...prev, DEFAULT_MODEL_NAME: name }))
          }
        />
      </div>

      {/* Other settings grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(({ key, label, type, ...props }) => (
          <div key={key} className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">{label}</label>
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
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        ))}
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl animate-fade-in ${message.type === "success"
            ? "bg-primary/10 text-primary border border-primary/20"
            : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
        >
          <Check className="w-4 h-4" />
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
