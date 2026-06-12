function sanitizeZipFilename(value) {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/^\.+$/, "")
    .replace(/^-+|-+$/g, "")

  return cleaned || "download"
}

export function getObjectZipDownloadFilename(bucket, basePrefix) {
  const normalizedPrefix = basePrefix.replace(/\/+$/g, "")
  const name = normalizedPrefix ? normalizedPrefix.split("/").pop() : bucket

  return `${sanitizeZipFilename(name || bucket || "download")}.zip`
}

export function buildObjectZipDownloadPayload({ bucket, basePrefix, rows }) {
  return {
    bucket,
    prefix: basePrefix,
    objects: rows.filter((row) => row.type === "object").map((row) => row.Key),
    prefixes: rows.filter((row) => row.type === "prefix").map((row) => row.Key),
    filename: getObjectZipDownloadFilename(bucket, basePrefix),
  }
}

export function normalizeObjectZipDownloadUrl(downloadUrl, origin) {
  return new URL(downloadUrl, origin).toString()
}
