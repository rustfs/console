import test from "node:test"
import assert from "node:assert/strict"

import {
  getDefaultObjectRetentionDate,
  getMinimumObjectRetentionDate,
  isObjectLegalHoldEnabled,
  isObjectRetentionDateInFuture,
  shouldShowObjectRetentionAction,
  toObjectRetentionInputValue,
  toObjectRetentionRequestValue,
} from "../../lib/object-lock.js"

test("isObjectLegalHoldEnabled reads legal hold from GetObjectLegalHold response", () => {
  assert.equal(isObjectLegalHoldEnabled({ Status: "ON" }), true)
  assert.equal(isObjectLegalHoldEnabled({ Status: "OFF" }), false)
  assert.equal(isObjectLegalHoldEnabled({ LegalHold: { Status: "ON" } }), true)
  assert.equal(isObjectLegalHoldEnabled({ LegalHold: { Status: "OFF" } }), false)
})

test("isObjectLegalHoldEnabled keeps HeadObject legal hold status as a fallback", () => {
  assert.equal(isObjectLegalHoldEnabled({ ObjectLockLegalHoldStatus: "ON" }), true)
  assert.equal(isObjectLegalHoldEnabled({ ObjectLockLegalHoldStatus: "OFF" }), false)
})

test("toObjectRetentionInputValue formats ISO retention dates for datetime-local inputs", () => {
  const inputValue = toObjectRetentionInputValue("2026-05-08T09:30:00.000Z")

  assert.equal(inputValue.length, 16)
  assert.match(inputValue, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
})

test("toObjectRetentionRequestValue converts datetime-local input values to ISO strings", () => {
  const requestValue = toObjectRetentionRequestValue("2026-05-08T14:35")

  assert.equal(typeof requestValue, "string")
  assert.equal(toObjectRetentionInputValue(requestValue), "2026-05-08T14:35")
})

test("toObjectRetentionRequestValue omits empty or invalid dates", () => {
  assert.equal(toObjectRetentionRequestValue(""), undefined)
  assert.equal(toObjectRetentionRequestValue("not-a-date"), undefined)
})

test("getDefaultObjectRetentionDate chooses a future retention date", () => {
  const now = new Date("2026-05-14T12:00:00.000Z")
  const defaultDate = getDefaultObjectRetentionDate(now)

  assert.equal(isObjectRetentionDateInFuture(defaultDate, now), true)
})

test("getMinimumObjectRetentionDate keeps the picker bound close to now", () => {
  const now = new Date("2026-05-14T12:00:00.000Z")
  const minimumDate = getMinimumObjectRetentionDate(now)
  const tomorrowMorning = "2026-05-15T01:00:00.000Z"

  assert.equal(isObjectRetentionDateInFuture(minimumDate, now), true)
  assert.equal(isObjectRetentionDateInFuture(tomorrowMorning, minimumDate), true)
})

test("isObjectRetentionDateInFuture rejects empty, invalid, and past dates", () => {
  const now = new Date("2026-05-14T12:00:00.000Z")

  assert.equal(isObjectRetentionDateInFuture("", now), false)
  assert.equal(isObjectRetentionDateInFuture("not-a-date", now), false)
  assert.equal(isObjectRetentionDateInFuture("2026-05-14T11:59:00.000Z", now), false)
  assert.equal(isObjectRetentionDateInFuture("2026-05-14T12:01:00.000Z", now), true)
})

test("shouldShowObjectRetentionAction requires retention permission and legal hold enabled", () => {
  assert.equal(
    shouldShowObjectRetentionAction({
      canEditRetention: true,
      legalHoldEnabled: true,
    }),
    true,
  )
  assert.equal(
    shouldShowObjectRetentionAction({
      canEditRetention: true,
      legalHoldEnabled: false,
    }),
    false,
  )
  assert.equal(
    shouldShowObjectRetentionAction({
      canEditRetention: false,
      legalHoldEnabled: true,
    }),
    false,
  )
})
