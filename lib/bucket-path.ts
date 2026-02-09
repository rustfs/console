/**
 * Builds the bucket/object path for Next.js navigation (Link, router.push).
 * Returns path WITHOUT basePath - Next.js automatically prepends basePath.
 */
export function buildBucketPath(bucketName: string, path?: string | string[]): string {
  if (!bucketName) {
    return "/browser"
  }

  const params = new URLSearchParams({ bucket: bucketName })
  const pathStr = Array.isArray(path) ? path.join("/") : (path ?? "")
  if (pathStr !== "") {
    const normalizedPath = pathStr.endsWith("/") ? pathStr : `${pathStr}/`
    params.set("key", normalizedPath)
  }

  return `/browser?${params.toString()}`
}
