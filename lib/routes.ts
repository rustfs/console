import { joinURL } from "ufo"

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/rustfs/console"

function getBaseURL(): string {
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname
    if (!BASE_PATH) return ""
    const escaped = BASE_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const match = pathname.match(new RegExp(`^(${escaped})`))
    if (match) return match[1] + "/"
    return ""
  }
  return BASE_PATH
}

export function buildRoute(path: string): string {
  const baseURL = getBaseURL()
  const normalizedPath = path.replace(/^\//, "")
  if (!baseURL) {
    return normalizedPath ? `/${normalizedPath}` : "/"
  }
  return joinURL(baseURL.replace(/\/$/, ""), normalizedPath || "")
}

export function getLoginRoute(): string {
  return buildRoute("/auth/login")
}

/**
 * Validate that a redirect path is safe (relative, no protocol, no external domain).
 * Returns the path if safe, or the fallback otherwise.
 */
export function isSafeRedirectPath(path: string, fallback = "/"): string {
  if (!path || typeof path !== "string") return fallback

  const trimmed = path.trim()

  // Block absolute URLs with protocol (e.g. https://evil.com)
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback

  // Block protocol-relative URLs and backslash variants (e.g. //evil.com, \/evil.com, \\evil.com)
  // Some browsers treat backslashes as forward slashes in URLs
  if (/^[\\/]{2,}/.test(trimmed)) return fallback

  // Block single leading backslash (e.g. \evil.com) which some browsers interpret as //
  if (trimmed.startsWith("\\")) return fallback

  // Block data: and javascript: URIs (case-insensitive, with optional whitespace)
  if (/^\s*(javascript|data)\s*:/i.test(trimmed)) return fallback

  // Ensure it starts with / (relative path)
  if (!trimmed.startsWith("/")) return fallback

  // Block directory traversal sequences (e.g. /../evil.com, /../../etc/passwd)
  if (/(?:^|\/)\.\.(?:\/|$)/.test(trimmed)) return fallback

  return trimmed
}
