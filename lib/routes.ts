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
