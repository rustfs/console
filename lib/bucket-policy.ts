export function resourceMatch(pattern: string, resource: string): boolean {
  if (!pattern) {
    return resource === pattern
  }
  if (pattern === "*") {
    return true
  }
  const parts = pattern.split("*")
  if (parts.length === 1) {
    return resource === pattern
  }
  const tGlob = pattern.endsWith("*")
  const end = parts.length - 1
  const firstPart = parts[0] ?? ""
  if (!resource.startsWith(firstPart)) {
    return false
  }
  let remainingResource = resource.slice(firstPart.length)
  for (let i = 1; i < end; i++) {
    const part = parts[i]
    if (!part) {
      continue
    }
    if (!remainingResource.includes(part)) {
      return false
    }
    const idx = remainingResource.indexOf(part) + part.length
    remainingResource = remainingResource.slice(idx)
  }
  const lastPart = parts[end] ?? ""
  if (tGlob) {
    return true
  }
  return remainingResource.endsWith(lastPart) || resource.endsWith(lastPart)
}
