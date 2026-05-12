/**
 * Header bar for the active chat view.
 *
 * Props:
 * - showExport: Boolean controlling the visibility of the export dropdown.
 * - setShowExport: Setter to toggle the export dropdown.
 * - onExport: Callback invoked with the selected format string ("md", "txt", "json").
 */

import { Download, FileText, File } from "lucide-react"

export default function ChatHeader({ showExport, setShowExport, onExport }) {
  return (
    <div className="absolute top-0 right-0 z-10 flex items-center p-2">
      {/* Export dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowExport(!showExport)}
          className="p-2 rounded-lg hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground backdrop-blur-sm"
          aria-label="Exporter la conversation"
        >
          <Download className="w-4 h-4" />
        </button>
        {showExport && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowExport(false)} />
            <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-xl shadow-xl z-20 py-1 min-w-[160px] animate-fade-in">
              {[
                { format: "md", label: "Markdown (.md)", icon: FileText },
                { format: "txt", label: "Texte (.txt)", icon: File },
                { format: "json", label: "JSON (.json)", icon: FileText },
              ].map(({ format, label, icon: Icon }) => (
                <button
                  key={format}
                  onClick={() => onExport(format)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
