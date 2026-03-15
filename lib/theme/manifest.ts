import type { ThemeManifest } from "@/types/theme"
import currentThemeManifestJson from "@/config/theme-manifest.json"

const THEME_SCHEMA_VERSION = 1
const DEFAULT_THEME_ID = "default"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function normalizeThemeManifest(input: unknown): ThemeManifest {
  if (!isRecord(input)) {
    throw new Error("Invalid theme manifest: root must be an object.")
  }

  const schemaVersion = Number(input.schemaVersion)
  if (!Number.isInteger(schemaVersion) || schemaVersion !== THEME_SCHEMA_VERSION) {
    throw new Error(
      `Invalid theme manifest schemaVersion: expected ${THEME_SCHEMA_VERSION}, received ${String(input.schemaVersion)}`,
    )
  }

  const id = asString(input.id) ?? DEFAULT_THEME_ID
  const name = asString(input.name) ?? id

  const brand = isRecord(input.brand) ? input.brand : {}
  const assets = isRecord(input.assets) ? input.assets : {}
  const links = isRecord(input.links) ? input.links : {}

  return {
    schemaVersion,
    id,
    name,
    brand: {
      name: asString(brand.name) ?? "RustFS",
      shortName: asString(brand.shortName),
      description: asString(brand.description),
    },
    assets: {
      logo: asString(assets.logo) ?? "/logo.svg",
      logoCompact: asString(assets.logoCompact),
      userAvatar: asString(assets.userAvatar),
    },
    links: {
      website: asString(links.website),
      documentation: asString(links.documentation),
      github: asString(links.github),
      x: asString(links.x),
    },
  }
}

const activeThemeManifest = normalizeThemeManifest(currentThemeManifestJson)

export function getThemeManifest(): ThemeManifest {
  return activeThemeManifest
}

export function getThemeId(): string {
  return activeThemeManifest.id
}

export function getThemeBrandName(): string {
  return activeThemeManifest.brand.name
}

export function getThemeShortName(): string {
  return activeThemeManifest.brand.shortName ?? activeThemeManifest.brand.name
}
