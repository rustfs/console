import type { PermissionResourceContext } from "@/lib/permission-resources"

export function tableCatalogPermissionContext(
  bucket: string,
  namespace: readonly string[] = [],
  name?: string,
  kind: "tables" | "views" = "tables",
): PermissionResourceContext {
  const namespacePath = namespace.length ? `namespaces/${namespace.join("/")}` : ""
  return {
    bucket,
    objectKey: namespacePath ? (name ? `${namespacePath}/${kind}/${name}` : namespacePath) : "",
  }
}

/** Keep the raw warehouse object prefix used by the server's location authorization. */
export function tableWarehouseLocationPermissionContext(
  bucket: string,
  location: string,
): PermissionResourceContext | null {
  const uri = location.trim()
  if (!uri.startsWith("s3://")) return null
  const path = uri.slice("s3://".length)
  const separator = path.indexOf("/")
  if (separator < 0 || path.slice(0, separator) !== bucket) return null
  const rawPrefix = path.slice(separator + 1)
  const objectKey = rawPrefix.endsWith("/") ? rawPrefix.slice(0, -1) : rawPrefix
  if (
    !objectKey ||
    objectKey.includes("\\") ||
    objectKey.split("/").some((segment) => !segment || segment === "." || segment === "..")
  )
    return null
  return { bucket, objectKey }
}
