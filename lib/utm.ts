const UTM_SOURCE = "rustfs-console"
const UTM_MEDIUM = "referral"

/**
 * Append UTM tracking params to an external (http/https) URL.
 *
 * URLs that already carry any utm_* param are returned unchanged so
 * theme authors keep full control over their own tracking.
 *
 * @param content optional placement label (e.g. "sidebar") for utm_content
 */
export function withUtm(url: string, content?: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return url
  }

  for (const key of parsed.searchParams.keys()) {
    if (key.toLowerCase().startsWith("utm_")) {
      return url
    }
  }

  const utm = new URLSearchParams({ utm_source: UTM_SOURCE, utm_medium: UTM_MEDIUM })
  if (content) {
    utm.set("utm_content", content)
  }

  // Concatenate instead of searchParams.set() so existing params stay
  // byte-identical (some third-party URLs carry signed values).
  parsed.search = parsed.search ? `${parsed.search}&${utm}` : `?${utm}`
  return parsed.toString()
}
