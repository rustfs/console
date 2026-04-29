"use client"

import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { loadThemeLocaleOverride } from "@/lib/theme/locales"
import { DEFAULT_LOCALE, LOCALE_CODES, LOCALE_FILE_MAP, normalizeLocale } from "@/lib/i18n-config"

const loadLocale = async (file: string) => {
  const mod = await import(`@/i18n/locales/${file}.json`)
  return mod.default
}

let initPromise: Promise<typeof i18n> | null = null

function createLanguageDetector() {
  const detector = new LanguageDetector()

  detector.addDetector({
    name: "legacyStorage",
    lookup() {
      if (typeof window === "undefined") return undefined

      return window.localStorage.getItem("i18n_redirected") ?? window.localStorage.getItem("lang") ?? undefined
    },
    cacheUserLanguage(lng) {
      if (typeof window === "undefined") return

      const locale = normalizeLocale(lng)
      window.localStorage.setItem("i18n_redirected", locale)
      window.localStorage.setItem("lang", locale)
    },
  })

  return detector
}

export async function initI18n() {
  if (i18n.isInitialized) return i18n
  if (initPromise) return initPromise

  initPromise = (async () => {
    const resources: Record<string, { translation: Record<string, string> }> = {}

    for (const [code, file] of Object.entries(LOCALE_FILE_MAP)) {
      const baseLocale = await loadLocale(file)
      const themeOverride = await loadThemeLocaleOverride(file)

      resources[code] = {
        translation: themeOverride ? { ...baseLocale, ...themeOverride } : baseLocale,
      }
    }

    const languageDetector = createLanguageDetector()

    await i18n
      .use(languageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: LOCALE_CODES,
        nonExplicitSupportedLngs: true,
        load: "languageOnly",
        interpolation: {
          escapeValue: false,
          prefix: "{",
          suffix: "}",
        },
        returnNull: false,
        detection: {
          order: ["querystring", "legacyStorage", "cookie", "localStorage", "navigator", "htmlTag"],
          lookupQuerystring: "lang",
          lookupCookie: "i18n_redirected",
          lookupLocalStorage: "i18n_redirected",
          caches: ["cookie", "localStorage"],
          convertDetectedLanguage: normalizeLocale,
        },
      })

    return i18n
  })()

  return initPromise
}

export { DEFAULT_LOCALE, LOCALE_CODES, RTL_LOCALES, isRtlLocale, normalizeLocale, type Locale } from "@/lib/i18n-config"
