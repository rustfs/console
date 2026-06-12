export interface ObjectZipDownloadRow {
  Key: string
  type: "prefix" | "object"
}

export interface BuildObjectZipDownloadPayloadInput {
  bucket: string
  basePrefix: string
  rows: ObjectZipDownloadRow[]
}

export interface ObjectZipDownloadPayload {
  bucket: string
  prefix: string
  objects: string[]
  prefixes: string[]
  filename: string
}

export interface CreateObjectZipDownloadResponse {
  download_url: string
  expires_at?: string
}

function sanitizeZipFilename(value: string) {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/^\.+$/, "")
    .replace(/^-+|-+$/g, "")

  return cleaned || "download"
}

export function getObjectZipDownloadFilename(bucket: string, basePrefix: string) {
  const normalizedPrefix = basePrefix.replace(/\/+$/g, "")
  const name = normalizedPrefix ? normalizedPrefix.split("/").pop() : bucket

  return `${sanitizeZipFilename(name || bucket || "download")}.zip`
}

export function buildObjectZipDownloadPayload({
  bucket,
  basePrefix,
  rows,
}: BuildObjectZipDownloadPayloadInput): ObjectZipDownloadPayload {
  return {
    bucket,
    prefix: basePrefix,
    objects: rows.filter((row) => row.type === "object").map((row) => row.Key),
    prefixes: rows.filter((row) => row.type === "prefix").map((row) => row.Key),
    filename: getObjectZipDownloadFilename(bucket, basePrefix),
  }
}

export function normalizeObjectZipDownloadUrl(downloadUrl: string, origin: string) {
  return new URL(downloadUrl, origin).toString()
}
