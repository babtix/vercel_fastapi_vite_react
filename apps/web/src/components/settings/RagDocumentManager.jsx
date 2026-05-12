import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import api from "../../lib/api"
import ConfirmDialog from "../ConfirmDialog"
import { BookOpen, X, Upload, Loader2, FileText, Database, Trash2 } from "lucide-react"

export default function RagDocumentManager({ agent, onClose }) {
  const [documents, setDocuments] = useState([])
  const [totalChunks, setTotalChunks] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, hash: null, name: "" })

  useEffect(() => { fetchDocuments() }, [])

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

  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    setUploadProgress(`Indexation de ${files.length} fichier(s)...`)
    const formData = new FormData()
    files.forEach((f) => formData.append("files", f))
    try {
      const res = await api.post(`/rag/${agent._id}/upload-multiple`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
      })
      const { total_indexed, total_errors } = res.data
      if (total_errors > 0) {
        toast.warning(`${total_indexed} fichier(s) indexé(s), ${total_errors} erreur(s)`)
      } else {
        toast.success(`${total_indexed} fichier(s) indexé(s) avec succès`)
      }
      await fetchDocuments()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'upload")
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

        <label className={`flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer mb-4 ${uploading ? "border-amber-500/30 bg-amber-500/5" : "border-border hover:border-amber-500/40 hover:bg-amber-500/5"}`}>
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              <span className="text-sm text-amber-500 font-medium">{uploadProgress}</span>
              <span className="text-xs text-muted-foreground">L'embedding peut prendre un moment...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Cliquez ou glissez des fichiers ici</span>
              <span className="text-xs text-muted-foreground/60">PDF, DOCX, TXT, MD, CSV</span>
            </>
          )}
          <input type="file" accept=".pdf,.docx,.txt,.md,.csv" multiple onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>

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
