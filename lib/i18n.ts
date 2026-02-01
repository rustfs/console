"use client"

import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

// Map short locale codes (from Nuxt i18n_redirected) to locale file names
const LOCALE_FILE_MAP: Record<string, string> = {
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
  it: "it-IT",
  ru: "ru-RU",
  tr: "tr-TR",
  id: "id-ID",
}

export type Locale = keyof typeof LOCALE_FILE_MAP
export const LOCALE_CODES: Locale[] = Object.keys(
  LOCALE_FILE_MAP
) as Locale[]

const loadLocale = async (file: string) => {
  const mod = await import(`@/i18n/locales/${file}.json`)
  return mod.default
}

export async function initI18n() {
  const resources: Record<string, { translation: Record<string, string> }> = {}

  for (const [code, file] of Object.entries(LOCALE_FILE_MAP)) {
    resources[code] = {
      translation: await loadLocale(file),
    }
  }

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "en",
      supportedLngs: LOCALE_CODES,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["cookie", "localStorage", "navigator"],
        lookupCookie: "i18n_redirected",
        lookupLocalStorage: "i18n_redirected",
        caches: ["cookie", "localStorage"],
      },
    })

  return i18n
}
