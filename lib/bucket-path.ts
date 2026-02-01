import { joinURL } from "ufo"
import { buildRoute } from "./routes"

export function buildBucketPath(bucketName: string, path?: string | string[]): string {
  const base = buildRoute("/browser")
  const encodedBucket = encodeURIComponent(bucketName)
  if (!path || (Array.isArray(path) ? path.join("") : path) === "") {
    return joinURL(base, encodedBucket)
  }
  const pathStr = Array.isArray(path) ? path.join("/") : path
  const normalizedPath = pathStr.length >= 1 && !pathStr.endsWith("/") ? pathStr + "/" : pathStr
  return joinURL(base, encodedBucket, encodeURIComponent(normalizedPath))
}
