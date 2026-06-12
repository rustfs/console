import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("ApiClient exposes URL resolution against its configured base URL", () => {
  const source = fs.readFileSync("lib/api-client.ts", "utf8")

  assert.match(source, /resolveUrl\(url: string\): string/)
  assert.match(source, /new URL\(url, this\.config\?\.baseUrl\)\.toString\(\)/)
})

test("object bulk download resolves relative download URLs through the API client", () => {
  const source = fs.readFileSync("components/object/list.tsx", "utf8")

  assert.match(source, /normalizeObjectZipDownloadUrl\(response\.download_url, api\.resolveUrl\("\/"\)\)/)
  assert.doesNotMatch(source, /normalizeObjectZipDownloadUrl\(response\.download_url, window\.location\.origin\)/)
})
