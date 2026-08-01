import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync("contexts/auth-context.tsx", "utf8")

test("OIDC federated logout builds its destination before clearing auth state", () => {
  assert.match(
    source,
    /const logoutUrl = buildOidcLogoutUrl\(config\.serverHost, oidcSession\.logoutToken\)\s*\n\s*logout\(\)\s*\n\s*window\.location\.href = logoutUrl/,
  )
})

test("OIDC federated logout does not clear auth state before awaiting config", () => {
  assert.doesNotMatch(source, /logout\(\)\s*\n\s*if \(!oidcSession\) return false/)
})
