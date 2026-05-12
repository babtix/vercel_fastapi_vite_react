import { useState, useEffect } from "react"
import { toast } from "sonner"
import api from "../../lib/api"
import ConfirmDialog from "../ConfirmDialog"
import { Users, Shield, ShieldOff, Trash2, Info, X } from "lucide-react"
import { createPortal } from "react-dom"

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteUserConfirm, setDeleteUserConfirm] = useState({ open: false, id: null })
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await api.get("/auth/users")
      setUsers(res.data)
    } catch {
      toast.error("Impossible de charger les utilisateurs")
    } finally {
      setLoading(false)
    }
  }

  async function handlePromote(userId) {
    try {
      await api.put(`/auth/users/${userId}/promote`)
      await fetchUsers()
      toast.success("Utilisateur promu administrateur")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur")
    }
  }

  async function handleDemote(userId) {
    try {
      await api.put(`/auth/users/${userId}/demote`)
      await fetchUsers()
      toast.success("Droits d'administrateur retirés")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur")
    }
  }

  async function handleDelete() {
    const userId = deleteUserConfirm.id
    setDeleteUserConfirm({ open: false, id: null })
    try {
      await api.delete(`/auth/users/${userId}`)
      await fetchUsers()
      toast.success("Utilisateur supprimé")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{users.length} utilisateur(s) enregistré(s)</p>
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Utilisateur</span><span>Email</span><span>Rôle</span><span>Actions</span>
        </div>
        {users.map((u) => (
          <div key={u._id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3 border-t border-border/30 items-center hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center text-xs font-semibold shrink-0">
                {u.username[0].toUpperCase()}
              </div>
              <span className="text-sm truncate">{u.username}</span>
              <button onClick={() => setSelectedUser(u)} className="ml-1.5 p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors shrink-0" aria-label="Voir les détails">
                <Info className="w-4 h-4" />
              </button>
            </div>
            <span className="text-sm text-muted-foreground truncate">{u.email}</span>
            <div>
              {u.is_admin ? (
                <button type="button" onClick={() => handleDemote(u._id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer group" aria-label="Retirer les droits admin">
                  <Shield className="w-3 h-3 group-hover:hidden" /><ShieldOff className="w-3 h-3 hidden group-hover:block" /> Admin
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">User</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!u.is_admin && (
                <button onClick={() => handlePromote(u._id)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" aria-label="Promouvoir administrateur">
                  <Shield className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setDeleteUserConfirm({ open: true, id: u._id })} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" aria-label="Supprimer l'utilisateur">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog open={deleteUserConfirm.open} title="Supprimer l'utilisateur" message="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible." confirmLabel="Supprimer" onConfirm={handleDelete} onCancel={() => setDeleteUserConfirm({ open: false, id: null })} destructive />

      {selectedUser && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-background border border-border rounded-2xl w-full max-w-sm p-6 animate-fade-in relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center text-2xl font-semibold">
                {selectedUser.username[0].toUpperCase()}
              </div>
              <div>
                <div className="text-xl font-bold">{selectedUser.username}</div>
                <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
              </div>
              <div>
                {selectedUser.is_admin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs">User</span>
                )}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedUser._id)
                  toast.success("ID copié !")
                }}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Cliquer pour copier"
              >
                {selectedUser._id}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
