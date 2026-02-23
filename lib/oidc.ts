import type { OidcProvider } from "@/types/config"
import { isSafeRedirectPath } from "@/lib/routes"

/**
 * Fetch configured OIDC providers from the server.
 */
export async function fetchOidcProviders(serverHost: string): Promise<OidcProvider[]> {
  try {
    const url = `${serverHost}/rustfs/admin/v3/oidc/providers`
    const response = await fetch(url, { method: "GET" })
    if (!response.ok) return []
    return await response.json()
  } catch {
    return []
  }
}

/**
 * Redirect the browser to the OIDC authorization endpoint.
 */
export function initiateOidcLogin(serverHost: string, providerId: string, redirectAfter?: string): void {
  let url = `${serverHost}/rustfs/admin/v3/oidc/authorize/${encodeURIComponent(providerId)}`
  if (redirectAfter) {
    url += `?redirect_after=${encodeURIComponent(redirectAfter)}`
  }
  window.location.href = url
}

/**
 * Parse STS credentials from the URL hash fragment (set by OIDC callback).
 * Expected format: #accessKey=...&secretKey=...&sessionToken=...&expiration=...&redirect=/path
 */
export function parseOidcCallback(hash: string): {
  accessKey: string
  secretKey: string
  sessionToken: string
  expiration: string
  redirect: string
} | null {
  // Strip leading # from hash
  const cleaned = hash.replace(/^#\/?/, "")
  if (!cleaned) return null

  const params = new URLSearchParams(cleaned)
  const accessKey = params.get("accessKey")
  const secretKey = params.get("secretKey")
  const sessionToken = params.get("sessionToken")

  if (!accessKey || !secretKey || !sessionToken) return null

  return {
    accessKey,
    secretKey,
    sessionToken,
    expiration: params.get("expiration") ?? "",
    redirect: isSafeRedirectPath(params.get("redirect") ?? "", "/"),
  }
}
