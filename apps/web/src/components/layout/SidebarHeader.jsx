import { Link } from "react-router-dom"
import { ChevronLeft, X } from "lucide-react"

export default function SidebarHeader({ setSidebarOpen, setMobileSidebarOpen }) {
  return (
    <div className="p-4 border-b border-border/50 shrink-0">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" onClick={() => setMobileSidebarOpen(false)}>
          <img src="/logo.png" alt="Multi-IA" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-bold text-base tracking-tight">Multi-IA</span>
        </Link>
        <button
          onClick={() => { setSidebarOpen(false); setMobileSidebarOpen(false); }}
          className="p-1.5 rounded-md hover:bg-accent transition-colors lg:block hidden"
          aria-label="Fermer la barre latérale"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="p-1.5 rounded-md hover:bg-accent transition-colors lg:hidden"
          aria-label="Fermer le menu mobile"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
