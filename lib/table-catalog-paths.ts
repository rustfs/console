export const TABLE_CATALOG_PREFIX = "/iceberg/v1"
export const TABLE_CATALOG_NAMESPACE_SEPARATOR = "\u001f"

const CATALOG_IDENTIFIER_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/

function apiPrefix() {
  const value = (process.env.NEXT_PUBLIC_API_PREFIX ?? "").trim().replace(/\/+$/, "")
  if (!value) return ""
  return value.startsWith("/") ? value : `/${value}`
}

/**
 * Build a table-catalog path while preserving the reverse-proxy prefix.
 * The ApiClient signs the resulting absolute URL after resolving it.
 */
export function buildTableCatalogPath(path = "") {
  const suffix = path.replace(/^\/+/, "")
  return `${apiPrefix()}${TABLE_CATALOG_PREFIX}${suffix ? `/${suffix}` : ""}`
}

export function encodeCatalogSegment(value: string) {
  return encodeURIComponent(value)
}

/**
 * Iceberg REST uses U+001F between namespace segments. Keep the separator
 * encoded as %1F in the URL so dotted namespaces remain unambiguous.
 */
export function encodeNamespaceSegments(namespace: readonly string[]) {
  return encodeURIComponent(namespace.join(TABLE_CATALOG_NAMESPACE_SEPARATOR))
}

export function displayNamespace(namespace: readonly string[]) {
  return namespace.join(".")
}

export function isCatalogIdentifierValid(value: string) {
  return CATALOG_IDENTIFIER_PATTERN.test(value)
}

export function tableCatalogBasePath(prefix = TABLE_CATALOG_PREFIX) {
  const normalized = prefix.replace(/\/+$/, "")
  return normalized.endsWith("/v1") ? normalized.slice(0, -3) || "/" : normalized
}

export function tableBucketCatalogPath(bucket: string) {
  return buildTableCatalogPath(`buckets/${encodeCatalogSegment(bucket)}`)
}

export function namespaceCatalogPath(bucket: string, namespace: readonly string[]) {
  return buildTableCatalogPath(`${encodeCatalogSegment(bucket)}/namespaces/${encodeNamespaceSegments(namespace)}`)
}

export function tablesCatalogPath(bucket: string, namespace: readonly string[]) {
  return `${namespaceCatalogPath(bucket, namespace)}/tables`
}

export function tableCatalogPath(bucket: string, namespace: readonly string[], table: string) {
  return `${tablesCatalogPath(bucket, namespace)}/${encodeCatalogSegment(table)}`
}

export function viewsCatalogPath(bucket: string, namespace: readonly string[]) {
  return `${namespaceCatalogPath(bucket, namespace)}/views`
}

export function viewCatalogPath(bucket: string, namespace: readonly string[], view: string) {
  return `${viewsCatalogPath(bucket, namespace)}/${encodeCatalogSegment(view)}`
}
