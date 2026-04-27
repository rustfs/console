import test from "node:test"
import assert from "node:assert/strict"

import { canManageEventDestinations } from "../../lib/event-destinations-access.js"

test("canManageEventDestinations blocks changes only when notify is disabled", () => {
  assert.equal(canManageEventDestinations(false), false)
  assert.equal(canManageEventDestinations(true), true)
  assert.equal(canManageEventDestinations(undefined), true)
})
