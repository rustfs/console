import assert from "node:assert/strict"
import test from "node:test"
import { isSecretKeyValid } from "../../lib/secret-key"

test("secret keys require at least eight UTF-8 bytes", () => {
  for (const secret of ["", "1234567", "ééé"]) {
    assert.equal(isSecretKeyValid(secret), false)
  }
  for (const secret of ["12345678", "éééé", "🔑🔑"]) {
    assert.equal(isSecretKeyValid(secret), true)
  }
})

test("custom secret keys have no 40 or 256 byte business limit", () => {
  for (const length of [40, 41, 90, 128, 256, 257, 4096]) {
    assert.equal(isSecretKeyValid("s".repeat(length)), true, `${length}-byte secret`)
  }
})

test("length validation preserves whitespace and Unicode without normalization", () => {
  for (const secret of [" 123456 ", "éééé", "e\u0301e\u0301e\u0301"]) {
    assert.equal(isSecretKeyValid(secret), true)
  }
})
