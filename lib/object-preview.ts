type ObjectPreviewMode = "text" | "image" | "audio" | "pdf" | "parquet" | "sandbox" | "download" | "tiff"

interface ObjectPreviewOptions {
  hasPreviewUrl: boolean
  contentType: string
  canRenderText: boolean
  canRenderImage: boolean
  canRenderPdf: boolean
  canRenderParquet: boolean
  canRenderTiff: boolean
}

export function normalizePreviewContentType(contentType: string) {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? ""
}

export function getObjectPreviewMode({
  hasPreviewUrl,
  contentType,
  canRenderText,
  canRenderImage,
  canRenderPdf,
  canRenderParquet,
  canRenderTiff,
}: ObjectPreviewOptions): ObjectPreviewMode {
  if (!hasPreviewUrl) return "download"
  if (normalizePreviewContentType(contentType).startsWith("audio/")) return "audio"
  if (canRenderParquet) return "parquet"
  if (canRenderPdf) return "pdf"
  if (canRenderTiff) return "tiff"
  if (canRenderImage) return "image"
  return canRenderText ? "text" : "sandbox"
}
