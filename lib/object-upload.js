export function normalizeUploadPrefix(prefix) {
  return prefix.trim().replace(/^\/+/, "").replace(/\/+$/, "")
}

export function buildUploadObjectKey(prefix, relativePath) {
  const normalizedPrefix = normalizeUploadPrefix(prefix)
  const normalizedRelativePath = relativePath.replace(/^\/+/, "")
  return normalizedPrefix ? `${normalizedPrefix}/${normalizedRelativePath}` : normalizedRelativePath
}
