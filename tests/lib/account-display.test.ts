import test from "node:test"
import assert from "node:assert/strict"
import { resolveAccountDisplayName } from "../../lib/account-display"

test("account display name prefers the configured OIDC username", () => {
  assert.equal(
    resolveAccountDisplayName({
      access_key: "virtual-parent",
      username: "j.bruijns@pay.nl",
      email: "fallback@pay.nl",
    }),
    "j.bruijns@pay.nl",
  )
})

test("account display name falls back to email when username is absent or blank", () => {
  assert.equal(
    resolveAccountDisplayName({ access_key: "virtual-parent", username: "   ", email: "fallback@pay.nl" }),
    "fallback@pay.nl",
  )
})

test("account display name remains compatible with responses that only contain access_key", () => {
  assert.equal(resolveAccountDisplayName({ access_key: "legacy-account" }), "legacy-account")
})
