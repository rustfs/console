import fs from "node:fs"
import path from "node:path"

const OUT_DIR = path.resolve(process.cwd(), "out")
const basePathRaw = process.env.NEXT_PUBLIC_BASE_PATH ?? "/rustfs/console"

function normalizeBasePath(input) {
  const value = String(input || "").trim()
  if (!value || value === "/") return ""
  return value.replace(/^\/+/, "").replace(/\/+$/, "")
}

function main() {
  const basePath = normalizeBasePath(basePathRaw)
  if (!basePath) {
    console.log("[prepare-static-basepath] skipped: empty basePath")
    return
  }

  if (!fs.existsSync(OUT_DIR)) {
    console.log("[prepare-static-basepath] skipped: out directory not found")
    return
  }

  const targetDir = path.join(OUT_DIR, basePath)
  const firstSegment = basePath.split("/")[0]

  fs.rmSync(targetDir, { recursive: true, force: true })
  fs.mkdirSync(targetDir, { recursive: true })

  for (const entry of fs.readdirSync(OUT_DIR)) {
    if (entry === firstSegment) continue
    fs.cpSync(path.join(OUT_DIR, entry), path.join(targetDir, entry), {
      recursive: true,
      force: true,
      errorOnExist: false,
    })
  }

  console.log(`[prepare-static-basepath] prepared ${targetDir}`)
}

main()
