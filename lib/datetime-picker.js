import dayjs from "dayjs"
import { normalizeLocale } from "./i18n-config.js"

export const DATE_FNS_LOCALE_CODE_MAP = {
  ar: "ar-MA",
  de: "de",
  en: "en-US",
  es: "es",
  fr: "fr",
  id: "id",
  it: "it",
  ja: "ja",
  ko: "ko",
  pt: "pt-BR",
  ru: "ru",
  tr: "tr",
  vi: "vi",
  zh: "zh-CN",
}

export function getDateFnsLocaleCode(value) {
  return DATE_FNS_LOCALE_CODE_MAP[normalizeLocale(value)] ?? DATE_FNS_LOCALE_CODE_MAP.en
}

export function getHtmlLocale(value) {
  return DATE_FNS_LOCALE_CODE_MAP[normalizeLocale(value)] ?? DATE_FNS_LOCALE_CODE_MAP.en
}

export function toDateInputValue(value) {
  return value && dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : ""
}

export function toDateTimeInputValue(value) {
  return value && dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DDTHH:mm") : ""
}

export function toTimeInputValue(value) {
  return value && dayjs(value).isValid() ? dayjs(value).format("HH:mm") : "00:00"
}

export function toPickerDate(value) {
  return value && dayjs(value).isValid() ? dayjs(value).toDate() : undefined
}

export function toIsoDateInputValue(dateValue, time) {
  if (!dateValue) return null
  const date = dayjs(dateValue)
  return date.isValid() ? toIsoDateTimeValue(date.toDate(), time) : null
}

export function toIsoDateTimeValue(date, time) {
  if (!date) return null

  const [hours = "00", minutes = "00"] = (time || "00:00").split(":")
  const next = dayjs(date).hour(Number(hours)).minute(Number(minutes)).second(0).millisecond(0)
  return next.isValid() ? next.toISOString() : null
}

export function applyDateTimeBounds(value, min, max) {
  const current = dayjs(value)
  if (!current.isValid()) return null

  const minDate = dayjs(min)
  if (minDate.isValid() && current.isBefore(minDate)) return minDate.toISOString()

  const maxDate = dayjs(max)
  if (maxDate.isValid() && current.isAfter(maxDate)) return maxDate.toISOString()

  return current.toISOString()
}

export function formatDisplayDateTime(value, locale) {
  if (!value || !dayjs(value).isValid()) return ""

  return new Intl.DateTimeFormat(getHtmlLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dayjs(value).toDate())
}
