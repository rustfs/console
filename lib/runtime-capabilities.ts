"use client"

type JsonRecord = Record<string, unknown>

export type RuntimeCapabilityFieldState = "supported" | "read_only_historical" | "unsupported"

export interface RuntimeCapabilityField {
  name: string
  state: RuntimeCapabilityFieldState
}

export interface RuntimeCapabilityStatus {
  state: string
  reason?: string
}

export interface RuntimeCapabilityFeature {
  contractVersion: number
  status: RuntimeCapabilityStatus
  fields: RuntimeCapabilityField[]
}

export interface RuntimeCapabilitiesSnapshot {
  replication: {
    contractVersion: number
    bucketReplication: RuntimeCapabilityFeature
    remoteTargets: RuntimeCapabilityFeature
    mixedVersionPolicy: string
  }
  storageClasses: {
    contractVersion: number
    supportedWriteClasses: string[]
    unsupportedWriteError: string
    legacyLabelBehavior: string
  }
}

export interface RuntimeCapabilitiesNormalization {
  capabilities: RuntimeCapabilitiesSnapshot | null
  error?: string
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function normalizeStatus(value: unknown): RuntimeCapabilityStatus {
  const record = asRecord(value)

  return {
    state: asString(record.state).toLowerCase(),
    ...(asString(record.reason) ? { reason: asString(record.reason) } : {}),
  }
}

function normalizeFieldState(value: unknown): RuntimeCapabilityFieldState {
  const normalized = asString(value).toLowerCase()

  if (normalized === "supported" || normalized === "read_only_historical" || normalized === "unsupported") {
    return normalized
  }

  return "unsupported"
}

function normalizeFields(value: unknown): RuntimeCapabilityField[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    const record = asRecord(item)
    const name = asString(record.name)
    if (!name) return []

    return [{ name, state: normalizeFieldState(record.state) }]
  })
}

/**
 * The contract version only describes the shape of a capability block, which
 * has been stable since v1. Servers bump it whenever the *semantics* of a
 * field change (remote targets are already on v4), so gating on an exact
 * version makes every server-side bump break the console. Semantics are read
 * from `status` and the self-describing `fields` list instead, which keeps the
 * fail-closed behaviour where it belongs: an unsupported capability or an
 * unknown field is still treated as unsupported.
 */
const MINIMUM_CONTRACT_VERSION = 1

function isSupportedContractVersion(contractVersion: number): boolean {
  return Number.isInteger(contractVersion) && contractVersion >= MINIMUM_CONTRACT_VERSION
}

function normalizeFeature(value: unknown): RuntimeCapabilityFeature | null {
  const record = asRecord(value)
  const contractVersion = asNumber(record.contract_version)

  if (!isSupportedContractVersion(contractVersion)) {
    return null
  }

  return {
    contractVersion,
    status: normalizeStatus(record.status),
    fields: normalizeFields(record.fields),
  }
}

export function normalizeRuntimeCapabilities(value: unknown): RuntimeCapabilitiesNormalization {
  const record = asRecord(value)
  const replication = normalizeFeature(record.replication)
  const storageClasses = asRecord(record.storage_classes)

  if (!replication) {
    return {
      capabilities: null,
      error: "Versioned replication capabilities are unavailable on this server.",
    }
  }

  const storageClassesVersion = asNumber(storageClasses.contract_version)
  if (!isSupportedContractVersion(storageClassesVersion)) {
    return {
      capabilities: null,
      error: "Storage-class capabilities are unavailable on this server.",
    }
  }

  const bucketReplication = normalizeFeature(replication ? asRecord(record.replication).bucket_replication : null)
  const remoteTargets = normalizeFeature(replication ? asRecord(record.replication).remote_targets : null)

  if (!bucketReplication || !remoteTargets) {
    return {
      capabilities: null,
      error: "Replication capabilities are unavailable on this server.",
    }
  }

  return {
    capabilities: {
      replication: {
        contractVersion: asNumber(asRecord(record.replication).contract_version),
        bucketReplication,
        remoteTargets,
        mixedVersionPolicy: asString(asRecord(record.replication).mixed_version_policy),
      },
      storageClasses: {
        contractVersion: storageClassesVersion,
        supportedWriteClasses: Array.isArray(storageClasses.supported_write_classes)
          ? storageClasses.supported_write_classes.flatMap((item) => (typeof item === "string" && item ? [item] : []))
          : [],
        unsupportedWriteError: asString(storageClasses.unsupported_write_error),
        legacyLabelBehavior: asString(storageClasses.legacy_label_behavior),
      },
    },
  }
}

export function getRuntimeCapabilityFieldState(
  capabilities: RuntimeCapabilitiesSnapshot | null,
  feature: "bucketReplication" | "remoteTargets",
  fieldName: string,
): RuntimeCapabilityFieldState {
  if (!capabilities) {
    return "unsupported"
  }

  const capability = capabilities.replication[feature]
  if (capability.status.state !== "supported") {
    return "unsupported"
  }

  const fields = capability.fields
  return fields.find((field) => field.name === fieldName)?.state ?? "unsupported"
}

export function isRuntimeCapabilitiesSupported(capabilities: RuntimeCapabilitiesSnapshot | null): boolean {
  return Boolean(capabilities)
}
