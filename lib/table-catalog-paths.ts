export const TABLE_CATALOG_PREFIX = "/iceberg/v1"
export const TABLE_CATALOG_NAMESPACE_SEPARATOR = "\u001f"

const CATALOG_IDENTIFIER_PATTERN = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/

/**
 * Keep a server-advertised catalog prefix on the same-origin path boundary.
 * Catalog config is server data, so reject URL-like and control-character
 * values before using it to construct request URLs.
 */
export function normalizeTableCatalogPrefix(value: unknown) {
  if (typeof value !== "string") return TABLE_CATALOG_PREFIX
  const candidate = value.trim()
  if (!candidate || candidate.includes("://") || /[\u0000-\u001f\u007f?#]/.test(candidate)) {
    return TABLE_CATALOG_PREFIX
  }
  const normalized = `/${candidate.replace(/^\/+/, "").replace(/\/+$/, "")}`
  return normalized === "/" ? TABLE_CATALOG_PREFIX : normalized
}

/**
 * Resolve the operational prefix advertised by the catalog config response.
 * Overrides take precedence over defaults, while malformed server data keeps
 * requests on the canonical same-origin route.
 */
export function resolveTableCatalogPrefix(
  config:
    | {
        defaults?: Record<string, unknown>
        overrides?: Record<string, unknown>
      }
    | null
    | undefined,
) {
  return normalizeTableCatalogPrefix(
    config?.overrides?.["rustfs.catalog-endpoint-prefix"] ?? config?.defaults?.["rustfs.catalog-endpoint-prefix"],
  )
}

function apiPrefix() {
  const value = (process.env.NEXT_PUBLIC_API_PREFIX ?? "").trim().replace(/\/+$/, "")
  if (!value) return ""
  return value.startsWith("/") ? value : `/${value}`
}

/**
 * Build a table-catalog path while preserving the reverse-proxy prefix.
 * The ApiClient signs the resulting absolute URL after resolving it.
 */
export function buildTableCatalogPath(path = "", catalogPrefix = TABLE_CATALOG_PREFIX) {
  const suffix = path.replace(/^\/+/, "")
  const prefix = normalizeTableCatalogPrefix(catalogPrefix)
  return `${apiPrefix()}${prefix}${suffix ? `/${suffix}` : ""}`
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
  const normalized = normalizeTableCatalogPrefix(prefix)
  return normalized.endsWith("/v1") ? normalized.slice(0, -3) || "/" : normalized
}

export function tableBucketCatalogPath(bucket: string, catalogPrefix = TABLE_CATALOG_PREFIX) {
  return buildTableCatalogPath(`buckets/${encodeCatalogSegment(bucket)}`, catalogPrefix)
}

export function namespaceCatalogPath(
  bucket: string,
  namespace: readonly string[],
  catalogPrefix = TABLE_CATALOG_PREFIX,
) {
  return buildTableCatalogPath(
    `${encodeCatalogSegment(bucket)}/namespaces/${encodeNamespaceSegments(namespace)}`,
    catalogPrefix,
  )
}

export function tablesCatalogPath(bucket: string, namespace: readonly string[], catalogPrefix = TABLE_CATALOG_PREFIX) {
  return `${namespaceCatalogPath(bucket, namespace, catalogPrefix)}/tables`
}

export function tableCatalogPath(
  bucket: string,
  namespace: readonly string[],
  table: string,
  catalogPrefix = TABLE_CATALOG_PREFIX,
) {
  return `${tablesCatalogPath(bucket, namespace, catalogPrefix)}/${encodeCatalogSegment(table)}`
}

export function viewsCatalogPath(bucket: string, namespace: readonly string[], catalogPrefix = TABLE_CATALOG_PREFIX) {
  return `${namespaceCatalogPath(bucket, namespace, catalogPrefix)}/views`
}

export function viewCatalogPath(
  bucket: string,
  namespace: readonly string[],
  view: string,
  catalogPrefix = TABLE_CATALOG_PREFIX,
) {
  return `${viewsCatalogPath(bucket, namespace, catalogPrefix)}/${encodeCatalogSegment(view)}`
}
