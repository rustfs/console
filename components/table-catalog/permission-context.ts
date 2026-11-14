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
    ...(namespacePath ? { objectKey: name ? `${namespacePath}/${kind}/${name}` : namespacePath } : {}),
  }
}
