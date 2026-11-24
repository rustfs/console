import test from "node:test"
import assert from "node:assert/strict"
import { resolveAccountAvatarUrl, resolveAccountDisplayName, resolveAccountMenuName } from "../../lib/account-display"

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

test("account menu name prefers the OIDC full name", () => {
  assert.equal(
    resolveAccountMenuName({ access_key: "virtual-parent", username: "jdoe", display_name: " Jane Doe " }),
    "Jane Doe",
  )
})

test("account menu name falls back to the username chain when the full name is blank", () => {
  assert.equal(resolveAccountMenuName({ access_key: "virtual-parent", username: "jdoe", display_name: "  " }), "jdoe")
  assert.equal(resolveAccountMenuName({ access_key: "legacy-account" }), "legacy-account")
})

test("account avatar accepts only absolute https picture URLs", () => {
  assert.equal(
    resolveAccountAvatarUrl({ access_key: "a", picture: "https://idp.example.test/a.png" }),
    "https://idp.example.test/a.png",
  )
  for (const picture of [
    undefined,
    "",
    "http://idp.example.test/a.png",
    "javascript:alert(1)",
    "/img/a.png",
    "not a url",
  ]) {
    assert.equal(resolveAccountAvatarUrl({ access_key: "a", picture }), undefined, String(picture))
  }
})
