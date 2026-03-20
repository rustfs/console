import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, "..")
const runtimeRoot = path.join(root, ".theme-runtime")
const backupRoot = path.join(runtimeRoot, "backup")
const stateFile = path.join(runtimeRoot, "state.json")
const themesRoot = path.join(root, "themes")

const themeIdRaw = process.env.NEXT_PUBLIC_THEME_ID?.trim() || process.env.THEME_ID?.trim() || "default"
const themeIdPattern = /^[A-Za-z0-9_-]+$/
if (!themeIdPattern.test(themeIdRaw)) {
  throw new Error(`[theme] Invalid theme id "${themeIdRaw}". Only [A-Za-z0-9_-] are allowed.`)
}

const themeId = themeIdRaw
const themeRoot = path.resolve(themesRoot, themeId)
if (!themeRoot.startsWith(`${themesRoot}${path.sep}`) && themeRoot !== themesRoot) {
  throw new Error(`[theme] Invalid theme path: ${themeRoot}`)
}

if (!fs.existsSync(themeRoot)) {
  throw new Error(`[theme] Theme "${themeId}" not found: ${themeRoot}`)
}

const mappings = [
  { from: "components", to: "components" },
  { from: "assets", to: "assets" },
  { from: "locales", to: path.join("public", "themes", themeId, "locales") },
  { from: "public", to: "public" },
  { from: "config", to: "config" },
]

function rmDirRecursive(dir) {
  if (!fs.existsSync(dir)) return
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const current = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      rmDirRecursive(current)
    } else {
      fs.unlinkSync(current)
    }
  }
  fs.rmdirSync(dir)
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function readState() {
  if (!fs.existsSync(stateFile)) return []
  try {
    const data = JSON.parse(fs.readFileSync(stateFile, "utf8"))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeState(entries) {
  fs.mkdirSync(runtimeRoot, { recursive: true })
  fs.writeFileSync(stateFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8")
}

function restorePreviousOverrides() {
  const entries = readState()
  for (const entry of entries) {
    if (!entry || typeof entry.path !== "string") continue

    const targetPath = path.join(root, entry.path)
    const backupPath = path.join(backupRoot, entry.path)

    if (entry.existed) {
      if (fs.existsSync(backupPath)) {
        ensureParentDir(targetPath)
        fs.copyFileSync(backupPath, targetPath)
      }
    } else if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath)
    }
  }

  if (fs.existsSync(backupRoot)) {
    rmDirRecursive(backupRoot)
  }
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile)
  }
}

const backedUp = new Map()
const stateEntries = []

function backupBeforeWrite(targetPath) {
  const relativePath = path.relative(root, targetPath)
  if (backedUp.has(relativePath)) return

  const existed = fs.existsSync(targetPath)
  stateEntries.push({ path: relativePath, existed })
  backedUp.set(relativePath, true)
  writeState(stateEntries)

  if (!existed) return

  const backupPath = path.join(backupRoot, relativePath)
  ensureParentDir(backupPath)
  fs.copyFileSync(targetPath, backupPath)
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return

  const entries = fs.readdirSync(src, { withFileTypes: true })
  fs.mkdirSync(dest, { recursive: true })

  for (const entry of entries) {
    if (entry.name === ".gitkeep") continue

    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(from, to)
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(to), { recursive: true })
      backupBeforeWrite(to)
      fs.copyFileSync(from, to)
    }
  }
}

function listLocaleFiles(src, base = src) {
  if (!fs.existsSync(src)) return []

  const files = []
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === ".gitkeep") continue
    const full = path.join(src, entry.name)
    if (entry.isDirectory()) {
      files.push(...listLocaleFiles(full, base))
      continue
    }
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue
    files.push(path.relative(base, full))
  }

  return files
}

restorePreviousOverrides()
writeState([])

for (const mapping of mappings) {
  copyDirRecursive(path.join(themeRoot, mapping.from), path.join(root, mapping.to))
}

const themeLogoPath = path.join(root, "assets", "logo.svg")
const themeDarkLogoPath = path.join(root, "assets", "logo-dark.svg")
if (fs.existsSync(themeLogoPath) && !fs.existsSync(themeDarkLogoPath)) {
  backupBeforeWrite(themeDarkLogoPath)
  ensureParentDir(themeDarkLogoPath)
  fs.copyFileSync(themeLogoPath, themeDarkLogoPath)
}

const themeLocaleRoot = path.join(themeRoot, "locales")
const localeFiles = listLocaleFiles(themeLocaleRoot)
const localeIndex = localeFiles.map((file) => file.replace(/\.json$/, ""))
const localeIndexTargetPath = path.join(root, "public", "themes", themeId, "locales", "index.json")
backupBeforeWrite(localeIndexTargetPath)
ensureParentDir(localeIndexTargetPath)
fs.writeFileSync(localeIndexTargetPath, `${JSON.stringify(localeIndex, null, 2)}\n`, "utf8")

const themeManifestPath = path.join(themeRoot, "manifest.json")
const activeManifestPath = path.join(root, "themes", ".active", "manifest.json")
if (!fs.existsSync(themeManifestPath)) {
  throw new Error(`[theme] Missing manifest.json in theme: ${themeRoot}`)
}
ensureParentDir(activeManifestPath)
fs.copyFileSync(themeManifestPath, activeManifestPath)

writeState(stateEntries)

console.log(`[theme] Applied theme "${themeId}" overrides.`)
