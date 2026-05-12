/**
 * Card component displaying an AI agent's summary.
 *
 * Props:
 * - agent: Agent object with name, description, model_name, provider, logo_url, rag_enabled.
 * - index: Number used for staggered animation delay.
 * - onClick: Callback fired when the card is clicked.
 * - actions: Optional React nodes rendered as action buttons.
 */

import { useState } from "react"
import { getAssetUrl } from "../lib/api"
import {
  Bot,
  ArrowRight,
  Cloud,
  Server,
  Monitor,
  BookOpen,
  Cpu,
} from "lucide-react"

const PROVIDER_META = {
  cloud: { icon: Cloud, label: "Cloud", color: "text-amber-500" },
  lmstudio: { icon: Monitor, label: "LM Studio", color: "text-sky-500" },
  ollama: { icon: Server, label: "Local", color: "text-emerald-500" },
  default: { icon: Cpu, label: "IA", color: "text-primary" },
}

function getProviderMeta(agent) {
  if (agent.model_name?.toLowerCase().includes("cloud")) return PROVIDER_META.cloud
  if (agent.provider === "lmstudio") return PROVIDER_META.lmstudio
  if (agent.provider === "ollama") return PROVIDER_META.ollama
  return PROVIDER_META.default
}

export default function AgentCard({ agent, index = 0, onClick, actions }) {
  const [imgError, setImgError] = useState(false)
  const meta = getProviderMeta(agent)
  const ProviderIcon = meta.icon

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card
        transition-all duration-200
        hover:border-primary/30 hover:shadow-md
        ${onClick && !actions ? "cursor-pointer" : ""}
        animate-fade-in
      `}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex flex-col flex-1 p-5">
        {/* Header: Logo */}
        <div className="mb-4">
          <div className="relative inline-block">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-chart-2/15 flex items-center justify-center">
              {agent.logo_url && !imgError ? (
                <img
                  src={getAssetUrl(agent.logo_url)}
                  alt={agent.name}
                  className="w-8 h-8 rounded-lg object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <Bot className="w-6 h-6 text-primary/80" />
              )}
            </div>
            {agent.rag_enabled && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border border-card flex items-center justify-center">
                <BookOpen className="w-2 h-2 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors line-clamp-1">
          {agent.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
          {agent.description}
        </p>

        {/* Footer: Model name with provider icon */}
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70 bg-muted/50 px-2 py-1 rounded-md border border-border/40 truncate max-w-[160px]">
            <ProviderIcon className={`w-3 h-3 shrink-0 ${meta.color}`} />
            {agent.model_name}
          </span>

          {actions ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          ) : onClick ? (
            <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Discuter
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
