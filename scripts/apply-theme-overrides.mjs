import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, "..")
const runtimeRoot = path.join(root, ".theme-runtime")
const backupRoot = path.join(runtimeRoot, "backup")
const stateFile = path.join(runtimeRoot, "state.json")

const themeId = process.env.NEXT_PUBLIC_THEME_ID?.trim() || process.env.THEME_ID?.trim() || "default"
const themeRoot = path.join(root, "themes", themeId)

if (!fs.existsSync(themeRoot)) {
  throw new Error(`[theme] Theme "${themeId}" not found: ${themeRoot}`)
}

const mappings = [
  { from: "components", to: "components" },
  { from: "assets", to: "assets" },
  { from: "locales", to: path.join("public", "themes", themeId, "locales") },
  { from: "public", to: "public" },
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

restorePreviousOverrides()

for (const mapping of mappings) {
  copyDirRecursive(path.join(themeRoot, mapping.from), path.join(root, mapping.to))
}

const themeManifestPath = path.join(themeRoot, "manifest.json")
const targetManifestPath = path.join(root, "config", "theme-manifest.json")

if (fs.existsSync(themeManifestPath)) {
  backupBeforeWrite(targetManifestPath)
  ensureParentDir(targetManifestPath)
  fs.copyFileSync(themeManifestPath, targetManifestPath)
}

writeState(stateEntries)

console.log(`[theme] Applied theme "${themeId}" overrides.`)
