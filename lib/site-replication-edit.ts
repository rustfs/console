/**
 * What an operator should do after a site's endpoint changes. Writes made
 * while the old address was unreachable are not replayed automatically:
 * - "resync-peer": a peer moved, so this site's writes may be missing there;
 *   this console can start the resync itself.
 * - "resync-from-peers": this site moved, so the peers' writes may be missing
 *   here; the resync has to be started from each peer site.
 */
export type SiteReplicationResyncAdvice = "none" | "resync-peer" | "resync-from-peers"

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, "").toLowerCase()
}

export function siteReplicationEndpointChanged(previousEndpoint: string, nextEndpoint: string): boolean {
  return normalizeEndpoint(previousEndpoint) !== normalizeEndpoint(nextEndpoint)
}

export function siteReplicationResyncAdvice({
  isLocal,
  previousEndpoint,
  nextEndpoint,
}: {
  isLocal: boolean
  previousEndpoint: string
  nextEndpoint: string
}): SiteReplicationResyncAdvice {
  if (!siteReplicationEndpointChanged(previousEndpoint, nextEndpoint)) {
    return "none"
  }

  return isLocal ? "resync-from-peers" : "resync-peer"
}
