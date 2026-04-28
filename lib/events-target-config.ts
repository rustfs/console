export type EventTargetType = "Kafka" | "MQTT" | "Webhook" | "NATS" | "Pulsar"

export type EventTargetConfigField = {
  label: string
  name: string
  type: "text" | "password" | "number"
}

export const EVENT_TARGET_CONFIG_OPTIONS: Record<EventTargetType, EventTargetConfigField[]> = {
  Kafka: [
    { label: "KAFKA_BROKERS", name: "brokers", type: "text" },
    { label: "KAFKA_TOPIC", name: "topic", type: "text" },
    { label: "KAFKA_ACKS", name: "acks", type: "text" },
    { label: "KAFKA_TLS_ENABLE", name: "tls_enable", type: "text" },
    { label: "KAFKA_TLS_CA", name: "tls_ca", type: "text" },
    { label: "KAFKA_TLS_CLIENT_CERT", name: "tls_client_cert", type: "text" },
    { label: "KAFKA_TLS_CLIENT_KEY", name: "tls_client_key", type: "text" },
    { label: "KAFKA_QUEUE_DIR", name: "queue_dir", type: "text" },
    { label: "KAFKA_QUEUE_LIMIT", name: "queue_limit", type: "number" },
    { label: "COMMENT_KEY", name: "comment", type: "text" },
  ],
  MQTT: [
    { label: "MQTT_BROKER", name: "broker", type: "text" },
    { label: "MQTT_TOPIC", name: "topic", type: "text" },
    { label: "MQTT_QOS", name: "qos", type: "number" },
    { label: "MQTT_USERNAME", name: "username", type: "text" },
    { label: "MQTT_PASSWORD", name: "password", type: "password" },
    { label: "MQTT_RECONNECT_INTERVAL", name: "reconnect_interval", type: "number" },
    { label: "MQTT_KEEP_ALIVE_INTERVAL", name: "keep_alive_interval", type: "number" },
    { label: "MQTT_QUEUE_DIR", name: "queue_dir", type: "text" },
    { label: "MQTT_QUEUE_LIMIT", name: "queue_limit", type: "number" },
    { label: "MQTT_TLS_POLICY", name: "tls_policy", type: "text" },
    { label: "MQTT_TLS_CA", name: "tls_ca", type: "text" },
    { label: "MQTT_TLS_CLIENT_CERT", name: "tls_client_cert", type: "text" },
    { label: "MQTT_TLS_CLIENT_KEY", name: "tls_client_key", type: "text" },
    { label: "MQTT_TLS_TRUST_LEAF_AS_CA", name: "tls_trust_leaf_as_ca", type: "text" },
    { label: "MQTT_WS_PATH_ALLOWLIST", name: "ws_path_allowlist", type: "text" },
    { label: "COMMENT_KEY", name: "comment", type: "text" },
  ],
  Webhook: [
    { label: "WEBHOOK_ENDPOINT", name: "endpoint", type: "text" },
    { label: "WEBHOOK_AUTH_TOKEN", name: "auth_token", type: "text" },
    { label: "WEBHOOK_QUEUE_LIMIT", name: "queue_limit", type: "number" },
    { label: "WEBHOOK_QUEUE_DIR", name: "queue_dir", type: "text" },
    { label: "WEBHOOK_CLIENT_CERT", name: "client_cert", type: "text" },
    { label: "WEBHOOK_CLIENT_KEY", name: "client_key", type: "text" },
    { label: "WEBHOOK_CLIENT_CA", name: "client_ca", type: "text" },
    { label: "WEBHOOK_SKIP_TLS_VERIFY", name: "skip_tls_verify", type: "text" },
    { label: "COMMENT_KEY", name: "comment", type: "text" },
  ],
  NATS: [
    { label: "NATS_ADDRESS", name: "address", type: "text" },
    { label: "NATS_SUBJECT", name: "subject", type: "text" },
    { label: "NATS_USERNAME", name: "username", type: "text" },
    { label: "NATS_PASSWORD", name: "password", type: "password" },
    { label: "NATS_TOKEN", name: "token", type: "text" },
    { label: "NATS_CREDENTIALS_FILE", name: "credentials_file", type: "text" },
    { label: "NATS_TLS_CA", name: "tls_ca", type: "text" },
    { label: "NATS_TLS_CLIENT_CERT", name: "tls_client_cert", type: "text" },
    { label: "NATS_TLS_CLIENT_KEY", name: "tls_client_key", type: "text" },
    { label: "NATS_TLS_REQUIRED", name: "tls_required", type: "text" },
    { label: "NATS_QUEUE_DIR", name: "queue_dir", type: "text" },
    { label: "NATS_QUEUE_LIMIT", name: "queue_limit", type: "number" },
    { label: "COMMENT_KEY", name: "comment", type: "text" },
  ],
  Pulsar: [
    { label: "PULSAR_BROKER", name: "broker", type: "text" },
    { label: "PULSAR_TOPIC", name: "topic", type: "text" },
    { label: "PULSAR_AUTH_TOKEN", name: "auth_token", type: "text" },
    { label: "PULSAR_USERNAME", name: "username", type: "text" },
    { label: "PULSAR_PASSWORD", name: "password", type: "password" },
    { label: "PULSAR_TLS_CA", name: "tls_ca", type: "text" },
    { label: "PULSAR_TLS_ALLOW_INSECURE", name: "tls_allow_insecure", type: "text" },
    { label: "PULSAR_TLS_HOSTNAME_VERIFICATION", name: "tls_hostname_verification", type: "text" },
    { label: "PULSAR_QUEUE_DIR", name: "queue_dir", type: "text" },
    { label: "PULSAR_QUEUE_LIMIT", name: "queue_limit", type: "number" },
    { label: "COMMENT_KEY", name: "comment", type: "text" },
  ],
}

export const EVENT_TARGET_TYPE_OPTIONS: Array<{
  labelKey: string
  value: EventTargetType
  icon: string
  descKey: string
}> = [
  {
    labelKey: "Kafka",
    value: "Kafka",
    icon: "/svg/kafka.svg",
    descKey: "Send events via Kafka",
  },
  {
    labelKey: "MQTT",
    value: "MQTT",
    icon: "/svg/mqtt.svg",
    descKey: "Send events via MQTT broker",
  },
  {
    labelKey: "Webhook",
    value: "Webhook",
    icon: "/svg/webhooks.svg",
    descKey: "Trigger custom HTTP endpoints",
  },
  {
    labelKey: "NATS",
    value: "NATS",
    icon: "/svg/nats.svg",
    descKey: "Send events via NATS",
  },
  {
    labelKey: "Pulsar",
    value: "Pulsar",
    icon: "/svg/pulsar.svg",
    descKey: "Send events via Pulsar",
  },
]

export const EVENT_TARGET_TYPE_MAPPING: Record<EventTargetType, string> = {
  Kafka: "notify_kafka",
  MQTT: "notify_mqtt",
  Webhook: "notify_webhook",
  NATS: "notify_nats",
  Pulsar: "notify_pulsar",
}
