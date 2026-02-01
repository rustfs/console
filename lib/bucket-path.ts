import { joinURL } from "ufo"

/**
 * Builds the bucket/object path for Next.js navigation (Link, router.push).
 * Returns path WITHOUT basePath - Next.js automatically prepends basePath.
 */
export function buildBucketPath(bucketName: string, path?: string | string[]): string {
  const base = "/browser"
  const encodedBucket = encodeURIComponent(bucketName)
  if (!path || (Array.isArray(path) ? path.join("") : path) === "") {
    return joinURL(base, encodedBucket)
  }
  const pathStr = Array.isArray(path) ? path.join("/") : path
  const normalizedPath = pathStr.length >= 1 && !pathStr.endsWith("/") ? pathStr + "/" : pathStr
  return joinURL(base, encodedBucket, encodeURIComponent(normalizedPath))
}
