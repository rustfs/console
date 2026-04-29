"use client"

import { buildRoute } from "@/lib/routes"
import { getThemeId } from "@/lib/theme/manifest"

const localeIndexPromises = new Map<string, Promise<Set<string>>>()

async function getThemeLocaleIndex(themeId: string): Promise<Set<string>> {
  let localeIndexPromise = localeIndexPromises.get(themeId)
  if (!localeIndexPromise) {
    localeIndexPromise = (async () => {
      try {
        const response = await fetch(buildRoute(`/themes/${themeId}/locales/index.json`))
        if (!response.ok) return new Set<string>()
        const data: unknown = await response.json()
        if (!Array.isArray(data)) return new Set<string>()
        const normalized = data.filter((item): item is string => typeof item === "string")
        return new Set(normalized)
      } catch {
        return new Set<string>()
      }
    })()
    localeIndexPromises.set(themeId, localeIndexPromise)
  }

  return localeIndexPromise
}

export async function loadThemeLocaleOverride(localeFile: string): Promise<Record<string, string> | null> {
  const themeId = getThemeId()
  if (!themeId) return null

  try {
    const localeIndex = await getThemeLocaleIndex(themeId)
    if (!localeIndex.has(localeFile)) return null

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
