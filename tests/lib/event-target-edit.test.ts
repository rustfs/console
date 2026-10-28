import assert from "node:assert/strict"
import test from "node:test"
import { buildEventTargetInstanceUrl, editableEventTarget } from "../../lib/event-target-api"

test("instance URL retains the proxy prefix and canonical target identity", () => {
  assert.equal(
    buildEventTargetInstanceUrl("https://console.test/prefix/rustfs/admin/v3", "nats", "Primary"),
    "https://console.test/prefix/rustfs/admin/v4/plugins/instances/builtin:nats:notify:primary",
  )
  assert.throws(() => buildEventTargetInstanceUrl("https://console.test/custom", "nats", "primary"))
})

test("only enabled persisted configuration for the requested target is editable", () => {
  const instance = { service: "nats", account_id: "Primary", source: "config", enabled: true }
  assert.equal(editableEventTarget(instance, "nats", "primary"), true)
  assert.equal(editableEventTarget({ ...instance, source: "env" }, "nats", "primary"), false)
  assert.equal(editableEventTarget({ ...instance, source: "mixed" }, "nats", "primary"), false)
  assert.equal(editableEventTarget({ ...instance, enabled: false }, "nats", "primary"), false)
  assert.equal(editableEventTarget(instance, "webhook", "primary"), false)
  assert.equal(editableEventTarget(instance, "nats", "other"), false)
})

test("flattened plugin detail preserves complete configuration and the original snapshot", async () => {
  const { parseEditableEventTarget, buildEventTargetUpdatePayload } = await import("../../lib/event-target-api")
  const original = {
    enable: "on",
    address: "nats://host:4222",
    password: "***redacted***",
    jetstream_enable: "on",
    comment: "",
  }
  const snapshot = parseEditableEventTarget(
    {
      service: "nats",
      account_id: "primary",
      source: "config",
      enabled: true,
      config: original,
      config_revision: "opaque-revision",
      diagnostics: [],
    },
    "nats",
    "primary",
  )
  const payload = buildEventTargetUpdatePayload(
    { ...snapshot.config, address: "nats://new:4222" },
    snapshot.config,
    snapshot.revision,
  )
  assert.deepEqual(payload.expected_config, original)
  assert.equal(payload.expected_revision, "opaque-revision")
  assert.deepEqual(Object.fromEntries(payload.key_values.map(({ key, value }) => [key, value])), {
    ...original,
    address: "nats://new:4222",
  })
  assert.throws(() => parseEditableEventTarget({ instance: { config: original } }, "nats", "primary"))
})

test("editing and clearing a secret retain the original snapshot and revision", async () => {
  const { buildEventTargetUpdatePayload } = await import("../../lib/event-target-api")
  const original = { password: "***redacted***", token: "", enable: "on" }
  for (const password of ["***redacted***", "replacement", ""]) {
    const payload = buildEventTargetUpdatePayload({ ...original, password }, original, "opaque-revision")
    assert.equal(payload.key_values.find((entry) => entry.key === "password")?.value, password)
    assert.deepEqual(payload.expected_config, original)
    assert.equal(payload.expected_revision, "opaque-revision")
  }
})

test("missing or empty revision rejects editing and prevents an unsafe update", async () => {
  const { parseEditableEventTarget, buildEventTargetUpdatePayload, EventTargetRevisionUnavailableError } =
    await import("../../lib/event-target-api")
  const instance = { service: "nats", account_id: "primary", source: "config", enabled: true, config: {} }
  for (const config_revision of [undefined, "", "   ", 123]) {
    assert.throws(
      () => parseEditableEventTarget({ ...instance, config_revision }, "nats", "primary"),
      EventTargetRevisionUnavailableError,
    )
  }
  assert.throws(() => buildEventTargetUpdatePayload({}, {}, ""), EventTargetRevisionUnavailableError)
})

test("supported destination secrets use masked inputs", async () => {
  const { EVENT_TARGET_CONFIG_OPTIONS } = await import("../../lib/events-target-config")
  for (const [service, names] of Object.entries({
    Kafka: ["sasl_password", "tls_client_cert", "tls_client_key"],
    MQTT: ["password", "tls_client_cert", "tls_client_key"],
    Webhook: ["auth_token", "client_cert", "client_key"],
    NATS: ["password", "token", "credentials_file", "tls_client_cert", "tls_client_key"],
    Pulsar: ["password", "auth_token"],
  })) {
    const fields = EVENT_TARGET_CONFIG_OPTIONS[service as keyof typeof EVENT_TARGET_CONFIG_OPTIONS]
    for (const name of names) assert.equal(fields.find((field) => field.name === name)?.type, "password")
  }
})
