import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark")

  // Background effect: "none" | "aurora" | "prism"
  // Migrate from old boolean auroraEnabled key
  const [backgroundEffect, setBackgroundEffectState] = useState(() => {
    const saved = localStorage.getItem("backgroundEffect")
    if (saved) return saved

    // Legacy migration: convert old boolean to new enum
    const legacyAurora = localStorage.getItem("auroraEnabled")
    if (legacyAurora === "true") return "aurora"
    if (legacyAurora === "false") return "none"

    return "aurora" // default for new users
  })

  const [primaryColor, setPrimaryColorState] = useState(() => localStorage.getItem("primaryColor") || "default")
  const [codeTheme, setCodeThemeState] = useState(() => localStorage.getItem("codeTheme") || "oneDark")
  const [auroraVariant, setAuroraVariantState] = useState(() => localStorage.getItem("auroraVariant") || "default")
  const [fontSize, setFontSizeState] = useState(() => localStorage.getItem("fontSize") || "normal")
  const [bgIntensity, setBgIntensityState] = useState(() => parseFloat(localStorage.getItem("bgIntensity") || "0.7"))

  /**
   * Synchronize all theme-related settings to the DOM and localStorage.
   *
   * Runs whenever any theme setting changes. It updates:
   *   - data-theme attribute and .dark class on <html>
   *   - Primary color CSS class
   *   - Font size CSS class
   *   - localStorage persistence for all preferences
   */
  useEffect(() => {
    const root = document.documentElement

    // Base dark/light theme
    root.setAttribute("data-theme", theme)

    // Also keep .dark class for Tailwind compatibility if needed
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }

    localStorage.setItem("theme", theme)

    // Primary color classes
    const colors = ["theme-default", "theme-blue", "theme-emerald", "theme-violet", "theme-rose", "theme-amber"]
    colors.forEach(c => root.classList.remove(c))
    if (primaryColor !== "default") {
      root.classList.add(`theme-${primaryColor}`)
    }
    localStorage.setItem("primaryColor", primaryColor)

    // Other settings
    localStorage.setItem("backgroundEffect", backgroundEffect)
    localStorage.setItem("codeTheme", codeTheme)
    localStorage.setItem("auroraVariant", auroraVariant)

    // Font size classes
    const fontSizes = ["text-sm-base", "text-normal-base", "text-lg-base"]
    fontSizes.forEach(s => root.classList.remove(s))
    root.classList.add(`text-${fontSize}-base`)
    localStorage.setItem("fontSize", fontSize)

    localStorage.setItem("bgIntensity", bgIntensity)

  }, [theme, primaryColor, backgroundEffect, codeTheme, auroraVariant, fontSize, bgIntensity])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }, [])

  // Keep backward-compatible helpers
  const auroraEnabled = backgroundEffect !== "none"

  const toggleAurora = useCallback(() => {
    setBackgroundEffectState((prev) => (prev === "none" ? "aurora" : "none"))
  }, [])

  const setBackgroundEffect = useCallback((effect) => {
    setBackgroundEffectState(effect)
  }, [])

  const setPrimaryColor = useCallback((color) => {
    setPrimaryColorState(color)
  }, [])

  const setCodeTheme = useCallback((theme) => {
    setCodeThemeState(theme)
  }, [])

  const setAuroraVariant = useCallback((variant) => {
    setAuroraVariantState(variant)
  }, [])

  const setFontSize = useCallback((size) => {
    setFontSizeState(size)
  }, [])

  const setBgIntensity = useCallback((val) => {
    setBgIntensityState(val)
  }, [])

  const value = useMemo(() => ({
    theme, toggleTheme,
    auroraEnabled, toggleAurora,
    backgroundEffect, setBackgroundEffect,
    primaryColor, setPrimaryColor,
    codeTheme, setCodeTheme,
    auroraVariant, setAuroraVariant,
    fontSize, setFontSize,
    bgIntensity, setBgIntensity
  }), [theme, toggleTheme, auroraEnabled, toggleAurora, backgroundEffect, setBackgroundEffect, primaryColor, setPrimaryColor, codeTheme, setCodeTheme, auroraVariant, setAuroraVariant, fontSize, setFontSize, bgIntensity, setBgIntensity])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}


export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
