import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const localeDir = path.resolve("i18n/locales")
const sourceRoots = ["app", "components", "contexts", "hooks", "lib", "config"]
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"])

function readLocale(file) {
  return JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8"))
}

function walkSourceFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") walkSourceFiles(filePath, files)
      continue
    }

    if (sourceExtensions.has(path.extname(entry.name))) files.push(filePath)
  }

  return files
}

function extractLiteralTranslationKeys(source) {
  const keys = new Set()
  const translationCall = /\bt\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g
  let match

  while ((match = translationCall.exec(source))) {
    if (!match[2].includes("${")) {
      keys.add(match[2].replace(/\\'/g, "'").replace(/\\"/g, '"'))
    }
  }

  return keys
}

function extractPlaceholders(value) {
  return [...value.matchAll(/\{[^{}]+\}/g)].map(([placeholder]) => placeholder).sort()
}

test("all locale files provide the same keys as en-US", () => {
  const referenceKeys = Object.keys(readLocale("en-US.json")).sort()
  const localeFiles = fs
    .readdirSync(localeDir)
    .filter((file) => file.endsWith(".json"))
    .sort()

  for (const file of localeFiles) {
    assert.deepEqual(Object.keys(readLocale(file)).sort(), referenceKeys, file)
  }
})

test("en-US contains every literal translation key used by the app", () => {
  const enUS = readLocale("en-US.json")
  const usedKeys = new Set()

  for (const file of sourceRoots.flatMap((root) => walkSourceFiles(root))) {
    for (const key of extractLiteralTranslationKeys(fs.readFileSync(file, "utf8"))) {
      usedKeys.add(key)
    }
  }

  const missing = [...usedKeys].filter((key) => !(key in enUS)).sort()
  assert.deepEqual(missing, [])
})

test("translated locale values preserve interpolation placeholders", () => {
  const enUS = readLocale("en-US.json")
  const localeFiles = fs
    .readdirSync(localeDir)
    .filter((file) => file.endsWith(".json") && file !== "en-US.json")
    .sort()

  for (const file of localeFiles) {
    const locale = readLocale(file)

    for (const [key, value] of Object.entries(enUS)) {
      assert.deepEqual(extractPlaceholders(locale[key]), extractPlaceholders(value), `${file}: ${key}`)
    }
  }
})
