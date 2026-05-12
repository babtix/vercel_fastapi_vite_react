import { useTheme } from "../../contexts/ThemeContext"
import { ThemeToggle } from "../ThemeToggle"
import Prism from "../ui/Prism"
import AuroraBackground from "../ui/AuroraBackground"
import PixelBlast from "../ui/PixelBlast"
import { Sparkles, Triangle, Grid3x3 } from "lucide-react"

const EFFECTS = [
  {
    value: "none",
    label: "Aucun",
    desc: "Arrière-plan uni sans animation",
    icon: null,
  },
  {
    value: "aurora",
    label: "Aurora",
    desc: "Effet d'aurore boréale avec des blobs colorés",
    icon: Sparkles,
    color: "from-blue-500/20 to-emerald-500/20 border-blue-500/40",
  },
  {
    value: "prism",
    label: "Prism 3D",
    desc: "Pyramide 3D animée avec shader WebGL",
    icon: Triangle,
    color: "from-violet-500/20 to-amber-500/20 border-violet-500/40",
  },
  {
    value: "pixelblast",
    label: "Pixel Blast",
    desc: "Pixels animés interactifs avec effet de ripple au clic",
    icon: Grid3x3,
    color: "from-purple-500/20 to-pink-500/20 border-purple-500/40",
  },
]

const COLORS = [
  { value: "default", label: "Défaut",   hex: "oklch(0.437 0.078 188)" },
  { value: "blue",    label: "Bleu",     hex: "oklch(0.55 0.2 240)"    },
  { value: "emerald", label: "Émeraude", hex: "oklch(0.55 0.18 160)"   },
  { value: "violet",  label: "Violet",   hex: "oklch(0.55 0.22 290)"   },
  { value: "rose",    label: "Rose",     hex: "oklch(0.55 0.2 10)"     },
  { value: "amber",   label: "Ambre",    hex: "oklch(0.65 0.18 80)"    },
]

const FONT_SIZES = [
  { value: "sm",     label: "Petit",  preview: "Aa" },
  { value: "normal", label: "Normal", preview: "Aa" },
  { value: "lg",     label: "Grand",  preview: "Aa" },
]

export default function UISettings() {
  const { backgroundEffect, setBackgroundEffect, auroraVariant, setAuroraVariant, primaryColor, setPrimaryColor, fontSize, setFontSize, bgIntensity, setBgIntensity } = useTheme()

  const auroraVariants = [
    { value: "default", label: "Par défaut (Bleu/Vert)" },
    { value: "twilight", label: "Crépuscule (Violet/Rose)" },
    { value: "cyberpunk", label: "Cyberpunk (Néon/Cyan)" },
    { value: "boreal", label: "Boréale (Émeraude)" },
  ]

  return (
    <div className="space-y-4">
      {/* Theme */}
      <div className="flex items-center justify-between p-5 bg-card border border-border/50 rounded-xl">
        <div>
          <p className="font-semibold text-sm">Thème sombre/clair</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modifier l'apparence globale de l'interface
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Accent Color */}
      <div className="p-5 bg-card border border-border/50 rounded-xl space-y-3">
        <div>
          <p className="font-semibold text-sm">Couleur d'accent</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personnalisez la couleur principale de l'interface
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setPrimaryColor(c.value)}
              title={c.label}
              aria-label={`Couleur ${c.label}`}
              className={`relative w-9 h-9 rounded-full transition-all duration-200 hover:scale-110 ring-offset-2 ring-offset-background ${
                primaryColor === c.value ? "ring-2 scale-110" : ""
              }`}
              style={{ backgroundColor: c.hex, "--tw-ring-color": c.hex }}
            >
              {primaryColor === c.value && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold drop-shadow">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="flex items-center justify-between p-5 bg-card border border-border/50 rounded-xl">
        <div>
          <p className="font-semibold text-sm">Taille du texte</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ajustez la taille de police globale
          </p>
        </div>
        <div className="flex items-center gap-2">
          {FONT_SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFontSize(s.value)}
              aria-label={`Taille ${s.label}`}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-xs transition-all ${
                fontSize === s.value
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span className={`font-bold leading-none ${
                s.value === "sm" ? "text-base" : s.value === "lg" ? "text-2xl" : "text-lg"
              }`}>{s.preview}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Background Effect Selector */}
      <div className="p-5 bg-card border border-border/50 rounded-xl space-y-4">
        <div>
          <p className="font-semibold text-sm">Effet d'arrière-plan</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choisissez l'animation d'arrière-plan du dashboard
          </p>
        </div>

        {/* Cards to pick effect */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {EFFECTS.map((effect) => {
            const isActive = backgroundEffect === effect.value
            return (
              <button
                key={effect.value}
                onClick={() => setBackgroundEffect(effect.value)}
                className={`relative text-left p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 ${
                  isActive
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border/50 bg-card hover:border-border hover:bg-accent/50"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                )}

                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    effect.icon
                      ? `bg-gradient-to-br ${effect.color}`
                      : "bg-muted/50 border border-border/50"
                  }`}
                >
                  {effect.icon ? (
                    <effect.icon className="w-5 h-5 text-foreground/70" />
                  ) : (
                    <div className="w-4 h-4 rounded border-2 border-dashed border-muted-foreground/30" />
                  )}
                </div>

                <p className={`text-sm font-semibold mb-0.5 ${isActive ? "text-primary" : ""}`}>
                  {effect.label}
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {effect.desc}
                </p>
              </button>
            )
          })}
        </div>

        {/* Aurora variants — only show when aurora is selected */}
        {backgroundEffect === "aurora" && (
          <div className="pt-3 border-t border-border/50 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Variante d'ambiance</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {auroraVariants.map((variant) => (
                <button
                  key={variant.value}
                  onClick={() => setAuroraVariant(variant.value)}
                  className={`px-3 py-2 rounded-lg border text-xs text-center transition-all ${auroraVariant === variant.value
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Intensity slider */}
        {backgroundEffect !== "none" && (
          <div className="pt-3 border-t border-border/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Intensité</p>
              <span className="text-xs font-semibold text-primary">{Math.round(bgIntensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={bgIntensity}
              onChange={(e) => setBgIntensity(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
              aria-label="Intensité de l'arrière-plan"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50">
              <span>Subtil</span>
              <span>Maximum</span>
            </div>
          </div>
        )}

        {/* Live Preview */}
        {backgroundEffect !== "none" && (
          <div className="pt-3 border-t border-border/50 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Aperçu en direct</p>
            <div className="relative w-full h-48 rounded-xl overflow-hidden border border-border/30 bg-black/20" style={{ opacity: bgIntensity }}>
              {backgroundEffect === "prism" && (
                <Prism
                  animationType="3drotate"
                  timeScale={0.15}
                  height={4.2}
                  baseWidth={5.7}
                  scale={3.6}
                  hueShift={0.6584}
                  colorFrequency={1.1}
                  noise={0}
                  glow={0.35}
                />
              )}
              {backgroundEffect === "aurora" && (
                <div className="absolute inset-0">
                  <AuroraBackground />
                </div>
              )}
              {backgroundEffect === "pixelblast" && (
                <PixelBlast
                  variant="circle"
                  pixelSize={3}
                  color="#B497CF"
                  speed={0.5}
                  patternScale={2}
                  patternDensity={1}
                  enableRipples={true}
                  edgeFade={0.5}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
