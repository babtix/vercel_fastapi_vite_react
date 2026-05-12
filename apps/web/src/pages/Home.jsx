/**
 * Public landing page for unauthenticated users.
 *
 * Displays the product value proposition, feature grid, workflow steps,
 * tech stack badges, and a call-to-action. Authenticated users are
 * automatically redirected to /dashboard.
 */

import { useEffect, useRef, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import {
  MessageSquare,
  Zap,
  ArrowRight,
  Sparkles,
  Globe,
  Lock,
  FileText,
  Code,
  BrainCircuit,
  ChevronRight,
  Cpu,
  Database,
  Shield,
  Rocket,
} from "lucide-react"
import Prism from "../components/ui/Prism"
const FEATURES = [
  {
    icon: BrainCircuit,
    title: "Multi-Agents IA",
    desc: "Consultez plusieurs agents IA spécialisés, chacun avec son propre rôle et expertise.",
  },
  {
    icon: Lock,
    title: "100% Local & Sécurisé",
    desc: "Vos données restent sur vos serveurs. Aucune donnée n'est envoyée à des services tiers.",
  },
  {
    icon: Zap,
    title: "Réponses en Temps Réel",
    desc: "Streaming en direct des réponses pour une expérience de chat fluide et instantanée.",
  },
  {
    icon: FileText,
    title: "Upload & Export",
    desc: "Importez des PDF et DOCX, exportez vos conversations en Markdown, texte ou JSON.",
  },
  {
    icon: Globe,
    title: "Propulsé par Ollama",
    desc: "Utilisez n'importe quel modèle compatible Ollama : LLaMA, Mistral, DeepSeek, et plus.",
  },
  {
    icon: Code,
    title: "Open Source",
    desc: "Code ouvert, extensible et personnalisable pour s'adapter à vos besoins métier.",
  },
]

const STEPS = [
  {
    icon: Cpu,
    title: "Configurez vos agents",
    desc: "Créez des agents IA sur mesure avec des rôles, contextes et instructions personnalisés.",
  },
  {
    icon: Database,
    title: "Alimentez la base de connaissances",
    desc: "Uploadez vos documents PDF et DOCX pour enrichir les réponses avec du RAG.",
  },
  {
    icon: Shield,
    title: "Discutez en toute sécurité",
    desc: "Interagissez avec vos agents en local. Vos données ne quittent jamais votre machine.",
  },
  {
    icon: Rocket,
    title: "Déployez et itérez",
    desc: "Exportez vos conversations et affinez vos agents pour des performances optimales.",
  },
]

const TECH_STACK = [
  { name: "React", color: "from-blue-400/20 to-cyan-400/20 border-blue-400/30 text-blue-400" },
  { name: "Tailwind CSS", color: "from-sky-400/20 to-teal-400/20 border-sky-400/30 text-sky-400" },
  { name: "Shadcn UI", color: "from-zinc-400/20 to-slate-400/20 border-zinc-400/30 text-zinc-400" },
  { name: "FastAPI", color: "from-emerald-400/20 to-green-400/20 border-emerald-400/30 text-emerald-400" },
  { name: "MongoDB", color: "from-green-400/20 to-lime-400/20 border-green-400/30 text-green-400" },
  { name: "Ollama", color: "from-amber-400/20 to-orange-400/20 border-amber-400/30 text-amber-400" },
  { name: "Vite", color: "from-violet-400/20 to-purple-400/20 border-violet-400/30 text-violet-400" },
  { name: "JWT Auth", color: "from-rose-400/20 to-pink-400/20 border-rose-400/30 text-rose-400" },
]

function useScrollReveal(threshold = 0.1) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [threshold])

  return [ref, isVisible]
}

