import test from "node:test"
import assert from "node:assert/strict"
import {
  ERR_MFA_REQUIRED,
  formatManualSetupKey,
  formatRecoveryCodesForExport,
  isMfaRequiredError,
  isSubmittableCode,
  looksLikeRecoveryCode,
  looksLikeTotpCode,
  normalizeCode,
  qrSvgToDataUri,
  recoveryCodesRunningLow,
} from "../../lib/mfa"

test("a six-digit code is recognised as a TOTP code", () => {
  assert.equal(looksLikeTotpCode("123456"), true)
  assert.equal(looksLikeTotpCode("000000"), true)
  // Users paste codes with the spacing their authenticator shows.
  assert.equal(looksLikeTotpCode("123 456"), true)
})

test("codes of the wrong length or alphabet are not TOTP codes", () => {
  for (const input of ["", "12345", "1234567", "12345a", "abcdef"]) {
    assert.equal(looksLikeTotpCode(input), false, input)
  }
})

test("a five-group code is recognised as a recovery code", () => {
  assert.equal(looksLikeRecoveryCode("ABCD-EFGH-JKMN-PQRS-TVWX"), true)
  assert.equal(looksLikeRecoveryCode("abcd-efgh-jkmn-pqrs-tvwx"), true)
  assert.equal(looksLikeRecoveryCode("ABCDEFGHJKMNPQRSTVWX"), true)
})

test("recovery codes reject the characters the server's alphabet excludes", () => {
  // I, L, O and U are absent from the server alphabet so a handwritten code
  // cannot be ambiguous. A string using them is not a code this server issued.
  assert.equal(looksLikeRecoveryCode("IIII-LLLL-OOOO-UUUU-IIII"), false)
})

test("the two code shapes never overlap", () => {
  // Overlap would make routing ambiguous: the login form has to decide which
  // input the user filled without asking them.
  assert.equal(looksLikeRecoveryCode("123456"), false)
  assert.equal(looksLikeTotpCode("ABCD-EFGH-JKMN-PQRS-TVWX"), false)
})

test("only recognisable shapes are submittable", () => {
  assert.equal(isSubmittableCode("123456"), true)
  assert.equal(isSubmittableCode("ABCD-EFGH-JKMN-PQRS-TVWX"), true)
  assert.equal(isSubmittableCode("12"), false)
  assert.equal(isSubmittableCode(""), false)
})

test("normalisation strips only formatting", () => {
  assert.equal(normalizeCode(" abcd-efgh "), "ABCDEFGH")
  assert.equal(normalizeCode("123 456"), "123456")
})

test("a demand for a second factor is told apart from a rejected password", () => {
  // The whole login branch depends on this: reporting "login failed" here would
  // send the user to reset a password that is working.
  assert.equal(isMfaRequiredError(new Error(`${ERR_MFA_REQUIRED}: a second factor is required`)), true)
  assert.equal(isMfaRequiredError({ name: ERR_MFA_REQUIRED }), true)
  assert.equal(isMfaRequiredError({ Code: ERR_MFA_REQUIRED }), true)
  // The SDK wraps a service error inside a client error.
  assert.equal(isMfaRequiredError({ message: "failed", cause: { Code: ERR_MFA_REQUIRED } }), true)
  assert.equal(isMfaRequiredError({ message: "failed", error: { message: ERR_MFA_REQUIRED } }), true)
})

test("ordinary failures are not treated as a second-factor demand", () => {
  assert.equal(isMfaRequiredError(new Error("InvalidAccessKeyId")), false)
  assert.equal(isMfaRequiredError("AccessDenied"), false)
  assert.equal(isMfaRequiredError(null), false)
  assert.equal(isMfaRequiredError(undefined), false)
  assert.equal(isMfaRequiredError({}), false)
})

test("error inspection does not recurse into a cycle", () => {
  // Error objects routinely reference the request that produced them, which can
  // reference the error back.
  const error: Record<string, unknown> = { message: "boom" }
  error.cause = error
  assert.equal(isMfaRequiredError(error), false)
})

test("the QR is exposed as an image source, never as markup", () => {
  // Routing it through a data URI keeps a server-rendered SVG from ever
  // becoming a same-origin script sink.
  const uri = qrSvgToDataUri('<svg xmlns="http://www.w3.org/2000/svg"></svg>')

  assert.ok(uri.startsWith("data:image/svg+xml;charset=utf-8,"))
  assert.ok(!uri.includes("<svg"))
})

test("the QR data URI survives non-Latin-1 payloads", () => {
  // btoa would throw here; encodeURIComponent is why it does not.
  assert.doesNotThrow(() => qrSvgToDataUri("<svg>—çğ日本</svg>"))
})

test("the manual setup key is grouped for transcription", () => {
  assert.equal(formatManualSetupKey("JBSWY3DPEHPK3PXP"), "JBSW Y3DP EHPK 3PXP")
  assert.equal(formatManualSetupKey(""), "")
})

test("exported recovery codes are one per line and newline-terminated", () => {
  assert.equal(formatRecoveryCodesForExport(["AAAA", "BBBB"]), "AAAA\nBBBB\n")
})

test("running low is a warning, not an error state", () => {
  assert.equal(recoveryCodesRunningLow(3), true)
  assert.equal(recoveryCodesRunningLow(1), true)
  // Zero is its own, louder state; it must not be folded into "running low".
  assert.equal(recoveryCodesRunningLow(0), false)
  assert.equal(recoveryCodesRunningLow(10), false)
})
