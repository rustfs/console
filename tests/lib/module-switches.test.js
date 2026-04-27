import test from "node:test"
import assert from "node:assert/strict"

import { getModuleSwitchEnvKey, isEnvManagedSource, isModuleSwitchEnvConflictError } from "../../lib/module-switches.js"

test("isEnvManagedSource returns true only for env-backed module switches", () => {
  assert.equal(isEnvManagedSource("env"), true)
  assert.equal(isEnvManagedSource("console"), false)
  assert.equal(isEnvManagedSource("default"), false)
})

test("getModuleSwitchEnvKey returns the deployment variable for a module", () => {
  assert.equal(getModuleSwitchEnvKey("notify"), "RUSTFS_NOTIFY_ENABLE")
  assert.equal(getModuleSwitchEnvKey("audit"), "RUSTFS_AUDIT_ENABLE")
})

test("isModuleSwitchEnvConflictError detects backend environment takeover errors", () => {
  assert.equal(
    isModuleSwitchEnvConflictError(
      new Error(
        "notify module is managed by environment variable RUSTFS_NOTIFY_ENABLE=true; update the environment value first",
      ),
    ),
    true,
  )
  assert.equal(isModuleSwitchEnvConflictError(new Error("storage layer not initialized")), false)
})
