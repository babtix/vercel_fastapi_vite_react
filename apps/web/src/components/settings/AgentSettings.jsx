import { useState } from "react"
import { useOutletContext } from "react-router-dom"
import { toast } from "sonner"
import api from "../../lib/api"
import ConfirmDialog from "../ConfirmDialog"
import AgentForm from "./AgentForm"
import RagDocumentManager from "./RagDocumentManager"
import AgentCard from "../AgentCard"
import {
  Plus, Edit3, Trash2, Database, Search, X,
} from "lucide-react"

export default function AgentSettings() {
  const { agents, fetchAgents } = useOutletContext()
  const [showForm, setShowForm] = useState(false)
  const [editAgent, setEditAgent] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null })
  const [ragPanelAgent, setRagPanelAgent] = useState(null)
  const [search, setSearch] = useState("")

  async function handleDeleteAgent() {
    const agentId = deleteConfirm.id
    setDeleteConfirm({ open: false, id: null })
    try {
      await api.delete(`/agents/${agentId}`)
      await fetchAgents()
      toast.success("Agent supprimé")
    } catch {
      toast.error("Impossible de supprimer l'agent")
    }
  }

  const filteredAgents = search.trim()
    ? agents.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.description.toLowerCase().includes(search.toLowerCase()) ||
          a.model_name.toLowerCase().includes(search.toLowerCase())
      )
    : agents

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground">{agents.length} agent(s) configuré(s)</p>
        <div className="flex items-center gap-2">
          {agents.length > 3 && (
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
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
          <button
            onClick={() => { setEditAgent(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shadow-md shadow-primary/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nouvel agent
          </button>
        </div>
      </div>

      {/* Agents Grid */}
      {filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent, i) => (
            <AgentCard
              key={agent._id}
              agent={agent}
              index={i}
              actions={
                <>
                  {agent.rag_enabled && (
                    <button
                      onClick={() => setRagPanelAgent(agent)}
                      className="p-2 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500 transition-colors"
                      aria-label="Gérer les documents RAG"
                      title="Gérer les documents RAG"
                    >
                      <Database className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => { setEditAgent(agent); setShowForm(true); }}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Modifier l'agent"
                    title="Modifier"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ open: true, id: agent._id })}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Supprimer l'agent"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">
            {search ? "Aucun agent ne correspond à votre recherche." : "Aucun agent configuré."}
          </p>
        </div>
      )}

      {showForm && (
        <AgentForm
          agent={editAgent}
          onClose={() => setShowForm(false)}
          onSaved={async () => { await fetchAgents(); setShowForm(false); }}
        />
      )}
      {ragPanelAgent && (
        <RagDocumentManager
          agent={ragPanelAgent}
          onClose={() => setRagPanelAgent(null)}
        />
      )}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Supprimer l'agent"
        message="Êtes-vous sûr de vouloir supprimer cet agent ? Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={handleDeleteAgent}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        destructive
      />
    </div>
  )
}
