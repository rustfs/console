"use client"

import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { loadThemeLocaleOverride } from "@/lib/theme/locales"
import { DEFAULT_LOCALE, LOCALE_CODES, LOCALE_FILE_MAP, normalizeLocale, type Locale } from "@/lib/i18n-config"

const loadLocale = async (file: string) => {
  const mod = await import(`@/i18n/locales/${file}.json`)
  return mod.default as Record<string, string>
}

let initPromise: Promise<typeof i18n> | null = null
const loadedLocales = new Set<Locale>()

function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE

  const queryLocale = new URLSearchParams(window.location.search).get("lang")
  if (queryLocale) return normalizeLocale(queryLocale)

  const legacyStorage = window.localStorage.getItem("i18n_redirected") ?? window.localStorage.getItem("lang")
  if (legacyStorage) return normalizeLocale(legacyStorage)

  const cookieLocale = getCookieValue("i18n_redirected")
  if (cookieLocale) return normalizeLocale(cookieLocale)

  const navigatorLocale = window.navigator.languages?.[0] ?? window.navigator.language
  if (navigatorLocale) return normalizeLocale(navigatorLocale)

  return normalizeLocale(document.documentElement.lang)
}

async function loadLocaleResource(locale: Locale): Promise<Record<string, string>> {
  const file = LOCALE_FILE_MAP[locale]
  const [baseLocale, themeOverride] = await Promise.all([loadLocale(file), loadThemeLocaleOverride(file)])
  return themeOverride ? { ...baseLocale, ...themeOverride } : baseLocale
}

export async function ensureLocaleResources(localeInput: string | null | undefined): Promise<Locale> {
  const locale = normalizeLocale(localeInput)
  if (loadedLocales.has(locale) && i18n.hasResourceBundle(locale, "translation")) return locale

  const resources = await loadLocaleResource(locale)
  i18n.addResourceBundle(locale, "translation", resources, true, true)
  loadedLocales.add(locale)
  return locale
}

export async function changeLocale(localeInput: string | null | undefined): Promise<void> {
  const locale = await ensureLocaleResources(localeInput)
  await i18n.changeLanguage(locale)
}

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
    const initialLocale = detectInitialLocale()
    const initialLocales = [...new Set<Locale>([DEFAULT_LOCALE, initialLocale])]
    const resources: Record<string, { translation: Record<string, string> }> = {}

    await Promise.all(
      initialLocales.map(async (code) => {
        const translation = await loadLocaleResource(code)
        loadedLocales.add(code)
        resources[code] = { translation }
      }),
    )

    for (const code of initialLocales) {
      resources[code] = {
        translation: resources[code].translation,
      }
    }

    const languageDetector = createLanguageDetector()

    await i18n
      .use(languageDetector)
      .use(initReactI18next)
      .init({
        resources,
        lng: initialLocale,
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

  try {
    return await initPromise
  } catch (error) {
    initPromise = null
    throw error
  }
}

export { DEFAULT_LOCALE, LOCALE_CODES, RTL_LOCALES, isRtlLocale, normalizeLocale, type Locale } from "@/lib/i18n-config"
