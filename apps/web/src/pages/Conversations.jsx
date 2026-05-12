/**
 * Conversation history page.
 *
 * Lists all user conversations with search, agent logo display,
 * relative timestamps, message counts, and delete confirmation.
 * Supports both client-side filtering and server-side search.
 */

import { useState, useEffect, useRef } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import api from "../lib/api"
import { getAssetUrl } from "../lib/api"
import { toast } from "sonner"
import ConfirmDialog from "../components/ConfirmDialog"
import {
  MessageSquare, Search, Trash2, Clock, Bot, ArrowRight, Loader2, X,
} from "lucide-react"

export default function Conversations() {
  const navigate = useNavigate()
  const { conversations, fetchConversations, agents } = useOutletContext()
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null })
  const searchTimeoutRef = useRef(null)

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/conversations/search/?q=${encodeURIComponent(search.trim())}`)
        setSearchResults(res.data)
      } catch {
        setSearchResults(
          conversations.filter((c) =>
            c.title.toLowerCase().includes(search.toLowerCase())
          )
        )
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(searchTimeoutRef.current)
  }, [search])

  const displayList = searchResults !== null ? searchResults : conversations

  function getAgentName(agentId) {
    const agent = agents.find((a) => a._id === agentId)
    return agent?.name || "Agent"
  }

  function getAgentLogo(agentId) {
    const agent = agents.find((a) => a._id === agentId)
    return agent?.logo_url || null
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return "À l'instant"
    if (mins < 60) return `Il y a ${mins} min`
    if (hours < 24) return `Il y a ${hours}h`
    if (days < 7) return `Il y a ${days}j`
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  async function handleDelete() {
    const convId = deleteConfirm.id
    setDeleteConfirm({ open: false, id: null })
    try {
      await api.delete(`/conversations/${convId}`)
      await fetchConversations()
      if (searchResults) {
        setSearchResults((prev) => prev.filter((c) => c._id !== convId))
      }
      toast.success("Conversation supprimée")
    } catch {
      toast.error("Impossible de supprimer la conversation")
    }
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold mb-1">Historique</h1>
          <p className="text-muted-foreground text-sm">
            Retrouvez toutes vos conversations passées
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6 animate-fade-in">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans les titres et messages..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-card border border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {searching && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          )}
        </div>

        {searchResults !== null && (
          <p className="text-xs text-muted-foreground mb-4 animate-fade-in">
            {searchResults.length} résultat{searchResults.length !== 1 ? "s" : ""} pour "{search}"
          </p>
        )}

        <div className="space-y-2">
          {displayList.map((conv, i) => {
            const logo = getAgentLogo(conv.agent_id)
            return (
              <button
                key={conv._id}
                onClick={() => navigate(`/dashboard/chat/${conv._id}`)}
                className="w-full flex items-center gap-4 p-4 bg-card border border-border/50 rounded-xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group text-left animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 to-chart-2/15 flex items-center justify-center shrink-0 group-hover:from-primary/25 group-hover:to-chart-2/25 transition-colors">
                  {logo ? (
                    <img src={getAssetUrl(logo)} alt="" className="w-6 h-6 rounded" />
                  ) : (
                    <Bot className="w-5 h-5 text-primary/70" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {conv.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground/60">{getAgentName(conv.agent_id)}</span>
                    <span className="text-xs text-muted-foreground/30">·</span>
                    <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDate(conv.updated_at)}
                    </span>
                    <span className="text-xs text-muted-foreground/30">·</span>
                    <span className="text-xs text-muted-foreground/60">
                      {conv.messages?.length || 0} messages
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm({ open: true, id: conv._id })
                    }}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    aria-label="Supprimer la conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            )
          })}
        </div>

        {/* Empty states */}
        {displayList.length === 0 && searchResults !== null && (
          <div className="text-center py-12">
            <Search className="w-8 h-8 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground text-sm">Aucun résultat pour "{search}"</p>
            <button onClick={() => setSearch("")} className="text-primary text-sm mt-2 hover:underline">
              Effacer la recherche
            </button>
          </div>
        )}

        {displayList.length === 0 && searchResults === null && conversations.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="font-semibold mb-1">Aucune conversation</h3>
            <p className="text-muted-foreground text-sm">
              Retournez à l'accueil pour démarrer votre première conversation
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Supprimer la conversation"
        message="Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        destructive
      />
    </div>
  )
}
