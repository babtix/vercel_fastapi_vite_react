import { Link } from "react-router-dom"
import { Home, Plus } from "lucide-react"

export default function SidebarNav({ setMobileSidebarOpen, onQuickNewChat }) {
  return (
    <div className="px-3 pt-3 pb-2 border-b border-border/50 shrink-0 space-y-2">
      <Link
        to="/dashboard"
        onClick={() => setMobileSidebarOpen(false)}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-primary to-chart-2 text-primary-foreground hover:opacity-90 transition-all duration-200 shadow-sm"
      >
        <Home className="w-4 h-4" />
        Dashboard
      </Link>
      <button
        onClick={onQuickNewChat}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium border border-border/50 hover:bg-accent transition-all duration-200 shadow-sm text-foreground/90 hover:text-foreground"
      >
        <Plus className="w-4 h-4" />
        Nouvelle Discussion
      </button>
    </div>
  )
}
