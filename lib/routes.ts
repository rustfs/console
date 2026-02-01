import { joinURL } from "ufo"

function getBaseURL(): string {
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname
    const match = pathname.match(/^(\/rustfs\/console)/)
    if (match) {
      return match[1] + "/"
    }
    return ""
  }
  return process.env.NEXT_PUBLIC_BASE_PATH ?? ""
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
