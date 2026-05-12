/**
 * React error boundary that catches rendering errors in child components.
 *
 * Displays a friendly fallback UI with the error message, a refresh button,
 * and a link back to the home page instead of crashing the entire app.
 */

import { Component } from "react"
import { MessageSquare, RefreshCw, Home } from "lucide-react"

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-md animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
              <MessageSquare className="w-8 h-8 text-destructive" />
            </div>

            <h2 className="text-2xl font-bold mb-3">Quelque chose s'est mal passé</h2>
            <p className="text-muted-foreground mb-2 text-sm leading-relaxed">
              Une erreur inattendue s'est produite. Essayez de rafraîchir la page.
            </p>

            {this.state.error && (
              <pre className="text-xs text-destructive/60 bg-destructive/5 border border-destructive/10 rounded-xl px-4 py-3 mb-6 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-md shadow-primary/20"
              >
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </button>
              <a
                href="/"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
              >
                <Home className="w-4 h-4" />
                Accueil
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
