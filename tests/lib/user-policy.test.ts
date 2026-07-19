import test from "node:test"
import assert from "node:assert/strict"
import { normalizePolicyStatements } from "../../lib/user-policy"

const policyStatement = {
  Effect: "Allow",
  Action: ["s3:GetObject"],
  Resource: ["arn:aws:s3:::example/*"],
}

test("normalizePolicyStatements accepts policy objects returned by the admin API", () => {
  assert.deepEqual(
    normalizePolicyStatements("readonly", {
      Version: "2012-10-17",
      Statement: [policyStatement],
    }),
    [{ ...policyStatement, Sid: "readonly" }],
  )
})

test("normalizePolicyStatements supports legacy string policy responses", () => {
  assert.deepEqual(
    normalizePolicyStatements(
      "readonly",
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [{ ...policyStatement, Sid: "existing" }],
      }),
    ),
    [{ ...policyStatement, Sid: "existing" }],
  )
})

test("normalizePolicyStatements rejects invalid policy response shapes", () => {
  assert.throws(() => normalizePolicyStatements("readonly", []), /valid JSON object/)
  assert.throws(() => normalizePolicyStatements("readonly", { Statement: {} }), /Statement must be an array/)
})
