import test from "node:test"
import assert from "node:assert/strict"

import { canManageNotifyBackedFeature } from "../../lib/notify-module-access.js"

test("canManageNotifyBackedFeature blocks changes only when notify is disabled", () => {
  assert.equal(canManageNotifyBackedFeature(false), false)
  assert.equal(canManageNotifyBackedFeature(true), true)
  assert.equal(canManageNotifyBackedFeature(undefined), true)
})
