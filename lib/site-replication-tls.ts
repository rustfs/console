export type SiteReplicationTlsMode = "verify" | "custom-ca" | "skip"

export interface SiteReplicationTlsPayload {
  skipTlsVerify: boolean
  caCertPem: string
}

export function isHttpsSiteReplicationEndpoint(endpoint: string): boolean {
  return /^https:\/\//i.test(endpoint.trim())
}

export function getSiteReplicationTlsMode(config: SiteReplicationTlsPayload): SiteReplicationTlsMode {
  if (config.skipTlsVerify) return "skip"
  if (config.caCertPem.trim()) return "custom-ca"
  return "verify"
}

export function buildSiteReplicationTlsPayload(
  endpoint: string,
  mode: SiteReplicationTlsMode,
  caCertPem: string,
): SiteReplicationTlsPayload {
  if (!isHttpsSiteReplicationEndpoint(endpoint)) {
    return { skipTlsVerify: false, caCertPem: "" }
  }

  if (mode === "skip") {
    return { skipTlsVerify: true, caCertPem: "" }
  }

  if (mode === "custom-ca") {
    return { skipTlsVerify: false, caCertPem: caCertPem.trim() }
  }

  return { skipTlsVerify: false, caCertPem: "" }
}
