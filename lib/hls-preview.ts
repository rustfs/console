type SignHlsObject = (key: string, versionId?: string) => Promise<string>

export function createHlsPreviewSource(signedUrl: string, bucketName: string, objectKey: string, sign: SignHlsObject) {
  const manifest = new URL(signedUrl)
  const segments = manifest.pathname.split("/")
  const keyStart = segments.length - objectKey.split("/").length

  // Console uses path-style S3 URLs. Keep any endpoint path ahead of the bucket.
  if (
    keyStart < 2 ||
    segments[keyStart - 1] !== bucketName ||
    decodeURIComponent(segments.slice(keyStart).join("/")) !== objectKey
  ) {
    throw new Error("Invalid HLS manifest URL")
  }

  const bucketPath = segments.slice(0, keyStart).join("/") + "/"
  const manifestVersion = manifest.searchParams.get("versionId")
  manifest.search = ""
  manifest.hash = ""
  if (manifestVersion !== null) manifest.searchParams.set("versionId", manifestVersion)

  return {
    url: manifest.href,
    async request(resourceUrl: string, init: RequestInit) {
      const resource = new URL(resourceUrl, manifest)
      if (
        resource.origin !== manifest.origin ||
        resource.username ||
        resource.password ||
        !resource.pathname.startsWith(bucketPath)
      ) {
        throw new Error("HLS resource is outside the preview bucket")
      }

      const key = decodeURIComponent(resource.pathname.slice(bucketPath.length))
      // Encoded separators can hide dot segments until the key is passed to the S3 SDK.
      if (!key || key.split("/").some((part) => part === "." || part === "..")) {
        throw new Error("Invalid HLS object key")
      }

      const versionId = resource.searchParams.get("versionId") ?? undefined
      init.signal?.throwIfAborted()
      const url = await sign(key, versionId)
      return new Request(url, { ...init, credentials: "omit", redirect: "error" })
    },
  }
}
