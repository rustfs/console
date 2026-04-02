import test from "node:test"
import assert from "node:assert/strict"
import { normalizeBucketCorsConfig, stringifyBucketCorsConfig, validateBucketCorsJson } from "../../lib/bucket-cors"

test("normalizeBucketCorsConfig accepts an object with CORSRules", () => {
  const config = normalizeBucketCorsConfig({
    CORSRules: [
      {
        AllowedOrigins: ["https://example.com"],
        AllowedMethods: ["GET", "PUT"],
        MaxAgeSeconds: 3600,
      },
    ],
  })

  assert.deepEqual(config, {
    CORSRules: [
      {
        AllowedOrigins: ["https://example.com"],
        AllowedMethods: ["GET", "PUT"],
        MaxAgeSeconds: 3600,
      },
    ],
  })
})

test("validateBucketCorsJson accepts a plain array of rules", () => {
  const result = validateBucketCorsJson(
    JSON.stringify([
      {
        AllowedOrigins: ["*"],
        AllowedMethods: ["GET"],
      },
    ]),
  )

  assert.equal(result.error, null)
  assert.deepEqual(result.config, {
    CORSRules: [
      {
        AllowedOrigins: ["*"],
        AllowedMethods: ["GET"],
      },
    ],
  })
})

test("validateBucketCorsJson rejects invalid methods", () => {
  const result = validateBucketCorsJson(
    JSON.stringify({
      CORSRules: [
        {
          AllowedOrigins: ["https://example.com"],
          AllowedMethods: ["PATCH"],
        },
      ],
    }),
  )

  assert.equal(result.config, null)
  assert.match(result.error ?? "", /invalid method "PATCH"/)
})

test("stringifyBucketCorsConfig returns formatted json", () => {
  const text = stringifyBucketCorsConfig({
    CORSRules: [
      {
        AllowedOrigins: ["https://example.com"],
        AllowedMethods: ["GET"],
      },
    ],
  })

  assert.match(text, /"CORSRules"/)
  assert.match(text, /"AllowedOrigins"/)
})
