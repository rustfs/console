import assert from "node:assert/strict"
import test from "node:test"
import {
  getRuntimeCapabilityFieldState,
  isRuntimeCapabilitiesSupported,
  normalizeRuntimeCapabilities,
} from "../../lib/runtime-capabilities"

test("runtime capabilities normalize supported and historical replication fields", () => {
  const normalized = normalizeRuntimeCapabilities({
    replication: {
      contract_version: 1,
      bucket_replication: {
        contract_version: 1,
        status: { state: "supported", reason: "bucket replication is available" },
        fields: [
          { name: "Rule.DeleteReplication.Status", state: "supported" },
          { name: "Destination.EncryptionConfiguration", state: "read_only_historical" },
        ],
      },
      remote_targets: {
        contract_version: 1,
        status: { state: "supported", reason: "remote targets are available" },
        fields: [
          { name: "bandwidth", state: "supported" },
          { name: "disableProxy", state: "unsupported" },
        ],
      },
      mixed_version_policy: "fail_closed_when_capability_unknown_or_unsupported",
    },
    storage_classes: {
      contract_version: 1,
      supported_write_classes: ["STANDARD", "REDUCED_REDUNDANCY"],
      unsupported_write_error: "InvalidStorageClass",
      legacy_label_behavior: "normalized_to_effective_class",
    },
  })

  assert.equal(isRuntimeCapabilitiesSupported(normalized.capabilities), true)
  assert.equal(
    getRuntimeCapabilityFieldState(normalized.capabilities, "bucketReplication", "Rule.DeleteReplication.Status"),
    "supported",
  )
  assert.equal(
    getRuntimeCapabilityFieldState(normalized.capabilities, "bucketReplication", "Destination.EncryptionConfiguration"),
    "read_only_historical",
  )
  assert.equal(getRuntimeCapabilityFieldState(normalized.capabilities, "remoteTargets", "disableProxy"), "unsupported")
  assert.deepEqual(normalized.capabilities?.storageClasses.supportedWriteClasses, ["STANDARD", "REDUCED_REDUNDANCY"])
})

test("runtime capabilities fail closed on unknown contract versions", () => {
  const normalized = normalizeRuntimeCapabilities({
    replication: {
      contract_version: 2,
      bucket_replication: {
        contract_version: 1,
        status: { state: "supported" },
        fields: [],
      },
      remote_targets: {
        contract_version: 1,
        status: { state: "supported" },
        fields: [],
      },
      mixed_version_policy: "fail_closed_when_capability_unknown_or_unsupported",
    },
    storage_classes: {
      contract_version: 1,
      supported_write_classes: ["STANDARD"],
      unsupported_write_error: "InvalidStorageClass",
      legacy_label_behavior: "normalized_to_effective_class",
    },
  })

  assert.equal(normalized.capabilities, null)
  assert.match(normalized.error ?? "", /unavailable/)
  assert.equal(getRuntimeCapabilityFieldState(normalized.capabilities, "remoteTargets", "disableProxy"), "unsupported")
})

test("runtime capability fields fail closed when a feature is unavailable", () => {
  const normalized = normalizeRuntimeCapabilities({
    replication: {
      contract_version: 1,
      bucket_replication: {
        contract_version: 1,
        status: { state: "supported" },
        fields: [{ name: "Rule.ID", state: "supported" }],
      },
      remote_targets: {
        contract_version: 1,
        status: { state: "unsupported", reason: "remote target routes are unavailable" },
        fields: [{ name: "endpoint", state: "supported" }],
      },
      mixed_version_policy: "fail_closed_when_capability_unknown_or_unsupported",
    },
    storage_classes: {
      contract_version: 1,
      supported_write_classes: ["STANDARD"],
      unsupported_write_error: "InvalidStorageClass",
      legacy_label_behavior: "normalized_to_effective_class",
    },
  })

  assert.equal(getRuntimeCapabilityFieldState(normalized.capabilities, "remoteTargets", "endpoint"), "unsupported")
})
