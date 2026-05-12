import { useState, useEffect, useRef } from "react"
import { Cloud, Server, Filter, ChevronDown, RefreshCw, Check } from "lucide-react"
import api from "../../lib/api"

export default function ModelSelector({ value, onChange, provider, className = "" }) {
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelFilter, setModelFilter] = useState("all")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [modelError, setModelError] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchModels()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function fetchModels() {
    setLoadingModels(true)
    setModelError(null)
    try {
      const res = await api.get("/settings/models")
      setModels(res.data.models || [])
    } catch (err) {
      setModelError(err.response?.data?.detail || "Impossible de charger les modèles")
    } finally {
      setLoadingModels(false)
    }
  }

  const filtered = models.filter((m) => {
    if (provider && m.provider !== provider) return false
    if (modelFilter === "cloud") return m.is_cloud
    if (modelFilter === "local") return !m.is_cloud
    return true
  })

  const selectedModel = models.find((m) => m.name === value)

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selector button */}
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all hover:border-primary/30 text-left"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {value ? (
            <>
              {selectedModel?.is_cloud ? (
                <Cloud className="w-4 h-4 text-chart-2 shrink-0" />
              ) : (
                <Server className="w-4 h-4 text-primary shrink-0" />
              )}
              <span className="truncate">{value}</span>
              {selectedModel && (
                <span className="text-xs text-muted-foreground/60 shrink-0">
                  ({selectedModel.size_gb} GB)
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground/50">Sélectionner un modèle...</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-2xl animate-fade-in overflow-hidden">
          {/* Filter tabs + refresh */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-1">
              {[
                { id: "all", label: "Tous", icon: Filter },
                { id: "cloud", label: "Cloud", icon: Cloud },
                { id: "local", label: "Local", icon: Server },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setModelFilter(f.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${modelFilter === f.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <f.icon className="w-3 h-3" />
                  {f.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={fetchModels}
              className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Rafraîchir"
              aria-label="Rafraîchir la liste des modèles"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Model list */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {loadingModels ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : modelError ? (
              <div className="px-3 py-4 text-center">
                <p className="text-sm text-destructive">{modelError}</p>
                <button
                  type="button"
                  onClick={fetchModels}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {models.length === 0
                  ? "Aucun modèle trouvé sur le serveur Ollama"
                  : `Aucun modèle ${modelFilter === "cloud" ? "cloud" : "local"} trouvé`}
              </div>
            ) : (
              filtered.map((model) => (
                <button
                  key={model.name}
                  type="button"
                  onClick={() => {
                    onChange(model.name)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${value === model.name ? "bg-primary/10 text-primary" : ""
                    }`}
                >
                  {model.is_cloud ? (
                    <Cloud className="w-4 h-4 text-chart-2 shrink-0" />
                  ) : (
                    <Server className="w-4 h-4 text-primary/60 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{model.name}</span>
                      {model.is_cloud && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-chart-2/15 text-chart-2 font-medium shrink-0">
                          CLOUD
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {model.size_gb} GB
                    </p>
                  </div>
                  {value === model.name && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Summary */}
          {models.length > 0 && (
            <div className="px-3 py-2 border-t border-border/50 bg-muted/20 text-[11px] text-muted-foreground/60">
              {filtered.filter((m) => m.is_cloud).length} cloud · {filtered.filter((m) => !m.is_cloud).length} local · {filtered.length} total
            </div>
          )}
        </div>
      )}
    </div>
  )
}
