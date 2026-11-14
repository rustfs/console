import test from "node:test"
import assert from "node:assert/strict"
import { isSameSession, isValidCredentials } from "../../lib/auth-session"

const now = Date.parse("2026-11-14T00:00:00Z")
const credentials = {
  AccessKeyId: "test-access",
  SecretAccessKey: "test-secret",
  SessionToken: "test-token",
  Expiration: new Date(now + 60_000).toISOString(),
}

test("complete unexpired STS credentials are authenticated", () => {
  assert.equal(isValidCredentials(credentials, now), true)
})

for (const Expiration of [new Date(now).toISOString(), new Date(now - 1).toISOString(), "invalid-date", ""]) {
  test(`credentials with expiration ${Expiration || "missing"} are not authenticated`, () => {
    assert.equal(isValidCredentials({ ...credentials, Expiration }, now), false)
  })
}

for (const field of ["AccessKeyId", "SecretAccessKey", "SessionToken", "Expiration"] as const) {
  test(`credentials without ${field} are not authenticated`, () => {
    assert.equal(isValidCredentials({ ...credentials, [field]: undefined }, now), false)
  })
  test(`a replacement ${field} does not belong to an old request's session`, () => {
    assert.equal(isSameSession({ ...credentials, [field]: "replacement" }, credentials), false)
  })
}

test("a removed session does not belong to an old request", () => {
  assert.equal(isSameSession(undefined, credentials), false)
})
