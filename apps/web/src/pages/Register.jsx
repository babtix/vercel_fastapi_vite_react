/**
 * Registration page for new users.
 *
 * Collects email, username, password, and password confirmation.
 * Performs client-side password strength validation before submitting
 * to the backend. On success, redirects to /login.
 */

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Eye, EyeOff, ArrowRight, UserPlus, CheckCircle, Sparkles } from "lucide-react"
import AuroraBackground from "../components/ui/AuroraBackground"
import Prism from "../components/ui/Prism"
import PixelBlast from "../components/ui/PixelBlast"
import { useTheme } from "../contexts/ThemeContext"

/**
 * Validate a password against the backend rules:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
function validatePassword(password) {
  const errors = []
  if (password.length < 8) errors.push("Minimum 8 caractères")
  if (!/[A-Z]/.test(password)) errors.push("Au moins 1 lettre majuscule")
  if (!/[0-9]/.test(password)) errors.push("Au moins 1 chiffre")
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("Au moins 1 caractère spécial (!@#$%^&*...)")
  return errors
}

export default function Register() {
  const { register } = useAuth()
  const { backgroundEffect } = useTheme()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setFieldErrors({})

    const errors = {}

    if (!email.trim()) errors.email = "L'email est requis"
    if (!username.trim()) errors.username = "Le nom d'utilisateur est requis"

    const passwordErrors = validatePassword(password)
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors.join(", ")
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas"
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      await register(email, username, password)
      navigate("/login")
    } catch (err) {
      setError(err.response?.data?.detail || "Échec de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {backgroundEffect === "aurora" && <AuroraBackground />}
      {backgroundEffect === "prism" && (
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
          <Prism animationType="3drotate" timeScale={0.15} height={4.2} baseWidth={5.7} scale={3.6} hueShift={0.6584} colorFrequency={1.1} noise={0} glow={0.35} />
        </div>
      )}
      {backgroundEffect === "pixelblast" && (
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
          <PixelBlast variant="circle" pixelSize={3} color="#B497CF" speed={0.5} patternScale={2} patternDensity={1} enableRipples={false} edgeFade={0.5} />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm animate-fade-in" style={{ animationDuration: "0.5s" }}>

          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-chart-2 to-primary flex items-center justify-center shadow-2xl shadow-chart-2/30 mb-4">
              <UserPlus className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Multi-IA Consultant</span>
            <p className="text-xs text-muted-foreground mt-1">Plateforme IA multi-agents</p>
          </div>

          <div className="glass-card rounded-2xl border p-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold flex items-center justify-center gap-2">
                Créer un compte <Sparkles className="w-5 h-5 text-primary" />
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Inscrivez-vous pour commencer</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl animate-fade-in" aria-live="polite">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="register-email" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all text-sm"
                />
                {fieldErrors.email && <p className="text-xs text-destructive mt-1" aria-live="polite">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-username" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nom d'utilisateur
                </label>
                <input
                  id="register-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="votre_nom"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all text-sm"
                />
                {fieldErrors.username && <p className="text-xs text-destructive mt-1" aria-live="polite">{fieldErrors.username}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all text-sm pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-xs text-destructive mt-1" aria-live="polite">{fieldErrors.password}</p>}
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  8 caractères min., 1 majuscule, 1 chiffre, 1 caractère spécial
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-confirm" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Confirmer le mot de passe
                </label>
                <input
                  id="register-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all text-sm"
                />
                {fieldErrors.confirmPassword && <p className="text-xs text-destructive mt-1" aria-live="polite">{fieldErrors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-chart-2 to-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Déjà un compte ?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[45%] flex-col justify-center px-16 relative z-10">
        <div className="w-full max-w-md animate-fade-in" style={{ animationDuration: "0.5s", animationDelay: "0.2s" }}>
          <div className="flex flex-col items-center mb-8 invisible" aria-hidden="true">
            <div className="w-14 h-14 mb-4"></div>
            <span className="text-xl font-bold tracking-tight">Spacer</span>
            <p className="text-xs mt-1">Spacer</p>
          </div>
          <div className="glass-card rounded-2xl border p-8 shadow-xl">
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Rejoignez
              <br />
              <span className="bg-gradient-to-r from-chart-2 to-primary bg-clip-text text-transparent">
                notre plateforme
              </span>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Créez votre compte et accédez immédiatement à nos agents IA spécialisés. Configuration simple, démarrage instantané.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              {[
                "Accès immédiat aux agents IA",
                "Historique de conversations sécurisé",
                "Export des conversations en PDF, MD, JSON",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
