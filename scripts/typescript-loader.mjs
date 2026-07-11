import { access } from "node:fs/promises"
import { extname } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = new URL("../", import.meta.url)
const extensions = [".ts", ".tsx", ".js", ".mjs"]

async function resolveExistingModule(baseUrl, context, nextResolve) {
  for (const extension of extensions) {
    const candidate = new URL(`${baseUrl.href}${extension}`)
    try {
      await access(fileURLToPath(candidate))
      return nextResolve(candidate.href, context)
    } catch {
      // Try the next supported source extension.
    }
  }
  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = await resolveExistingModule(new URL(specifier.slice(2), projectRoot), context, nextResolve)
    if (resolved) return resolved
  }

  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    const baseUrl = new URL(specifier, context.parentURL)
    if (!extname(baseUrl.pathname)) {
      const resolved = await resolveExistingModule(baseUrl, context, nextResolve)
      if (resolved) return resolved
    }
  }

  return nextResolve(specifier, context)
}
