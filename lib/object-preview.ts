export type ObjectPreviewMode =
  | "text"
  | "detect-text"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "parquet"
  | "sandbox"
  | "download"
  | "tiff"

export const MAX_TEXT_PREVIEW_BYTES = 1024 * 1024 * 2

const SAFE_TEXT_MIMES = [
  "application/json",
  "application/jsonl",
  "application/ndjson",
  "application/x-ndjson",
  "application/xml",
  "text/plain",
  "text/xml",
  "text/csv",
  "text/markdown",
]
const SAFE_TEXT_EXTENSIONS = [".txt", ".json", ".jsonl", ".ndjson", ".xml", ".csv", ".md", ".yml", ".yaml"]
const GENERIC_CONTENT_TYPES = ["", "application/octet-stream", "binary/octet-stream"]

interface ObjectPreviewOptions {
  hasPreviewUrl: boolean
  contentType: string
  objectSize: number
  canRenderText: boolean
  canRenderImage: boolean
  canRenderPdf: boolean
  canRenderParquet: boolean
  canRenderTiff: boolean
}

export function normalizePreviewContentType(contentType: string) {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? ""
}

export function createObjectPreviewInfo<T extends object>(key: string, info: T, versionId?: string) {
  return { ...info, Key: key, ...(versionId === undefined ? {} : { SelectedVersionId: versionId }) }
}

export function isSafeTextPreview(contentType: string, objectKey: string, objectSize: number) {
  if (objectSize > MAX_TEXT_PREVIEW_BYTES) return false
  if (SAFE_TEXT_MIMES.includes(contentType)) return true
  const keyLower = objectKey.toLowerCase()
  return SAFE_TEXT_EXTENSIONS.some((ext) => keyLower.endsWith(ext))
}

/** Read bounded content before deciding whether a generic object is UTF-8 text. */
export async function readObjectPreviewText(response: Response): Promise<string | null> {
  if (Number(response.headers.get("Content-Length")) > MAX_TEXT_PREVIEW_BYTES) {
    await response.body?.cancel()
    return null
  }
  const reader = response.body?.getReader()
  if (!reader) return null

  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_TEXT_PREVIEW_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  if (!size) return null

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    return null
  }
  // Allow ordinary text whitespace while rejecting binary control characters.
  return !text.length || /[\u0000-\u0008\u000b\u000e-\u001f\u007f-\u009f]/u.test(text) ? null : text
}

export function getObjectPreviewMode({
  hasPreviewUrl,
  contentType,
  objectSize,
  canRenderText,
  canRenderImage,
  canRenderPdf,
  canRenderParquet,
  canRenderTiff,
}: ObjectPreviewOptions): ObjectPreviewMode {
  if (!hasPreviewUrl) return "download"
  const normalizedContentType = normalizePreviewContentType(contentType)
  if (normalizedContentType.startsWith("audio/")) return "audio"
  if (normalizedContentType.startsWith("video/")) return "video"
  if (canRenderParquet) return "parquet"
  if (canRenderPdf) return "pdf"
  if (canRenderTiff) return "tiff"
  if (canRenderImage) return "image"
  if (canRenderText) return "text"
  if (GENERIC_CONTENT_TYPES.includes(normalizedContentType)) {
    return Number.isFinite(objectSize) && objectSize >= 0 && objectSize <= MAX_TEXT_PREVIEW_BYTES
      ? "detect-text"
      : "download"
  }
  return "sandbox"
}
