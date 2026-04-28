import assert from "node:assert/strict"
import test from "node:test"

const loadEventTargetConfig = () => import(new URL("../../lib/events-target-config.ts", import.meta.url).href)

test("event target config exposes kafka fields matching backend notify_kafka contract", async () => {
  const { EVENT_TARGET_CONFIG_OPTIONS } =
    (await loadEventTargetConfig()) as typeof import("../../lib/events-target-config")
  const kafkaFields = EVENT_TARGET_CONFIG_OPTIONS.Kafka.map((field) => field.name)

  assert.deepEqual(kafkaFields, [
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
  ])
})

test("event target type metadata maps kafka to notify_kafka with svg icon", async () => {
  const { EVENT_TARGET_TYPE_MAPPING, EVENT_TARGET_TYPE_OPTIONS } =
    (await loadEventTargetConfig()) as typeof import("../../lib/events-target-config")
  const kafkaOption = EVENT_TARGET_TYPE_OPTIONS.find((option) => option.value === "Kafka")

  assert.ok(kafkaOption)
  assert.equal(kafkaOption.icon, "/svg/kafka.svg")
  assert.equal(EVENT_TARGET_TYPE_MAPPING.Kafka, "notify_kafka")
})
