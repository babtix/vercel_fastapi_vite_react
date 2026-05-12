/**
 * 404 fallback page for unknown routes.
 *
 * Displays a friendly error message with links to return home
 * or navigate back in browser history.
 */

import { Link } from "react-router-dom"
import { Home, ArrowLeft, MessageSquare } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md animate-fade-in">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <h1 className="text-[120px] font-black leading-none bg-gradient-to-br from-primary/20 to-chart-2/20 bg-clip-text text-transparent select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center shadow-xl shadow-primary/25 animate-pulse-glow">
              <MessageSquare className="w-9 h-9 text-primary-foreground" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-3">Page introuvable</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Oups ! La page que vous cherchez n'existe pas ou a été déplacée.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </div>
      </div>
    </div>
  )
}
