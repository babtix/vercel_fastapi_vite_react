/**
 * Active chat page for a specific conversation.
 *
 * Handles message sending, streaming LLM responses, file upload ingestion,
 * auto-title generation, n8n research command interception (/research),
 * export functionality, and scroll management.
 */

import { useState, useEffect, useRef } from "react"
import { useParams, useOutletContext } from "react-router-dom"
import { toast } from "sonner"
import api, { streamingFetch, streamingGet } from "../lib/api"
import ChatHeader from "../components/chat/ChatHeader"
import MessageList from "../components/chat/MessageList"
import ChatInput from "../components/chat/ChatInput"

export default function Chat() {
  const { conversationId } = useParams()
  const { agents, fetchConversations } = useOutletContext()

  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [isResearching, setIsResearching] = useState(false)

  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)
  const hasAutoTitledRef = useRef(false)
  const pollIntervalRef = useRef(null)

  // Fetch conversation details whenever the route parameter changes
  useEffect(() => {
    hasAutoTitledRef.current = false
    fetchConversation()
    return () => {
      // Abort any in-flight streaming request when switching conversations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Always clean up the polling interval on unmount to prevent memory leaks
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [conversationId])

  // Auto-scroll to the bottom whenever new messages arrive or streaming text updates
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingText])

  // Focus the textarea once the conversation finishes loading
  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [loading])

  async function fetchConversation() {
    setLoading(true)
    try {
      const res = await api.get(`/conversations/${conversationId}`)
      setConversation(res.data)
      setMessages(res.data.messages || [])
      if (res.data.messages && res.data.messages.length > 0) {
        hasAutoTitledRef.current = true
      }
    } catch {
      toast.error("Impossible de charger la conversation")
    } finally {
      setLoading(false)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  function handleScroll() {
    if (!chatContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100)
  }

  async function autoTitleConversation(userMessage) {
    // Only auto-title if the conversation still has the default generated title
    // (i.e. starts with "Chat avec"). Protects user-renamed conversations from
    // being overwritten after a page reload (hasAutoTitledRef resets on mount).
    if (hasAutoTitledRef.current) return
    if (conversation && !conversation.title?.startsWith("Chat avec")) {
      hasAutoTitledRef.current = true
      return
    }
    hasAutoTitledRef.current = true

    const title = userMessage.length > 60
      ? userMessage.substring(0, 57) + "..."
      : userMessage

    try {
      await api.put(`/conversations/${conversationId}`, { title })
      setConversation((prev) => prev ? { ...prev, title } : prev)
      fetchConversations()
    } catch {
      // Auto-title is best-effort; silently ignore failures
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    if (!input.trim() || streaming || isResearching) return

    // Clear any stale poll interval from a previous research cycle to prevent
    // interval accumulation when the user navigates away and back quickly
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    const userMessage = input.trim()
    setInput("")

    const now = new Date().toISOString()
    
    // Intercept /research command
    if (userMessage.startsWith("/research ")) {
      const topic = userMessage.substring(10).trim()
      setIsResearching(true)
      setStreaming(true)
      setStreamingText("")
      
      const controller = new AbortController()
      abortControllerRef.current = controller

      const loadingContextId = Date.now().toString()
      setMessages((prev) => [
        ...prev, 
        { role: "user", content: userMessage, timestamp: now },
        { 
          role: "assistant", 
          content: "Researching the live web...", 
          isResearchLoading: true, 
          id: loadingContextId,
          timestamp: new Date().toISOString() 
        }
      ])
      
      autoTitleConversation(userMessage)

      try {
        const token = localStorage.getItem("access_token")
        await api.post("/api/trigger-research", { topic, session_id: conversationId })
        
        // Poll for readiness — store interval ref for cleanup
        pollIntervalRef.current = setInterval(async () => {
          if (controller.signal.aborted) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
            setMessages((prev) => prev.filter(m => !m.isResearchLoading))
            setIsResearching(false)
            return
          }

          try {
            const statusRes = await api.get(`/api/research-status/${conversationId}`)
            if (statusRes.data.status === "error") {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
              setMessages((prev) => prev.filter(m => !m.isResearchLoading))
              setIsResearching(false)
              toast.error("Le workflow n8n a échoué. Assurez-vous qu'il écoute (Test Event) ou que l'URL est correcte.")
              return
            }
            if (statusRes.data.status === "ready") {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
              
              if (controller.signal.aborted) return
              
              setMessages((prev) => prev.filter(m => !m.isResearchLoading))
              setIsResearching(false)
              
              const response = await streamingFetch(
                `/conversations/${conversationId}/chat`,
                { message: userMessage },
                controller.signal
              )

              if (!response.ok) throw new Error("Chat request failed")

              const reader = response.body.getReader()
              const decoder = new TextDecoder()
              let fullText = ""

              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                fullText += chunk
                setStreamingText(fullText)
              }

              const aiNow = new Date().toISOString()
              setMessages((prev) => [...prev, { role: "assistant", content: fullText, timestamp: aiNow }])
              setStreamingText("")
              setStreaming(false)
              abortControllerRef.current = null
            }
          } catch {
            // Polling errors are non-fatal — next tick will retry
          }
        }, 2000)
      } catch {
        setMessages((prev) => prev.filter(m => !m.isResearchLoading))
        setIsResearching(false)
        toast.error("Échec du lancement de la recherche")
      }
      return
    }

    setMessages((prev) => [...prev, { role: "user", content: userMessage, timestamp: now }])
    setStreaming(true)
    setStreamingText("")

    autoTitleConversation(userMessage)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await streamingFetch(
        `/conversations/${conversationId}/chat`,
        { message: userMessage },
        controller.signal
      )

      if (!response.ok) throw new Error("Chat request failed")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setStreamingText(fullText)
      }

      const aiNow = new Date().toISOString()
      setMessages((prev) => [...prev, { role: "assistant", content: fullText, timestamp: aiNow }])
      setStreamingText("")
    } catch (err) {
      if (err.name !== "AbortError") {
        toast.error("Erreur de communication avec le serveur")
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Erreur de communication avec le serveur. Veuillez réessayer.", error: true },
        ])
      }
    } finally {
      setStreaming(false)
      abortControllerRef.current = null
    }
  }

  function handleStopStreaming() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setStreaming(false)
      setIsResearching(false)
      setMessages((prev) => prev.filter(m => !m.isResearchLoading))
      
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      
      if (streamingText) {
        setMessages((prev) => [...prev, { role: "assistant", content: streamingText }])
        setStreamingText("")
      }
      toast.info("Génération arrêtée")
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const ext = file.name.split(".").pop().toLowerCase()
    let endpoint = ""
    if (ext === "pdf") endpoint = "/tools/pdf/extract-text"
    else if (ext === "docx") endpoint = "/tools/docx/extract-text"
    else if (["txt", "md", "csv"].includes(ext)) {
      // Read text files directly on the client
      const loadingToast = toast.loading(`Lecture de "${file.name}"...`)
      try {
        const text = await file.text()
        if (text && text.trim()) {
          setInput(
            (prev) =>
              prev +
              `\n\nContenu de "${file.name}":\n\n${text.substring(0, 3000)}${text.length > 3000 ? "\n\n[... contenu tronqué]" : ""}`
          )
          inputRef.current?.focus()
          toast.success(`"${file.name}" chargé avec succès`, { id: loadingToast })
        } else {
          toast.warning(`"${file.name}" est vide — aucun texte trouvé`, { id: loadingToast })
        }
      } catch {
        toast.error("Erreur lors de la lecture du fichier", { id: loadingToast })
      } finally {
        e.target.value = ""
      }
      return
    } else {
      toast.warning("Format de fichier non supporté")
      e.target.value = ""
      return
    }

    const loadingToast = toast.loading(`Extraction de "${file.name}"...`)

    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      const extractedText = res.data?.text
      if (extractedText && extractedText.trim()) {
        setInput(
          (prev) =>
            prev +
            `\n\nContenu extrait de "${file.name}":\n\n${extractedText.substring(0, 3000)}${extractedText.length > 3000 ? "\n\n[... contenu tronqué]" : ""}`
        )
        inputRef.current?.focus()
        toast.success(`"${file.name}" extrait avec succès`, { id: loadingToast })
      } else {
        toast.warning(`"${file.name}" ne contient aucun texte extractible (PDF scanné ou image ?)`, { id: loadingToast })
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'extraction du fichier", { id: loadingToast })
    } finally {
      e.target.value = ""
    }
  }

  async function handleExport(format) {
    setShowExport(false)
    try {
      const response = await streamingGet(`/tools/export/${conversationId}?format=${format}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `conversation.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exporté en .${format}`)
    } catch {
      toast.error("Erreur lors de l'export")
    }
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success("Copié dans le presse-papiers")
    setTimeout(() => setCopiedId(null), 2000)
  }

  function getAgentInfo() {
    if (!conversation) return null
    return agents.find((a) => a._id === conversation.agent_id)
  }

  const agent = getAgentInfo()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Chargement de la conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      <ChatHeader
        showExport={showExport}
        setShowExport={setShowExport}
        onExport={handleExport}
      />

      <MessageList
        messages={messages}
        streaming={streaming}
        streamingText={streamingText}
        agent={agent}
        copiedId={copiedId}
        onCopy={copyToClipboard}
        chatContainerRef={chatContainerRef}
        messagesEndRef={messagesEndRef}
        showScrollBtn={showScrollBtn}
        onScroll={handleScroll}
        scrollToBottom={scrollToBottom}
      />

      <ChatInput
        input={input}
        setInput={setInput}
        streaming={streaming}
        isResearching={isResearching}
        inputRef={inputRef}
        onSubmit={handleSendMessage}
        onStopStreaming={handleStopStreaming}
        onFileUpload={handleFileUpload}
      />
    </div>
  )
}
