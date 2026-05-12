/**
 * Dashboard home page displayed inside the AppLayout outlet.
 *
 * Shows a welcome header, a searchable grid of AgentCards, and quick stats.
 * Clicking an agent creates a new conversation and navigates to the chat view.
 */

import { useState, useEffect, useMemo } from "react"
import { useNavigate, useOutletContext } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import api from "../lib/api"
import AgentCard from "../components/AgentCard"
import {
  MessageSquare,
  Bot,
  Sparkles,
  Zap,
  Search,
  X,
} from "lucide-react"

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { agents, fetchConversations, conversations } = useOutletContext()
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function handleStartChat(agent) {
    try {
      const res = await api.post("/conversations/", {
        title: `Chat avec ${agent.name}`,
        agent_id: agent._id,
      })
      await fetchConversations()
      navigate(`/dashboard/chat/${res.data._id}`)
    } catch {
      // Error handled by the API interceptor
    }
  }

  useEffect(() => {
    if (agents.length > 0) {
      setAgentsLoading(false)
    } else {
      const timeout = setTimeout(() => setAgentsLoading(false), 1500)
      return () => clearTimeout(timeout)
    }
  }, [agents])

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents
    const q = search.toLowerCase()
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.model_name.toLowerCase().includes(q)
    )
  }, [agents, search])

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Welcome */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3 border border-primary/10">
            <Sparkles className="w-3.5 h-3.5" />
            Propulsé par Ollama
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bonjour,{" "}
            <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              {user?.username}
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-md">
            Sélectionnez un agent IA spécialisé pour démarrer une conversation
          </p>
        </div>

        {/* Agent section header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 animate-fade-in">
          <h2 className="text-sm font-semibold">Agents IA</h2>

          {agents.length > 3 && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un agent..."
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-card border border-border/60 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Agent Grid */}
        {agentsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Chargement des agents...</p>
            </div>
          </div>
        ) : filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {filteredAgents.map((agent, i) => (
              <AgentCard
                key={agent._id}
                agent={agent}
                index={i}
                onClick={() => handleStartChat(agent)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {search ? "Aucun agent trouvé" : "Aucun agent disponible"}
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {search
                ? "Essayez un autre terme de recherche."
                : "Un administrateur doit d'abord créer des agents IA pour que vous puissiez commencer à discuter."}
            </p>
          </div>
        )}

        {/* Bottom quick stats */}
        {!agentsLoading && agents.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-8 text-xs text-muted-foreground/50 animate-fade-in">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              <span>{agents.length} agent{agents.length !== 1 ? "s" : ""} disponible{agents.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Réponses en temps réel</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
