/**
 * Message input area for the chat interface.
 *
 * Props:
 * - input: Current text value of the textarea.
 * - setInput: Setter for the input text.
 * - streaming: Boolean indicating whether the AI is currently generating.
 * - isResearching: Boolean indicating whether an n8n research task is active.
 * - inputRef: Ref attached to the textarea for focus management.
 * - onSubmit: Callback fired when the user sends a message.
 * - onStopStreaming: Callback fired when the user clicks the stop button.
 * - onFileUpload: Callback fired when a file is selected for upload.
 */

import { Send, Paperclip, StopCircle } from "lucide-react"

export default function ChatInput({
  input,
  setInput,
  streaming,
  isResearching,
  inputRef,
  onSubmit,
  onStopStreaming,
  onFileUpload,
}) {
  return (
    <div className="px-4 md:px-6 py-4 shrink-0">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={onSubmit} className="relative">
          <div className="flex items-end gap-2 bg-card border border-border rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
            {/* File upload */}
            <label
              className="cursor-pointer p-1 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground shrink-0 self-end"
              aria-label="Joindre un fichier"
            >
              <Paperclip className="w-5 h-5" />
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv"
                onChange={onFileUpload}
                className="hidden"
              />
            </label>

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onSubmit(e)
                }
              }}
              placeholder="Écrivez votre message..."
              rows={1}
              maxLength={10000}
              className="flex-1 resize-none bg-transparent outline-none text-sm max-h-40 overflow-y-auto placeholder:text-muted-foreground/50 py-1"
              style={{ minHeight: "24px" }}
              onInput={(e) => {
                e.target.style.height = "24px"
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"
              }}
            />

            {/* Send / Stop button */}
            {streaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors shrink-0 self-end"
                aria-label="Arrêter la génération"
              >
                <StopCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || isResearching}
                className="p-2 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 self-end shadow-md shadow-primary/20"
                aria-label="Envoyer le message"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
          {input.length > 8000 && (
            <p className={`text-[11px] mt-1 text-right px-1 ${input.length > 9500 ? 'text-destructive' : 'text-muted-foreground/50'}`}>
              {input.length.toLocaleString()} / 10 000
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
