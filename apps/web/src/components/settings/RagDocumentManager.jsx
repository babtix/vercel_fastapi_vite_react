import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import api from "../../lib/api"
import ConfirmDialog from "../ConfirmDialog"
import { BookOpen, X, Upload, Loader2, FileText, Database, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react"

export default function RagDocumentManager({ agent, onClose }) {
  const [documents, setDocuments] = useState([])
  const [totalChunks, setTotalChunks] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, hash: null, name: "" })
  const [ragStatus, setRagStatus] = useState(null)
  const [uploadErrors, setUploadErrors] = useState([])

  useEffect(() => { fetchDocuments(); fetchRagStatus() }, [])

  async function fetchDocuments() {
    setLoading(true)
    try {
      const res = await api.get(`/rag/${agent._id}/documents`)
      setDocuments(res.data.documents || [])
      setTotalChunks(res.data.total_chunks || 0)
    } catch {
      toast.error("Impossible de charger les documents")
    } finally {
      setLoading(false)
    }
  }

  async function fetchRagStatus() {
    try {
      const res = await api.get("/rag/status")
      setRagStatus(res.data)
    } catch {
      setRagStatus({
        embedding_ready: false,
        embedding_model_name: "",
        chroma_available: false,
        message: "Impossible de vérifier l'état du pipeline RAG.",
      })
    }
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    setUploadProgress(`Indexation de ${files.length} fichier(s)...`)
    setUploadErrors([])
    const formData = new FormData()
    files.forEach((f) => formData.append("files", f))
    try {
      const res = await api.post(`/rag/${agent._id}/upload-multiple`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
      })
      const { total_indexed, total_errors, errors } = res.data
      if (total_errors > 0) {
        setUploadErrors(errors || [])
        const details = (errors || []).map((err) => `${err.filename}: ${err.error}`).join("\n")
        toast.warning(
          `${total_indexed} fichier(s) indexé(s), ${total_errors} erreur(s)`,
          { description: details, duration: 8000 }
        )
      } else {
        toast.success(`${total_indexed} fichier(s) indexé(s) avec succès`)
      }
      await fetchDocuments()
    } catch (err) {
      const detail = err.response?.data?.detail || "Erreur lors de l'upload"
      toast.error(detail)
    } finally {
      setUploading(false)
      setUploadProgress("")
      e.target.value = ""
    }
  }

  async function handleDeleteDoc() {
    const hash = deleteConfirm.hash
    setDeleteConfirm({ open: false, hash: null, name: "" })
    try {
      await api.delete(`/rag/${agent._id}/documents/${hash}`)
      toast.success("Document supprimé")
      await fetchDocuments()
    } catch {
      toast.error("Impossible de supprimer le document")
    }
  }

  const isRagReady = ragStatus?.embedding_ready && ragStatus?.chroma_available

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-lg p-6 animate-fade-in max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" /> Documents RAG
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{agent.name} — {totalChunks} chunk(s) indexé(s)</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent transition-colors" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RAG Status Banner */}
        {ragStatus && !isRagReady && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Prérequis RAG non satisfaits</p>
              <p className="text-xs opacity-90">{ragStatus.message}</p>
              {!ragStatus.embedding_ready && (
                <p className="text-xs opacity-80">
                  Modèle actuel: <code className="bg-background/50 px-1 rounded">{ragStatus.embedding_model_name || "non configuré"}</code>
                </p>
              )}
              {!ragStatus.chroma_available && (
                <p className="text-xs opacity-80">
                  ChromaDB est indisponible. Les documents ne peuvent pas être stockés.
                </p>
              )}
            </div>
          </div>
        )}
        {ragStatus && isRagReady && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{ragStatus.message}</span>
          </div>
        )}

        <label className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer mb-4 ${uploading ? "border-amber-500/30 bg-amber-500/5" : isRagReady ? "border-border hover:border-amber-500/40 hover:bg-amber-500/5" : "border-border/40 bg-muted/30 cursor-not-allowed opacity-60"}`}>
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              <span className="text-sm text-amber-500 font-medium">{uploadProgress}</span>
              <span className="text-xs text-muted-foreground">L'embedding peut prendre un moment (premier téléchargement du modèle)...</span>
            </>
          ) : (
            <>
              <Upload className={`w-6 h-6 ${isRagReady ? "text-muted-foreground" : "text-muted-foreground/40"}`} />
              <span className={`text-sm font-medium ${isRagReady ? "text-muted-foreground" : "text-muted-foreground/50"}`}>Cliquez ou glissez des fichiers ici</span>
              <span className="text-xs text-muted-foreground/60">PDF, DOCX, TXT, MD, CSV</span>
            </>
          )}
          <input type="file" accept=".pdf,.docx,.txt,.md,.csv" multiple onChange={handleUpload} disabled={uploading || !isRagReady} className="hidden" />
        </label>

        {/* Upload errors detail */}
        {uploadErrors.length > 0 && (
          <div className="mb-4 space-y-2">
            {uploadErrors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/10 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{err.filename}</p>
                  <p className="text-xs opacity-90">{err.error}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun document indexé</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Uploadez des fichiers pour enrichir cet agent</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.doc_hash} className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-xl group">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.filename}</p>
                  <p className="text-xs text-muted-foreground">{doc.chunks_count} chunks</p>
                </div>
                <button onClick={() => setDeleteConfirm({ open: true, hash: doc.doc_hash, name: doc.filename })} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100" aria-label="Supprimer le document">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      <ConfirmDialog open={deleteConfirm.open} title="Supprimer le document" message={`Supprimer "${deleteConfirm.name}" et tous ses chunks ? Cette action est irréversible.`} confirmLabel="Supprimer" onConfirm={handleDeleteDoc} onCancel={() => setDeleteConfirm({ open: false, hash: null, name: "" })} destructive />
    </div>
  , document.body)
}
