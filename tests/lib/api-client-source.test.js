import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("ApiClient exposes URL resolution against its configured base URL", () => {
  const source = fs.readFileSync("lib/api-client.ts", "utf8")

  assert.match(source, /resolveUrl\(url: string\): string/)
  assert.match(source, /new URL\(url, this\.config\?\.baseUrl\)\.toString\(\)/)
})

test("ApiClient scopes GET deduplication to one authenticated client instance", () => {
  const source = fs.readFileSync("lib/api-client.ts", "utf8")

  assert.match(source, /private inflightGetRequests = new Map/)
  assert.match(source, /this\.inflightGetRequests\.get/)
  assert.doesNotMatch(source, /^const inflightGetRequests/m)
  assert.match(source, /signal\?: AbortSignal/)
  assert.match(source, /error\.status = response\.status/)
})

test("object bulk download resolves relative download URLs through the API client", () => {
  const source = fs.readFileSync("components/object/list.tsx", "utf8")

  assert.match(source, /normalizeObjectZipDownloadUrl\(response\.download_url, api\.resolveUrl\("\/"\)\)/)
  assert.doesNotMatch(source, /normalizeObjectZipDownloadUrl\(response\.download_url, window\.location\.origin\)/)
})

test("ApiClient redacts credential fields before development logging", () => {
  const source = fs.readFileSync("lib/api-client.ts", "utf8")

  assert.match(source, /SENSITIVE_LOG_KEY/)
  assert.match(source, /master\[_-\]\?key/)
  assert.match(source, /redactRequestOptionsForLog\(options\)/)
  assert.match(source, /JSON\.stringify\(redactLogValue\(JSON\.parse\(options\.body\)\)\)/)
})
