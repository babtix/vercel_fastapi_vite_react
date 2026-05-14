import { useState, useEffect, useRef } from "react"
import { Cloud, Server, Filter, ChevronDown, RefreshCw, Check, Gift, CreditCard, AlertCircle, ExternalLink, Search, X } from "lucide-react"
import api from "../../lib/api"

export default function ModelSelector({ value, onChange, provider, className = "" }) {
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelFilter, setModelFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [modelError, setModelError] = useState(null)
  const dropdownRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    fetchModels()
  }, [])

  // Refetch when dropdown opens if we have no models or an error
  useEffect(() => {
    if (dropdownOpen && (models.length === 0 || modelError)) {
      fetchModels()
    }
  }, [dropdownOpen])

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
  }, [dropdownOpen])

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
      const msg = err.response?.data?.detail || "Impossible de charger les modèles"
      setModelError(msg)
    } finally {
      setLoadingModels(false)
    }
  }

  const filtered = models.filter((m) => {
    if (provider && m.provider !== provider) return false
    if (modelFilter === "free") return m.is_free
    if (modelFilter === "paid") return !m.is_free
    return true
  }).filter((m) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q))
    )
  })

  const selectedModel = models.find((m) => m.name === value)

  const filterLabel = {
    all: "tous",
    free: "gratuit",
    paid: "payant",
  }

  const isKeyMissing = modelError && (
    modelError.includes("Clé API OpenRouter non configurée") ||
    modelError.includes("OpenRouter")
  )

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
              {selectedModel?.is_free && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium shrink-0">
                  GRATUIT
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
          {/* Search input */}
          <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un modèle..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-muted-foreground/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                  aria-label="Effacer la recherche"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs + refresh */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-1">
              {[
                { id: "all", label: "Tous", icon: Filter },
                { id: "free", label: "Gratuit", icon: Gift },
                { id: "paid", label: "Payant", icon: CreditCard },
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
                <div className="flex items-center justify-center gap-1.5 mb-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive font-medium">Erreur de chargement</p>
                </div>
                <p className="text-xs text-muted-foreground">{modelError}</p>
                {isKeyMissing && (
                  <a
                    href="/settings"
                    className="inline-flex items-center gap-1 mt-3 text-xs text-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault()
                      window.location.href = "/settings"
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Aller à Administration → Fournisseur LLM
                  </a>
                )}
                <button
                  type="button"
                  onClick={fetchModels}
                  className="mt-3 text-xs text-primary hover:underline block mx-auto"
                >
                  Réessayer
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {models.length === 0
                  ? "Aucun modèle trouvé. Vérifiez vos clés et votre connexion."
                  : `Aucun modèle ${filterLabel[modelFilter]} trouvé`}
              </div>
            ) : (
              filtered.map((model) => (
                <button
                  key={model.name}
                  type="button"
                  onClick={() => {
                    onChange(model.name)
                    setDropdownOpen(false)
                    setSearchQuery("")
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
                      {model.is_free ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-medium shrink-0">
                          GRATUIT
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-medium shrink-0">
                          PAYANT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {model.provider === "openrouter" ? "OpenRouter" : `${model.size_gb} GB`}
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
              {filtered.filter((m) => m.is_free).length} gratuit · {filtered.filter((m) => !m.is_free).length} payant · {filtered.length} affiché{filtered.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
