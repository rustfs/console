const EXTENSION_MIME_TYPES: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  jsonl: "application/x-ndjson",
  ndjson: "application/x-ndjson",
  xml: "application/xml",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  svg: "image/svg+xml",
  yml: "application/yaml",
  yaml: "application/yaml",
}

function inferMimeTypeFromObjectKey(objectKey: string): string {
  const ext = objectKey.split(".").pop()?.toLowerCase() ?? ""
  return EXTENSION_MIME_TYPES[ext] ?? "application/octet-stream"
}

function hasCharset(contentType: string): boolean {
  return /(?:^|;)\s*charset\s*=/i.test(contentType)
}

function isTextualContentType(contentType: string): boolean {
  const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? ""
  return (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/ld+json" ||
    mime === "application/xml" ||
    mime.endsWith("+xml") ||
    mime === "application/javascript" ||
    mime === "application/x-javascript" ||
    mime === "application/ecmascript" ||
    mime === "application/x-ndjson" ||
    mime === "application/ndjson" ||
    mime === "application/yaml" ||
    mime === "application/x-yaml" ||
    mime === "image/svg+xml"
  )
}

async function isValidUtf8(file: Blob): Promise<boolean> {
  const decoder = new TextDecoder("utf-8", { fatal: true })
  const reader = file.stream().getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      decoder.decode(value, { stream: true })
    }
    decoder.decode()
    return true
  } catch {
    return false
  } finally {
    reader.releaseLock()
  }
}

export async function getUploadContentType(file: File, objectKey: string): Promise<string> {
  const baseContentType = file.type || inferMimeTypeFromObjectKey(objectKey)
  if (!isTextualContentType(baseContentType) || hasCharset(baseContentType)) {
    return baseContentType
  }

  if (!(await isValidUtf8(file))) {
    return baseContentType
  }

  return `${baseContentType}; charset=utf-8`
}
