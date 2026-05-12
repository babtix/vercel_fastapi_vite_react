import { Link, useLocation } from "react-router-dom"
import { MessageSquare, Edit3, Trash2, Check } from "lucide-react"

export default function ConversationList({
  groups,
  conversations,
  isSearchMode = false,
  editingId,
  editTitle,
  setEditingId,
  setEditTitle,
  onRename,
  onRequestDelete,
  setMobileSidebarOpen,
}) {
  const location = useLocation()

  function renderConvItem(conv) {
    const isActive = location.pathname === `/dashboard/chat/${conv._id}`
    return (
      <div
        key={conv._id}
        className={`group relative flex items-center rounded-lg transition-all duration-200 ${isActive
          ? "bg-accent text-foreground"
          : "hover:bg-accent/50 text-foreground/70 hover:text-foreground"
          }`}
      >
        {editingId === conv._id ? (
          <form onSubmit={(e) => onRename(e, conv._id)} className="flex items-center gap-1 w-full px-2 py-1.5">
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 bg-background/50 text-sm rounded px-2 py-1 outline-none border border-border"
              onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
            />
            <button type="submit" className="p-1 hover:text-primary" aria-label="Confirmer le renommage">
              <Check className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <Link
            to={`/dashboard/chat/${conv._id}`}
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm w-full truncate"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50" />
            <span className="truncate">{conv.title}</span>
          </Link>
        )}

        {editingId !== conv._id && (
          <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setEditingId(conv._id)
                setEditTitle(conv.title)
              }}
              className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground"
              aria-label="Renommer la conversation"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => onRequestDelete(e, conv._id)}
              className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
              aria-label="Supprimer la conversation"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
      {/* ── Search-results flat view ── */}
      {isSearchMode || !groups ? (
        <>
          {conversations.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
                Résultats ({conversations.length})
              </p>
              <div className="space-y-0.5">
                {conversations.map(renderConvItem)}
              </div>
            </div>
          )}
          {conversations.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground/60">Aucun résultat</p>
              <p className="text-xs text-muted-foreground/40 mt-1">Essayez un autre terme</p>
            </div>
          )}
        </>
      ) : (
        /* ── Normal grouped-by-date view ── */
        <>
          {[
            { label: "Aujourd'hui", items: groups.today },
            { label: "Hier", items: groups.yesterday },
            { label: "Cette semaine", items: groups.thisWeek },
            { label: "Plus ancien", items: groups.older },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.label}>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(renderConvItem)}
                </div>
              </div>
            ))}

          {conversations.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground/60">Aucune conversation</p>
              <p className="text-xs text-muted-foreground/40 mt-1">Sélectionnez un agent pour démarrer</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
