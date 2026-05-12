/**
 * Account management page for the authenticated user.
 *
 * Displays profile information, conversation statistics, and forms to
 * update the username/email or change the password with live validation.
 */

import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { useOutletContext } from "react-router-dom"
import api from "../lib/api"
import {
  User, Mail, Shield, Key, Save, Check, AlertCircle,
  MessageSquare, Bot, Clock, Eye, EyeOff,
} from "lucide-react"

/**
 * Validate password strength to match backend requirements.
 */
function validatePassword(password) {
  const errors = []
  if (password.length < 8) errors.push("Minimum 8 caractères")
  if (!/[A-Z]/.test(password)) errors.push("Au moins 1 majuscule")
  if (!/[0-9]/.test(password)) errors.push("Au moins 1 chiffre")
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("Au moins 1 caractère spécial")
  return errors
}

export default function Account() {
  const { user, fetchUser } = useAuth()
  const { conversations, agents } = useOutletContext()

  const [username, setUsername] = useState(user?.username || "")
  const [email, setEmail] = useState(user?.email || "")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [passwordFieldErrors, setPasswordFieldErrors] = useState({})

  async function handleProfileSave(e) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      await api.put("/auth/me", { username, email })
      setProfileMsg({ type: "success", text: "Profil mis à jour avec succès" })
      // Refresh user data from the server instead of reloading the page
      await fetchUser()
    } catch (err) {
      setProfileMsg({
        type: "error",
        text: err.response?.data?.detail || "Échec de la mise à jour",
      })
    } finally {
      setProfileSaving(false)
      setTimeout(() => setProfileMsg(null), 4000)
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPasswordMsg(null)
    setPasswordFieldErrors({})

    const errors = {}

    if (!currentPassword) {
      errors.currentPassword = "Le mot de passe actuel est requis"
    }

    const pwErrors = validatePassword(newPassword)
    if (pwErrors.length > 0) {
      errors.newPassword = pwErrors.join(", ")
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas"
    }

    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors)
      return
    }

    setPasswordSaving(true)
    try {
      await api.put("/auth/me/password", {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setPasswordMsg({ type: "success", text: "Mot de passe modifié avec succès" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordFieldErrors({})
    } catch (err) {
      setPasswordMsg({
        type: "error",
        text: err.response?.data?.detail || "Échec du changement de mot de passe",
      })
    } finally {
      setPasswordSaving(false)
      setTimeout(() => setPasswordMsg(null), 4000)
    }
  }

  const totalMessages = conversations.reduce(
    (sum, c) => sum + (c.messages?.length || 0), 0
  )

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold mb-1">Mon Compte</h1>
          <p className="text-muted-foreground text-sm">
            Gérez votre profil et vos paramètres de sécurité
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 mb-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg shadow-primary/20">
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-xl font-bold">{user?.username}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="mt-1">
                {user?.is_admin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Shield className="w-3 h-3" /> Administrateur
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                    <User className="w-3 h-3" /> Utilisateur
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                <MessageSquare className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{conversations.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Conversations</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-chart-2 mb-1">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{totalMessages}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Messages</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-chart-3 mb-1">
                <Bot className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{agents.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Agents</p>
            </div>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 mb-6 animate-fade-in">
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Modifier le profil
          </h3>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="account-username" className="text-sm font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" /> Nom d'utilisateur
                </label>
                <input id="account-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
              <div className="space-y-2">
                <label htmlFor="account-email" className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email
                </label>
                <input id="account-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
            </div>
            {profileMsg && (
              <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl animate-fade-in ${profileMsg.type === "success" ? "bg-primary/10 text-primary border border-primary/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                {profileMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {profileMsg.text}
              </div>
            )}
            <button type="submit" disabled={profileSaving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-primary/20">
              {profileSaving ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 animate-fade-in">
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" /> Changer le mot de passe
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="current-password" className="text-sm font-medium">Mot de passe actuel</label>
              <div className="relative">
                <input id="current-password" type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required placeholder="••••••••" className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all pr-10" />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showPasswords ? "Masquer les mots de passe" : "Afficher les mots de passe"}>
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordFieldErrors.currentPassword && <p className="text-xs text-destructive" aria-live="polite">{passwordFieldErrors.currentPassword}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="new-password" className="text-sm font-medium">Nouveau mot de passe</label>
                <input id="new-password" type={showPasswords ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="••••••••" className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                {passwordFieldErrors.newPassword && <p className="text-xs text-destructive" aria-live="polite">{passwordFieldErrors.newPassword}</p>}
                <p className="text-[10px] text-muted-foreground/60">8 caractères min., 1 majuscule, 1 chiffre, 1 caractère spécial</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="confirm-new-password" className="text-sm font-medium">Confirmer le nouveau mot de passe</label>
                <input id="confirm-new-password" type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
                {passwordFieldErrors.confirmPassword && <p className="text-xs text-destructive" aria-live="polite">{passwordFieldErrors.confirmPassword}</p>}
              </div>
            </div>
            {passwordMsg && (
              <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl animate-fade-in ${passwordMsg.type === "success" ? "bg-primary/10 text-primary border border-primary/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                {passwordMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {passwordMsg.text}
              </div>
            )}
            <button type="submit" disabled={passwordSaving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all border border-border">
              {passwordSaving ? <div className="w-4 h-4 border-2 border-secondary-foreground border-t-transparent rounded-full animate-spin" /> : <Key className="w-4 h-4" />}
              Modifier le mot de passe
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
