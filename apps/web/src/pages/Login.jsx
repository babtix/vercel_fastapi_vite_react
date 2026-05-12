/**
 * Login page for existing users.
 *
 * Provides a form to authenticate with username/email and password.
 * Supports password visibility toggle and displays field-level validation errors.
 * On success, redirects to /dashboard.
 */

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Eye, EyeOff, ArrowRight, Sparkles, Lock, Zap, Brain } from "lucide-react"
import AuroraBackground from "../components/ui/AuroraBackground"
import Prism from "../components/ui/Prism"
import PixelBlast from "../components/ui/PixelBlast"
import { useTheme } from "../contexts/ThemeContext"

export default function Login() {
  const { login } = useAuth()
  const { backgroundEffect } = useTheme()
  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setFieldErrors({})

    const errors = {}
    if (!username.trim()) errors.username = "L'identifiant est requis"
    if (!password) errors.password = "Le mot de passe est requis"

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      await login(username, password)
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.detail || "Échec de la connexion")
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
            <img src="/logo.png" alt="Multi-IA Consultant" className="w-14 h-14 rounded-2xl object-contain shadow-2xl shadow-primary/30 mb-4" />
            <span className="text-xl font-bold tracking-tight">Multi-IA Consultant</span>
            <p className="text-xs text-muted-foreground mt-1">Plateforme IA multi-agents</p>
          </div>

          <div className="glass-card rounded-2xl border p-8">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold flex items-center justify-center gap-2">
                Bon retour <Sparkles className="w-5 h-5 text-primary" />
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Connectez-vous à votre compte</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl animate-fade-in" aria-live="polite">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="login-username" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Identifiant
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="votre nom d'utilisateur"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-background/60 border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all text-sm"
                />
                {fieldErrors.username && <p className="text-xs text-destructive mt-1" aria-live="polite">{fieldErrors.username}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="login-password"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-chart-2 text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Créer un compte
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
              Votre plateforme
              <br />
              <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                d'IA multi-agents
              </span>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Consultez plusieurs agents IA spécialisés qui utilisent des modèles locaux via Ollama. Sécurisé, rapide, et entièrement sous votre contrôle.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              {[
                { icon: Lock, label: "IA Locale", desc: "Vos données restent chez vous" },
                { icon: Zap, label: "Temps réel", desc: "Réponses en streaming instantané" },
                { icon: Brain, label: "Multi-agents", desc: "Spécialistes pour chaque tâche" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
