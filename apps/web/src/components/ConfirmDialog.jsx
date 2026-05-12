/**
 * Reusable confirmation dialog rendered via React portal.
 *
 * Props:
 * - open: Boolean controlling dialog visibility.
 * - title: Dialog heading text.
 * - message: Descriptive text explaining the action.
 * - confirmLabel: Text for the confirm button.
 * - onConfirm: Callback fired when the user confirms.
 * - onCancel: Callback fired when the user cancels or closes.
 * - destructive: Boolean styling the confirm button as destructive (default true).
 */

import { createPortal } from "react-dom"
import { AlertTriangle, X } from "lucide-react"

export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, destructive = true }) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-sm p-6 animate-fade-in">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            destructive ? "bg-destructive/10" : "bg-primary/10"
          }`}>
            <AlertTriangle className={`w-5 h-5 ${destructive ? "text-destructive" : "text-primary"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-accent transition-colors shrink-0" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md ${
              destructive
                ? "bg-destructive text-destructive-foreground hover:opacity-90 shadow-destructive/20"
                : "bg-primary text-primary-foreground hover:opacity-90 shadow-primary/20"
            }`}
          >
            {confirmLabel || "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  , document.body)
}
