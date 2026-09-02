type JsonRecord = Record<string, unknown>

export type SiteReplicationLocalSiteSource = "server" | "name" | "none"

export interface SiteReplicationLocalSiteCandidate {
  name: string
  deploymentId: string
}

export interface SiteReplicationLocalSiteResolution {
  /** Deployment ID of the local site, or "" when it cannot be determined. */
  deploymentId: string
  /** Which evidence produced the answer. */
  source: SiteReplicationLocalSiteSource
  /** True when the only evidence is a site name shared by several peers. */
  ambiguousName: boolean
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Read the local deployment ID from an admin `/info` response. The server
 * wraps the payload as `{ info: { deploymentID } }`, but accept a bare
 * `InfoMessage` as well so callers can pass either shape.
 */
export function extractServerDeploymentId(value: unknown): string {
  const record = asRecord(value)
  const wrapped = asRecord(record.info ?? record.Info)
  const source = Object.keys(wrapped).length > 0 ? wrapped : record

  return asTrimmedString(source.deploymentID ?? source.deploymentId ?? source.DeploymentID)
}

/**
 * Identify the local site of a site replication group.
 *
 * Every site returns the same `sites` list and the same metrics map, both
 * sorted by deployment ID, so array or key position can never tell which
 * entry is local. The local deployment ID reported by the server itself is
 * the only stable identity; the top-level site name is a fallback that is
 * only trusted when exactly one peer carries it, because the backend does
 * not enforce unique site names.
 */
export function resolveSiteReplicationLocalSite(input: {
  serverDeploymentId?: string | null
  localName?: string | null
  peers: readonly SiteReplicationLocalSiteCandidate[]
}): SiteReplicationLocalSiteResolution {
  const serverDeploymentId = asTrimmedString(input.serverDeploymentId)
  if (serverDeploymentId) {
    return { deploymentId: serverDeploymentId, source: "server", ambiguousName: false }
  }

  const localName = asTrimmedString(input.localName)
  if (!localName) {
    return { deploymentId: "", source: "none", ambiguousName: false }
  }

  const matches = input.peers.filter((peer) => peer.name.trim() === localName && peer.deploymentId.trim())
  if (matches.length === 1) {
    return { deploymentId: matches[0].deploymentId.trim(), source: "name", ambiguousName: false }
  }

  return { deploymentId: "", source: "none", ambiguousName: matches.length > 1 }
}
