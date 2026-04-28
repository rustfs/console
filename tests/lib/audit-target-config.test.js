import assert from "node:assert/strict"
import test from "node:test"

import {
  AUDIT_TARGET_CONFIG_OPTIONS,
  AUDIT_TARGET_TYPE_MAPPING,
  AUDIT_TARGET_TYPE_OPTIONS,
} from "../../lib/audit-target-config.js"

test("audit target config exposes fields matching backend audit contracts", () => {
  assert.deepEqual(
    AUDIT_TARGET_CONFIG_OPTIONS.Kafka.map((field) => field.name),
    [
      "brokers",
      "topic",
      "acks",
      "tls_enable",
      "tls_ca",
      "tls_client_cert",
      "tls_client_key",
      "queue_dir",
      "queue_limit",
      "comment",
    ],
  )
  assert.deepEqual(
    AUDIT_TARGET_CONFIG_OPTIONS.Webhook.map((field) => field.name),
    [
      "endpoint",
      "auth_token",
      "queue_limit",
      "queue_dir",
      "client_cert",
      "client_key",
      "client_ca",
      "skip_tls_verify",
      "comment",
    ],
  )
})

test("audit target type metadata maps console types to audit subsystems", () => {
  const kafkaOption = AUDIT_TARGET_TYPE_OPTIONS.find((option) => option.value === "Kafka")

  assert.ok(kafkaOption)
  assert.equal(kafkaOption.icon, "/svg/kafka.svg")
  assert.equal(AUDIT_TARGET_TYPE_MAPPING.Kafka, "audit_kafka")
  assert.equal(AUDIT_TARGET_TYPE_MAPPING.MQTT, "audit_mqtt")
  assert.equal(AUDIT_TARGET_TYPE_MAPPING.Webhook, "audit_webhook")
  assert.equal(AUDIT_TARGET_TYPE_MAPPING.NATS, "audit_nats")
  assert.equal(AUDIT_TARGET_TYPE_MAPPING.Pulsar, "audit_pulsar")
})
