import test from "node:test"
import assert from "node:assert/strict"

import { canManageAuditTargets } from "../../lib/audit-target-access.js"

test("canManageAuditTargets blocks changes only when audit is disabled", () => {
  assert.equal(canManageAuditTargets(false), false)
  assert.equal(canManageAuditTargets(true), true)
  assert.equal(canManageAuditTargets(undefined), true)
})
