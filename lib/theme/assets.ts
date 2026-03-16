import { buildRoute } from "@/lib/routes"

function isAbsoluteUrl(path: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(path)
}

export function resolveThemeAssetPath(path: string): string {
  if (isAbsoluteUrl(path)) return path
  return buildRoute(path)
}

export function withDarkVariant(path: string): string {
  if (isAbsoluteUrl(path)) return path

  const [pathname, suffix = ""] = path.split(/(?=[?#])/)
  const lastSlashIndex = pathname.lastIndexOf("/")
  const fileName = lastSlashIndex >= 0 ? pathname.slice(lastSlashIndex + 1) : pathname
  const dirName = lastSlashIndex >= 0 ? pathname.slice(0, lastSlashIndex + 1) : ""
  const dotIndex = fileName.lastIndexOf(".")
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
  const ext = dotIndex > 0 ? fileName.slice(dotIndex) : ""

  if (baseName.endsWith("-dark")) return path

  return `${dirName}${baseName}-dark${ext}${suffix}`
}

export function themedPath(path: string, options?: { dark?: boolean }): string {
  const themed = options?.dark ? withDarkVariant(path) : path
  return resolveThemeAssetPath(themed)
}
