export const DEFAULT_LOCALE = "en"

export const LOCALE_FILE_MAP = {
  en: "en-US",
  ar: "ar-MA",
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
  vi: "vi-VN",
} as const

export type Locale = keyof typeof LOCALE_FILE_MAP

export const LOCALE_CODES = Object.keys(LOCALE_FILE_MAP) as Locale[]
export const RTL_LOCALES = new Set<Locale>(["ar"])

const LOCALE_ALIASES: Record<string, Locale> = {
  ar: "ar",
  arma: "ar",
  de: "de",
  dede: "de",
  en: "en",
  enus: "en",
  es: "es",
  eses: "es",
  fr: "fr",
  frfr: "fr",
  id: "id",
  idid: "id",
  it: "it",
  itit: "it",
  ja: "ja",
  jajp: "ja",
  ko: "ko",
  kokr: "ko",
  pt: "pt",
  ptbr: "pt",
  ru: "ru",
  ruru: "ru",
  tr: "tr",
  trtr: "tr",
  vi: "vi",
  vivn: "vi",
  zh: "zh",
  zhcn: "zh",
  zhhans: "zh",
}

function isLocale(value: string): value is Locale {
  return Object.prototype.hasOwnProperty.call(LOCALE_FILE_MAP, value)
}

export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE

  const normalized = value.trim().replace(/_/g, "-").toLowerCase()
  const compact = normalized.replace(/-/g, "")
  const alias = LOCALE_ALIASES[compact]
  if (alias) return alias

  const language = normalized.split("-")[0]
  return isLocale(language) ? language : DEFAULT_LOCALE
}

export function getLocaleFile(value: string | null | undefined): (typeof LOCALE_FILE_MAP)[Locale] {
  return LOCALE_FILE_MAP[normalizeLocale(value)]
}

export function isRtlLocale(value: string | null | undefined): boolean {
  return RTL_LOCALES.has(normalizeLocale(value))
}
