import assert from "node:assert/strict"
import test from "node:test"
import { redactRequestOptionsForLog } from "../../lib/api-request-log"

test("target configuration payloads never log field values, including unknown future secrets", () => {
  const config = {
    key_values: [
      { key: "password", value: "my-password" },
      { key: "token", value: "my-token" },
      { key: "credentials_file", value: "/secret/credentials" },
      { key: "tls_client_key", value: "/secret/client-key" },
      { key: "future_field", value: "unknown-secret" },
    ],
    expected_config: { tls_client_key: "/other-secret", future_field: "snapshot-secret" },
    expected_revision: "opaque-revision",
    operation: "update",
  }
  for (const body of [config, JSON.stringify(config), { nested: config }]) {
    const result = JSON.stringify(redactRequestOptionsForLog({ body }))
    assert.doesNotMatch(
      result,
      /my-password|my-token|\/secret\/|unknown-secret|\/other-secret|snapshot-secret|opaque-revision/,
    )
    assert.match(result, /REDACTED/)
    assert.match(result, /update/)
  }
})
