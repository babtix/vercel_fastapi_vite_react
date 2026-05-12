import { Link, useLocation } from "react-router-dom"
import { Home, Clock, Settings, UserCircle, LogOut } from "lucide-react"
import { ThemeToggle } from "../ThemeToggle"

export default function SidebarFooter({ user, isAdmin, onLogout, setMobileSidebarOpen }) {
  const location = useLocation()

  return (
    <div className="p-3 border-t border-border/50 space-y-1">
      <Link
        to="/dashboard"
        onClick={() => setMobileSidebarOpen(false)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${location.pathname === "/dashboard" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
      >
        <Home className="w-4 h-4" />
        Accueil
      </Link>
      <Link
        to="/dashboard/conversations"
        onClick={() => setMobileSidebarOpen(false)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${location.pathname === "/dashboard/conversations" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
      >
        <Clock className="w-4 h-4" />
        Historique
      </Link>
      {isAdmin && (
        <Link
          to="/dashboard/settings"
          onClick={() => setMobileSidebarOpen(false)}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${location.pathname === "/dashboard/settings" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
        >
          <Settings className="w-4 h-4" />
          Administration
        </Link>
      )}
      <Link
        to="/dashboard/account"
        onClick={() => setMobileSidebarOpen(false)}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${location.pathname === "/dashboard/account" ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
      >
        <UserCircle className="w-4 h-4" />
        Mon Compte
      </Link>

      {/* User info */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground font-semibold text-xs shrink-0">
            {user?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={onLogout}
            className="p-1.5 rounded-md hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
            aria-label="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
