import test from "node:test"
import assert from "node:assert/strict"

import {
  buildRekeyStartRequest,
  isRekeyAlreadyRunningError,
  isRekeyNeverRanError,
  isRekeyUnsupportedError,
} from "../../lib/sse/rekey"

function httpError(status: number, message: string): Error {
  const error = new Error(message) as Error & { status: number }
  error.status = status
  return error
}

test("never-ran 404 with the server's empty-state body is a normal empty state", () => {
  assert.equal(isRekeyNeverRanError(httpError(404, '{"error":"no rekey sweep has run"}')), true)
})

test("a 404 without the empty-state body means the feature is unavailable, not empty", () => {
  assert.equal(isRekeyNeverRanError(httpError(404, "Not Found")), false)
})

test("non-404 statuses and non-Error values are never treated as the empty state", () => {
  assert.equal(isRekeyNeverRanError(httpError(500, "no rekey sweep has run")), false)
  assert.equal(isRekeyNeverRanError("no rekey sweep has run"), false)
  assert.equal(isRekeyNeverRanError(null), false)
})

test("409 maps to already-running and 501 maps to unsupported, exclusively", () => {
  const conflict = httpError(409, '{"error":"a rekey sweep is already running","job_id":"abc"}')
  const unsupported = httpError(501, "the configured KMS backend does not support rewrapping data-key envelopes")
  assert.equal(isRekeyAlreadyRunningError(conflict), true)
  assert.equal(isRekeyUnsupportedError(conflict), false)
  assert.equal(isRekeyUnsupportedError(unsupported), true)
  assert.equal(isRekeyAlreadyRunningError(unsupported), false)
})

test("blank inputs build an empty request so the server sweeps every bucket", () => {
  assert.deepEqual(buildRekeyStartRequest("", ""), {})
  assert.deepEqual(buildRekeyStartRequest("  ", "  "), {})
})

test("bucket lists split on commas and whitespace and drop empty segments", () => {
  assert.deepEqual(buildRekeyStartRequest("b1, b2  b3,,", ""), { buckets: ["b1", "b2", "b3"] })
})

test("a prefix is trimmed and only included when non-empty", () => {
  assert.deepEqual(buildRekeyStartRequest("b1", " photos/ "), { buckets: ["b1"], prefix: "photos/" })
  assert.deepEqual(buildRekeyStartRequest("", "photos/"), { prefix: "photos/" })
})
