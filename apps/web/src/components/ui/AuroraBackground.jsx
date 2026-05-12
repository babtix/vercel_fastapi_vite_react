import React from "react"
import { useTheme } from "../../contexts/ThemeContext"

export default function AuroraBackground() {
  const { auroraVariant } = useTheme()
  const variantClass = auroraVariant !== "default" ? `aurora-${auroraVariant}` : ""

  return (
    <div className={`aurora-container ${variantClass}`}>
      <div
        className="aurora-blob bg-aurora-1 w-[700px] h-[700px] -top-48 -left-48"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="aurora-blob bg-aurora-2 w-[600px] h-[600px] top-1/3 -right-32"
        style={{ animationDelay: "-7s" }}
      />
      <div
        className="aurora-blob bg-aurora-3 w-[500px] h-[500px] -bottom-32 left-1/3"
        style={{ animationDelay: "-14s" }}
      />
    </div>
  )
}
