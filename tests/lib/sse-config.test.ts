import test from "node:test"
import assert from "node:assert/strict"

import {
  INITIAL_FORM_STATE,
  buildFormStateFromStatus,
  getFormSyncDecision,
  isSafeLocalFilePermissions,
  normalizeBackendType,
  type ConfigFormState,
} from "../../lib/sse/config"
import type { KmsServiceStatusResponse } from "../../types/kms"

function statusWithBackend(backendType: string | null): KmsServiceStatusResponse {
  return {
    status: backendType ? "Configured" : "NotConfigured",
    backend_type: backendType as KmsServiceStatusResponse["backend_type"],
    healthy: backendType ? true : null,
    config_summary: backendType
      ? {
          backend_type: backendType as NonNullable<KmsServiceStatusResponse["config_summary"]>["backend_type"],
          default_key_id: "server-default",
          backend_summary: {
            address: "http://vault.example.test:8200",
            mount_path: "transit",
          },
        }
      : null,
  }
}

test("normalizeBackendType keeps absent KMS configuration unselected and fails closed for future backends", () => {
  assert.equal(normalizeBackendType(null), null)
  assert.equal(normalizeBackendType(undefined), null)
  assert.equal(normalizeBackendType("Local"), "local")
  assert.equal(normalizeBackendType("VaultKV2"), "vault-kv2")
  assert.equal(normalizeBackendType("VaultTransit"), "vault-transit")
  assert.equal(normalizeBackendType("Static"), "static")
  assert.equal(normalizeBackendType("FutureBackend"), "unsupported")
})

test("buildFormStateFromStatus does not coerce NotConfigured or future backends to writable Local", () => {
  assert.deepEqual(buildFormStateFromStatus(statusWithBackend(null)), INITIAL_FORM_STATE)
  assert.equal(buildFormStateFromStatus(statusWithBackend("FutureBackend")).backendType, "unsupported")
})

test("getFormSyncDecision refreshes clean forms when the server baseline changes", () => {
  const nextBaseline = {
    ...INITIAL_FORM_STATE,
    backendType: "local",
    keyDir: "/var/lib/rustfs/kms",
  } satisfies ConfigFormState

  assert.equal(getFormSyncDecision(INITIAL_FORM_STATE, INITIAL_FORM_STATE, nextBaseline), "sync")
})

test("getFormSyncDecision blocks silent overwrite when local edits race server changes", () => {
  const dirtyForm = {
    ...INITIAL_FORM_STATE,
    defaultKeyId: "local-edit",
  } satisfies ConfigFormState
  const changedServerBaseline = {
    ...INITIAL_FORM_STATE,
    defaultKeyId: "server-edit",
  } satisfies ConfigFormState

  assert.equal(getFormSyncDecision(dirtyForm, INITIAL_FORM_STATE, changedServerBaseline), "conflict")
})

test("getFormSyncDecision preserves dirty edits when the server baseline is unchanged", () => {
  const dirtyForm = {
    ...INITIAL_FORM_STATE,
    defaultKeyId: "local-edit",
  } satisfies ConfigFormState

  assert.equal(getFormSyncDecision(dirtyForm, INITIAL_FORM_STATE, INITIAL_FORM_STATE), "keep-dirty")
})

test("isSafeLocalFilePermissions accepts owner-only modes and rejects exposed or special modes", () => {
  assert.equal(isSafeLocalFilePermissions(0o600), true)
  assert.equal(isSafeLocalFilePermissions(0o700), true)
  assert.equal(isSafeLocalFilePermissions(0o666), false)
  assert.equal(isSafeLocalFilePermissions(0o777), false)
  assert.equal(isSafeLocalFilePermissions(0o4755), false)
  assert.equal(isSafeLocalFilePermissions(-1), false)
  assert.equal(isSafeLocalFilePermissions(0.5), false)
})
