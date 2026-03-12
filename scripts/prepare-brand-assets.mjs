import fs from "node:fs"
import path from "node:path"

const rootDir = process.cwd()
const brandId = process.env.NEXT_PUBLIC_BRAND_ID || "default"
const sourceDir = path.join(rootDir, "public", "branding", brandId)
const appDir = path.join(rootDir, "app")

const requiredFiles = [
  "favicon.ico",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
  "site.webmanifest",
]

function main() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`[prepare-brand-assets] brand directory not found: ${sourceDir}`)
  }

  for (const fileName of requiredFiles) {
    const sourcePath = path.join(sourceDir, fileName)
    const targetPath = path.join(appDir, fileName)

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`[prepare-brand-assets] missing required asset: ${sourcePath}`)
    }

    fs.copyFileSync(sourcePath, targetPath)
  }

  console.log(`[prepare-brand-assets] prepared brand assets from ${sourceDir}`)
}

main()

