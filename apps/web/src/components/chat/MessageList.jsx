/**
 * Scrollable message list for a conversation.
 *
 * Props:
 * - messages: Array of message objects to render.
 * - streaming: Boolean indicating an active AI response stream.
 * - streamingText: Partial text being streamed in real-time.
 * - agent: Current agent metadata (name, logo_url, description).
 * - copiedId: Index of the message whose text was last copied.
 * - onCopy: Callback invoked to copy a message's content.
 * - chatContainerRef: Ref for the scrollable container div.
 * - messagesEndRef: Ref for the auto-scroll anchor element.
 * - showScrollBtn: Boolean controlling the "scroll to bottom" floating button.
 * - onScroll: Callback fired on container scroll events.
 * - scrollToBottom: Callback to programmatically scroll to the latest message.
 */

import { useRef } from "react"
import { Bot, ChevronDown } from "lucide-react"
import MarkdownRenderer from "../MarkdownRenderer"
import MessageBubble from "./MessageBubble"
import { getAssetUrl } from "../../lib/api"

export default function MessageList({
  messages,
  streaming,
  streamingText,
  agent,
  copiedId,
  onCopy,
  chatContainerRef,
  messagesEndRef,
  showScrollBtn,
  onScroll,
  scrollToBottom,
}) {
  return (
    <>
      <div
        ref={chatContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6"
      >
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center mb-4">
                {agent?.logo_url ? (
                  <img src={getAssetUrl(agent.logo_url)} alt="" className="w-9 h-9 rounded-xl object-cover" />
                ) : (
                  <Bot className="w-7 h-7 text-primary" />
                )}
              </div>
              <h3 className="font-semibold text-lg mb-1">Chat avec {agent?.name || "Agent"}</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                {agent?.description || "Posez votre première question pour démarrer la conversation"}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id || (msg.timestamp ? `${msg.timestamp}-${i}` : `msg-${i}`)}
              message={msg}
              index={i}
              agent={agent}
              copiedId={copiedId}
              onCopy={onCopy}
            />
          ))}

          {/* Streaming message */}
          {streaming && streamingText && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <MarkdownRenderer content={streamingText} />
                <div className="flex items-center gap-1 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-muted-foreground">En cours de génération...</span>
                </div>
              </div>
            </div>
          )}

          {/* Typing indicator when streaming but no text yet */}
          {streaming && !streamingText && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center gap-1.5 py-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 typing-dot" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 typing-dot" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-28 right-6 p-2 rounded-full bg-card border border-border shadow-lg hover:bg-accent transition-all animate-fade-in"
          aria-label="Défiler vers le bas"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </>
  )
}
