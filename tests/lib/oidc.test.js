import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("lib/oidc.ts", "utf8")

test("OIDC login URL construction stays isolated from browser navigation", () => {
  assert.match(
    source,
    /export function buildOidcLoginUrl\(serverHost: string, providerId: string, redirectAfter\?: string\): string/,
  )
  assert.match(source, /encodeURIComponent\(providerId\)/)
  assert.match(source, /redirect_after=\$\{encodeURIComponent\(redirectAfter\)\}/)
})

test("initiateOidcLogin normalizes the destination before assigning location.href", () => {
  assert.match(source, /const url = buildOidcLoginUrl\(serverHost, providerId, redirectAfter\)/)
  assert.match(source, /window\.location\.href = new URL\(url, window\.location\.origin\)\.href/)
})