function RevealSection({ children, className = "", delay = 0 }) {
  const [ref, isVisible] = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(24px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
          ? "border-b border-border/50 bg-background/80 backdrop-blur-xl shadow-sm"
          : "bg-transparent border-b border-transparent"
          }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all group-hover:scale-105">
              <MessageSquare className="w-[18px] h-[18px] text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Multi-IA Consultant</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
            >
              Commencer
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
          <Prism
            animationType="3drotate"
            timeScale={0.3}
            height={4.2}
            baseWidth={5.7}
            scale={3.6}
            hueShift={0.6584}
            colorFrequency={1.1}
            noise={0}
            glow={0.6}
          />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <RevealSection delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/10 hover:border-primary/30 transition-colors cursor-default">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Plateforme d'IA Multi-Agents
              </div>
            </RevealSection>

            <RevealSection delay={100}>
              <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
                Votre consultant{" "}
                <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-1 bg-clip-text text-transparent">
                  IA intelligent
                </span>
                <br />
                entièrement local
              </h1>
            </RevealSection>

            <RevealSection delay={200}>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                Déployez des agents IA spécialisés propulsés par Ollama. Sécurisé,
                rapide, et sous votre contrôle total. Aucune donnée n'est envoyée
                à l'extérieur.
              </p>
            </RevealSection>

            <RevealSection delay={300}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/register"
                  className="group flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-chart-2 text-primary-foreground font-semibold text-base hover:opacity-90 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
                >
                  Créer un compte gratuit
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-3.5 rounded-2xl border border-border text-sm font-medium hover:bg-accent transition-colors w-full sm:w-auto"
                >
                  Se connecter
                </Link>
              </div>
            </RevealSection>
          </div>

          {/* Stats */}
          <RevealSection delay={400}>
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { value: "100%", label: "Local & Privé" },
                { value: "∞", label: "Agents créables" },
                { value: "< 1s", label: "Temps de réponse" },
                { value: "0€", label: "Open Source" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className="text-center p-4 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm hover:bg-card/50 hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </RevealSection>

          {/* Hero Mockup */}
          <RevealSection delay={500} className="mt-16">
            <div className="relative max-w-4xl mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-chart-2/20 to-chart-1/20 rounded-3xl blur-3xl -z-10" />
              <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-2xl shadow-black/5 overflow-hidden">
                {/* Mockup Header */}
                <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2 bg-card/80">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-xs text-muted-foreground font-medium">Multi-IA Consultant — Chat</span>
                  </div>
                </div>
                {/* Mockup Content */}
                <div className="p-6 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <BrainCircuit className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
                      <p className="text-sm text-foreground/80">
                        Bonjour ! Je suis votre consultant IA spécialisé. Comment puis-je vous aider aujourd'hui ?
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-chart-2/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-chart-2" />
                    </div>
                    <div className="bg-primary/10 rounded-2xl rounded-tr-sm px-4 py-3 max-w-md">
                      <p className="text-sm text-foreground/80">
                        Analyse ce document PDF et résume les points clés pour moi.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <BrainCircuit className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
                      <div className="flex gap-1.5 items-center h-5">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Mockup Input */}
                <div className="px-5 py-3 border-t border-border/40 bg-card/80">
                  <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-2.5">
                    <div className="flex-1 text-sm text-muted-foreground">Écrivez votre message...</div>
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-t border-border/50 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <RevealSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-medium mb-4 border border-primary/10">
                <Rocket className="w-3 h-3" />
                Workflow
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                Comment ça marche ?
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Démarrez en quelques minutes et laissez l'IA transformer votre productivité
              </p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <RevealSection key={step.title} delay={i * 100}>
                <div className="group relative glass-card rounded-2xl p-6 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1 h-full">
                  {/* Step Number */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {i + 1}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-chart-2/15 flex items-center justify-center mb-4 group-hover:from-primary/25 group-hover:to-chart-2/25 transition-colors group-hover:scale-110 duration-300">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-border/50 bg-card/20">
        <div className="max-w-6xl mx-auto px-6">
          <RevealSection>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-medium mb-4 border border-primary/10">
                <Sparkles className="w-3 h-3" />
                Fonctionnalités
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Une plateforme complète pour intégrer l'IA dans vos processus métier
              </p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <RevealSection key={feature.title} delay={i * 75}>
                <div className="group glass-card rounded-2xl p-6 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-chart-2/15 flex items-center justify-center mb-4 group-hover:from-primary/25 group-hover:to-chart-2/25 transition-colors group-hover:scale-110 duration-300">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 border-t border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-chart-2/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <RevealSection>
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">Stack Technologique</h2>
              <p className="text-muted-foreground">Technologies modernes et éprouvées</p>
            </div>
          </RevealSection>

          <RevealSection delay={100}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {TECH_STACK.map((tech) => (
                <div
                  key={tech.name}
                  className={`px-5 py-2.5 rounded-xl border bg-gradient-to-r ${tech.color} text-sm font-medium hover:scale-105 transition-all duration-300 cursor-default`}
                >
                  {tech.name}
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-chart-2/5 to-chart-1/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <RevealSection>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Prêt à commencer ?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Créez votre compte et commencez à utiliser vos agents IA en quelques secondes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-chart-2 text-primary-foreground font-semibold text-base hover:opacity-90 transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5"
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl border border-border text-sm font-medium hover:bg-accent transition-colors"
              >
                J'ai déjà un compte
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 bg-card/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm">Multi-IA Consultant</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground/60">
              <Link to="/login" className="hover:text-foreground transition-colors">Connexion</Link>
              <Link to="/register" className="hover:text-foreground transition-colors">Inscription</Link>
            </div>
            <p className="text-sm text-muted-foreground/60">© {new Date().getFullYear()} · Projet universitaire</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
