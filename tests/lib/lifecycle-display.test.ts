import test from "node:test"
import assert from "node:assert/strict"
import { getLifecycleActions } from "../../lib/lifecycle-display"
import { removeMatchingBucketRule } from "../../lib/bucket-configuration"

test("mixed expiration rules retain both version labels and their own days (rustfs#8036)", () => {
  for (const [current, noncurrent] of [
    [30, 40],
    [10, 20],
  ]) {
    assert.deepEqual(
      getLifecycleActions({
        Expiration: { Days: current },
        NoncurrentVersionExpiration: { NoncurrentDays: noncurrent },
      }).map(({ type, version, days }) => ({ type, version, days })),
      [
        { type: "Expire", version: "Current Version", days: current },
        { type: "Expire", version: "Non-current Version", days: noncurrent },
      ],
    )
  }
})

test("each transition keeps its version, tier and zero-day schedule", () => {
  assert.deepEqual(
    getLifecycleActions({
      Transitions: [
        { Days: 0, StorageClass: "WARM" },
        { Days: 90, StorageClass: "COLD" },
      ],
      NoncurrentVersionTransitions: [{ NoncurrentDays: 20, StorageClass: "ARCHIVE" }],
    }).map(({ version, days, tier }) => ({ version, days, tier })),
    [
      { version: "Current Version", days: 0, tier: "WARM" },
      { version: "Current Version", days: 90, tier: "COLD" },
      { version: "Non-current Version", days: 20, tier: "ARCHIVE" },
    ],
  )
})

test("marker cleanup is separate from noncurrent expiration", () => {
  const actions = getLifecycleActions({
    Expiration: { ExpiredObjectDeleteMarker: true },
    NoncurrentVersionExpiration: { NoncurrentDays: 40 },
  })
  assert.deepEqual(
    actions.map(({ version, days, deleteMarker }) => ({ version, days, deleteMarker })),
    [
      { version: "Current Version", days: undefined, deleteMarker: true },
      { version: "Non-current Version", days: 40, deleteMarker: undefined },
    ],
  )
})

test("date schedules and empty transition arrays do not invent noncurrent actions", () => {
  const date = new Date("2027-01-01T00:00:00Z")
  assert.equal(getLifecycleActions({ Expiration: { Date: date }, NoncurrentVersionTransitions: [] })[0].date, date)
  assert.deepEqual(getLifecycleActions({ Transitions: [], NoncurrentVersionTransitions: [] }), [])
})

test("display expansion leaves the original combined rule intact for deletion", () => {
  const rule = {
    ID: undefined,
    Status: "Enabled",
    Expiration: { Days: 30 },
    NoncurrentVersionExpiration: { NoncurrentDays: 40 },
  }
  const original = structuredClone(rule)
  const other = { ID: "other", Expiration: { Days: 60 } }
  getLifecycleActions(rule)
  assert.deepEqual(rule, original)
  assert.deepEqual(removeMatchingBucketRule([rule, other], rule), [other])
})
