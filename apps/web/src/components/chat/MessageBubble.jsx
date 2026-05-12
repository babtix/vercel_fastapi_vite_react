/**
 * Individual message bubble for user or assistant messages.
 *
 * Props:
 * - message: Message object containing role, content, and timestamp.
 * - index: Numeric index used as a key and for copy identification.
 * - agent: Current agent metadata for avatar/logo display.
 * - copiedId: Index of the message currently marked as copied.
 * - onCopy: Callback invoked to copy the message content to clipboard.
 */

import { Bot, User, Copy, Check, Clock } from "lucide-react"
import MarkdownRenderer from "../MarkdownRenderer"
import { getAssetUrl } from "../../lib/api"

/**
 * Format a timestamp for display.
 */
function formatTimestamp(ts) {
  if (!ts) return ""
  const d = new Date(ts)
  return d.toLocaleString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  })
}

export default function MessageBubble({ message, index, agent, copiedId, onCopy }) {
  const isUser = message.role === "user"
  const timeStr = formatTimestamp(message.timestamp || message.created_at)

  return (
    <div className={`flex gap-3 animate-fade-in group/msg ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${
          isUser
            ? "bg-gradient-to-br from-chart-2/20 to-primary/20"
            : "bg-gradient-to-br from-primary/20 to-chart-2/20"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-chart-2" />
        ) : agent?.logo_url ? (
          <>
            <img
              src={getAssetUrl(agent.logo_url)}
              alt=""
              className="w-5 h-5 rounded object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
            />
            <Bot className="w-4 h-4 text-primary hidden" />
          </>
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block max-w-full text-left ${
            isUser
              ? "bg-primary/10 border border-primary/10 rounded-2xl rounded-tr-md px-4 py-3"
              : ""
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {/* Timestamp + actions */}
        <div className={`flex items-center gap-2 mt-1.5 ${isUser ? "justify-end" : ""}`}>
          {timeStr && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/0 group-hover/msg:text-muted-foreground/40 transition-colors select-none">
              <Clock className="w-3 h-3" />
              {timeStr}
            </span>
          )}

          {/* Copy button for assistant messages */}
          {!isUser && (
            <button
              onClick={() => onCopy(message.content, index)}
              className="flex items-center gap-1 text-xs text-muted-foreground/0 group-hover/msg:text-muted-foreground/50 hover:!text-muted-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent"
              aria-label="Copier le message"
            >
              {copiedId === index ? (
                <>
                  <Check className="w-3 h-3" />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copier
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
