/**
 * Main application layout wrapping all protected dashboard routes.
 *
 * Provides a responsive sidebar with conversation search, navigation,
 * keyboard shortcuts, conversation grouping by date, and global
 * background effects. Exposes conversations and agents via Outlet context.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { useTheme } from "../../contexts/ThemeContext"
import { toast } from "sonner"
import api from "../../lib/api"
import ConfirmDialog from "../ConfirmDialog"
import { Menu, Search, X } from "lucide-react"
import Prism from "../ui/Prism"
import AuroraBackground from "../ui/AuroraBackground"
import PixelBlast from "../ui/PixelBlast"
import SidebarHeader from "./SidebarHeader"
import SidebarNav from "./SidebarNav"
import ConversationList from "./ConversationList"
import SidebarFooter from "./SidebarFooter"

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth()
  const { toggleTheme, backgroundEffect, bgIntensity } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [agents, setAgents] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState("")
  const [confirmState, setConfirmState] = useState({ open: false, id: null, title: "", message: "" })
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const searchDebounceRef = useRef(null)

  useEffect(() => {
    fetchConversations()
    fetchAgents()
  }, [])

  /**
   * Debounced sidebar search effect.
   *
   * Waits 350ms after the user stops typing before firing the search request.
   * This reduces API load and prevents jitter while the user is still typing.
   */
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/conversations/search/?q=${encodeURIComponent(searchQuery.trim())}&limit=30`)
        setSearchResults(res.data)
      } catch {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(searchDebounceRef.current)
  }, [searchQuery])

  /**
   * Global keyboard shortcuts.
   *
   * Ctrl/Cmd + N  → start a new chat with the first available agent.
   * Ctrl/Cmd + /  → toggle the desktop sidebar open/closed.
   * Ctrl/Cmd + Shift + D → toggle between dark and light themes.
   */
  const handleKeyDown = useCallback(
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault()
        if (agents.length > 0) handleNewChat(agents[0]._id)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault()
        setSidebarOpen((prev) => !prev)
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
        e.preventDefault()
        toggleTheme()
      }
    },
    [agents, toggleTheme]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  async function fetchConversations() {
    try {
      const res = await api.get("/conversations/?limit=50")
      setConversations(res.data)
    } catch {
      // Silently fail — sidebar will show empty state
    }
  }

  async function fetchAgents() {
    try {
      const res = await api.get("/agents/")
      setAgents(res.data)
    } catch {
      // Silently fail — dashboard will show empty state
    }
  }

  async function handleNewChat(agentId) {
    try {
      const agent = agents.find((a) => a._id === agentId)
      const res = await api.post("/conversations/", {
        title: `Chat avec ${agent?.name || "Agent"}`,
        agent_id: agentId,
      })
      await fetchConversations()
      navigate(`/dashboard/chat/${res.data._id}`)
      setMobileSidebarOpen(false)
      toast.success(`Nouvelle conversation avec ${agent?.name || "Agent"}`)
    } catch {
      toast.error("Impossible de créer la conversation")
    }
  }

  function handleQuickNewChat() {
    let targetAgentId = null;
    if (conversations.length > 0) {
      const mostRecent = [...conversations].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
      targetAgentId = mostRecent.agent_id;
    }
    if (!targetAgentId && agents.length > 0) {
      targetAgentId = agents[0]._id;
    }

    if (targetAgentId) {
      handleNewChat(targetAgentId);
    } else {
      toast.error("Aucun agent disponible");
    }
  }

  function requestDeleteConversation(e, convId) {
    e.stopPropagation()
    e.preventDefault()
    const conv = conversations.find((c) => c._id === convId)
    setConfirmState({
      open: true,
      id: convId,
      title: "Supprimer la conversation",
      message: `Êtes-vous sûr de vouloir supprimer "${conv?.title || "cette conversation"}" ? Cette action est irréversible.`,
    })
  }

  async function confirmDeleteConversation() {
    const convId = confirmState.id
    setConfirmState({ open: false, id: null, title: "", message: "" })
    try {
      await api.delete(`/conversations/${convId}`)
      setConversations((prev) => prev.filter((c) => c._id !== convId))
      if (location.pathname.includes(convId)) {
        navigate("/")
      }
      toast.success("Conversation supprimée")
    } catch {
      toast.error("Impossible de supprimer la conversation")
    }
  }

  async function handleRename(e, convId) {
    e.stopPropagation()
    e.preventDefault()
    if (!editTitle.trim()) return
    try {
      await api.put(`/conversations/${convId}`, { title: editTitle.trim() })
      setConversations((prev) =>
        prev.map((c) => (c._id === convId ? { ...c, title: editTitle.trim() } : c))
      )
      setEditingId(null)
      toast.success("Conversation renommée")
    } catch {
      toast.error("Impossible de renommer")
    }
  }

  function handleLogout() {
    logout()
    navigate("/login")
    toast.success("Déconnecté avec succès")
  }

  /**
   * Group conversations into chronological buckets for the sidebar.
   *
   * Buckets: today, yesterday, this week, older.
   * Memoized so the grouping only recalculates when the conversation list changes.
   */
  const groups = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const result = { today: [], yesterday: [], thisWeek: [], older: [] }

    conversations.forEach((conv) => {
      const date = new Date(conv.updated_at)
      if (date >= today) result.today.push(conv)
      else if (date >= yesterday) result.yesterday.push(conv)
      else if (date >= weekAgo) result.thisWeek.push(conv)
      else result.older.push(conv)
    })

    return result
  }, [conversations])

  // The list shown in the sidebar: search results when searching, else all conversations
  const visibleConversations = searchQuery.trim() ? searchResults : conversations

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <SidebarHeader
        setSidebarOpen={setSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />

      <SidebarNav
        setMobileSidebarOpen={setMobileSidebarOpen}
        onQuickNewChat={handleQuickNewChat}
      />

      {/* Conversation search box */}
      <div className="px-3 pb-2">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            id="sidebar-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            aria-label="Rechercher des conversations"
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-accent/40 hover:bg-accent/60 focus:bg-accent/80 border border-transparent focus:border-border/60 rounded-lg outline-none transition-all placeholder:text-muted-foreground/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 text-muted-foreground/50 hover:text-foreground transition-colors"
              aria-label="Effacer la recherche"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {isSearching && (
          <p className="text-[10px] text-muted-foreground/50 text-center mt-1">Recherche...</p>
        )}
      </div>

      <ConversationList
        groups={searchQuery.trim() ? null : groups}
        conversations={visibleConversations}
        isSearchMode={!!searchQuery.trim()}
        editingId={editingId}
        editTitle={editTitle}
        setEditingId={setEditingId}
        setEditTitle={setEditTitle}
        onRename={handleRename}
        onRequestDelete={requestDeleteConversation}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />

      <SidebarFooter
        user={user}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />
    </div>
  )

  return (
    <div className="flex h-screen bg-background/20 overflow-hidden relative">
      {backgroundEffect === "prism" && (
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none" style={{ opacity: bgIntensity }}>
          <Prism
            animationType="3drotate"
            timeScale={0.15}
            height={4.2}
            baseWidth={5.7}
            scale={3.6}
            hueShift={0.6584}
            colorFrequency={1.1}
            noise={0}
            glow={0.35}
          />
        </div>
      )}
      {backgroundEffect === "aurora" && (
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none" style={{ opacity: bgIntensity }}>
          <AuroraBackground />
        </div>
      )}
      {backgroundEffect === "pixelblast" && (
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none" style={{ opacity: bgIntensity }}>
          <PixelBlast
            variant="circle"
            pixelSize={3}
            color="#B497CF"
            speed={0.5}
            patternScale={2}
            patternDensity={1}
            enableRipples={false}
            edgeFade={0.5}
          />
        </div>
      )}
      {/* Desktop sidebar */}
      {sidebarOpen && (
        <aside className="hidden lg:flex w-72 border-r border-border/40 bg-sidebar/70 backdrop-blur-xl flex-col shrink-0 animate-fade-in-flat">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-sidebar/80 backdrop-blur-2xl z-50 lg:hidden border-r border-border/40 animate-slide-in-left">
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (collapsed sidebar toggle + mobile menu) */}
        <header className={`absolute top-0 left-0 z-10 flex items-center px-2 py-2 ${sidebarOpen ? 'lg:hidden' : ''}`}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md hover:bg-accent transition-colors mr-2 hidden lg:block"
              aria-label="Ouvrir la barre latérale"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-accent transition-colors mr-2 lg:hidden"
            aria-label="Ouvrir le menu mobile"
          >
            <Menu className="w-4 h-4" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet context={{ conversations, fetchConversations, agents, fetchAgents }} />
        </main>
      </div>
      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel="Supprimer"
        onConfirm={confirmDeleteConversation}
        onCancel={() => setConfirmState({ open: false, id: null, title: "", message: "" })}
        destructive
      />
    </div>
  )
}
