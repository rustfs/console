export function normalizeUploadPrefix(prefix: string): string {
  return prefix.trim().replace(/^\/+/, "").replace(/\/+$/, "")
}

export function buildUploadObjectKey(prefix: string, relativePath: string): string {
  const normalizedPrefix = normalizeUploadPrefix(prefix)
  const normalizedRelativePath = relativePath.replace(/^\/+/, "")
  return normalizedPrefix ? `${normalizedPrefix}/${normalizedRelativePath}` : normalizedRelativePath
}
