export type ObjectRenameValidation = "empty" | "containsSlash" | "sameName"

export function getObjectBaseName(key: string): string {
  const normalizedKey = key.replace(/\/+$/, "")
  const separatorIndex = normalizedKey.lastIndexOf("/")
  return separatorIndex >= 0 ? normalizedKey.slice(separatorIndex + 1) : normalizedKey
}

export function normalizeObjectRenameName(value: string): string {
  return value.trim()
}

export function buildRenamedObjectKey(sourceKey: string, newName: string): string {
  const normalizedName = normalizeObjectRenameName(newName)
  const normalizedSourceKey = sourceKey.replace(/\/+$/, "")
  const separatorIndex = normalizedSourceKey.lastIndexOf("/")
  return separatorIndex >= 0 ? `${normalizedSourceKey.slice(0, separatorIndex + 1)}${normalizedName}` : normalizedName
}

export function validateObjectRename(sourceKey: string, newName: string): ObjectRenameValidation | null {
  const normalizedName = normalizeObjectRenameName(newName)

  if (!normalizedName) {
    return "empty"
  }

  if (normalizedName.includes("/")) {
    return "containsSlash"
  }

  if (buildRenamedObjectKey(sourceKey, normalizedName) === sourceKey) {
    return "sameName"
  }

  return null
}

export function encodeObjectCopySource(bucket: string, key: string, versionId?: string): string {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/")
  const source = `/${encodeURIComponent(bucket)}/${encodedKey}`
  return versionId ? `${source}?versionId=${encodeURIComponent(versionId)}` : source
}
