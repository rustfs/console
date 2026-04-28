import {
  AUDIT_TARGET_CONFIG_OPTIONS as JS_AUDIT_TARGET_CONFIG_OPTIONS,
  AUDIT_TARGET_TYPE_MAPPING as JS_AUDIT_TARGET_TYPE_MAPPING,
  AUDIT_TARGET_TYPE_OPTIONS as JS_AUDIT_TARGET_TYPE_OPTIONS,
} from "./audit-target-config.js"

export type AuditTargetType = "Kafka" | "MQTT" | "Webhook" | "NATS" | "Pulsar"

export type AuditTargetConfigField = {
  label: string
  name: string
  type: "text" | "password" | "number"
}

export const AUDIT_TARGET_CONFIG_OPTIONS = JS_AUDIT_TARGET_CONFIG_OPTIONS as Record<
  AuditTargetType,
  AuditTargetConfigField[]
>

export const AUDIT_TARGET_TYPE_OPTIONS = JS_AUDIT_TARGET_TYPE_OPTIONS as Array<{
  labelKey: string
  value: AuditTargetType
  icon: string
  descKey: string
}>

export const AUDIT_TARGET_TYPE_MAPPING = JS_AUDIT_TARGET_TYPE_MAPPING as Record<AuditTargetType, string>
