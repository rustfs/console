"use client"

import { buildRoute } from "@/lib/routes"
import { getThemeId } from "@/lib/theme/manifest"

export async function loadThemeLocaleOverride(localeFile: string): Promise<Record<string, string> | null> {
  const themeId = getThemeId()
  if (!themeId) return null

  try {
    const response = await fetch(buildRoute(`/themes/${themeId}/locales/${localeFile}.json`))
    if (!response.ok) return null

    const data: unknown = await response.json()
    if (typeof data !== "object" || data === null || Array.isArray(data)) return null

    const normalized: Record<string, string> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (typeof value === "string") {
        normalized[key] = value
      }
    }
    return normalized
  } catch {
    return null
  }
}
