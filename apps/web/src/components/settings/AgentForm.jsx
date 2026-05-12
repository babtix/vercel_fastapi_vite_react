import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import api from "../../lib/api"
import { getAssetUrl } from "../../lib/api"
import ModelSelector from "./ModelSelector"
import {
  X, Save, Bot, Upload, FileText, Image as ImageIcon, Loader2,
  Server, Monitor,
} from "lucide-react"

const PROVIDERS = [
  { id: "ollama", label: "Ollama", icon: Server },
  { id: "lmstudio", label: "LM Studio", icon: Monitor },
]

export default function AgentForm({ agent, onClose, onSaved }) {
  const isEdit = Boolean(agent)

  const [name, setName] = useState(agent?.name || "")
  const [description, setDescription] = useState(agent?.description || "")
  const [modelName, setModelName] = useState(agent?.model_name || "")
  const [provider, setProvider] = useState(agent?.provider || "ollama")
  const [ragEnabled, setRagEnabled] = useState(agent?.rag_enabled || false)
  const [promptFile, setPromptFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(
    agent?.logo_url ? getAssetUrl(agent.logo_url) : null
  )
  const [saving, setSaving] = useState(false)

  const promptInputRef = useRef(null)
  const logoInputRef = useRef(null)

  function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  function handlePromptChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".md")) {
      toast.error("Le fichier prompt doit être un fichier .md")
      e.target.value = ""
      return
    }
    setPromptFile(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Le nom de l'agent est requis")
      return
    }
    if (!description.trim()) {
      toast.error("La description est requise")
      return
    }
    if (!isEdit && !promptFile) {
      toast.error("Le fichier prompt (.md) est requis pour créer un agent")
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append("name", name.trim())
      formData.append("description", description.trim())
      formData.append("model_name", modelName || "llama3.2")
      formData.append("provider", provider)
      formData.append("rag_enabled", ragEnabled)

      if (promptFile) {
        formData.append("prompt_file", promptFile)
      }
      if (logoFile) {
        formData.append("logo_file", logoFile)
      }

      if (isEdit) {
        await api.put(`/agents/${agent._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        toast.success("Agent mis à jour")
      } else {
        await api.post("/agents/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        toast.success("Agent créé avec succès")
      }

      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            {isEdit ? "Modifier l'agent" : "Nouvel agent"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
          {/* Name */}
          <div>
            <label htmlFor="agent-name" className="block text-sm font-medium mb-1.5">
              Nom de l'agent
            </label>
            <input
              id="agent-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Assistant juridique"
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all hover:border-primary/30"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="agent-description" className="block text-sm font-medium mb-1.5">
              Description
            </label>
            <textarea
              id="agent-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le rôle de cet agent..."
              className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all hover:border-primary/30 resize-none"
              rows={3}
            />
          </div>

          {/* Provider */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Fournisseur
            </label>
            <div className="flex gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center border ${
                    provider === p.id
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-card border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
                  }`}
                >
                  <p.icon className="w-4 h-4" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Modèle
            </label>
            <ModelSelector
              value={modelName}
              onChange={setModelName}
              provider={provider}
            />
          </div>

          {/* RAG Toggle */}
          <div className="flex items-center justify-between p-3 bg-card border border-border/50 rounded-xl">
            <div>
              <p className="text-sm font-medium">RAG (Documents)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enrichir l'agent avec vos propres documents
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ragEnabled}
              onClick={() => setRagEnabled(!ragEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                ragEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  ragEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Prompt file */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              System Prompt (.md) {!isEdit && <span className="text-destructive">*</span>}
            </label>
            <button
              type="button"
              onClick={() => promptInputRef.current?.click()}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-dashed transition-all text-sm ${
                promptFile
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border hover:border-primary/30 text-muted-foreground"
              }`}
            >
              <FileText className="w-5 h-5 shrink-0" />
              <span className="truncate">
                {promptFile
                  ? promptFile.name
                  : isEdit
                    ? "Cliquez pour remplacer le prompt (optionnel)"
                    : "Cliquez pour sélectionner un fichier .md"
                }
              </span>
            </button>
            <input
              ref={promptInputRef}
              type="file"
              accept=".md"
              onChange={handlePromptChange}
              className="hidden"
            />
          </div>

          {/* Logo file */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Logo (optionnel)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-border hover:border-primary/30 transition-all flex items-center justify-center overflow-hidden shrink-0"
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {logoFile ? logoFile.name : "Choisir une image"}
                </button>
                <p className="text-[11px] text-muted-foreground/50 mt-1 px-3">
                  PNG, JPG, WEBP, SVG, GIF
                </p>
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEdit ? "Mettre à jour" : "Créer l'agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body)
}
