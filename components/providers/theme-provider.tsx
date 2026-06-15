"use client"

import { useEffect } from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

const THEME_COLOR = {
  light: "#ffffff",
  dark: "#171717",
} as const

function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (resolvedTheme !== "dark" && resolvedTheme !== "light") return

    const color = THEME_COLOR[resolvedTheme]
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-theme-sync="true"]')

    if (!meta) {
      meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
    }

    if (!meta) {
      meta = document.createElement("meta")
      meta.name = "theme-color"
      document.head.appendChild(meta)
    }

    meta.dataset.themeSync = "true"
    meta.content = color
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="active_theme"
      themes={["light", "dark", "system"]}
    >
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  )
}
