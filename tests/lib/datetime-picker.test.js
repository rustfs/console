import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

import {
  applyDateTimeBounds,
  formatDisplayDateTime,
  getDateFnsLocaleCode,
  getHtmlLocale,
  toDateInputValue,
  toDateTimeInputValue,
  toIsoDateInputValue,
  toIsoDateTimeValue,
  toTimeInputValue,
} from "../../lib/datetime-picker.js"

test("maps app locales to date-fns locale module codes", () => {
  assert.equal(getDateFnsLocaleCode("zh-CN"), "zh-CN")
  assert.equal(getDateFnsLocaleCode("zh"), "zh-CN")
  assert.equal(getDateFnsLocaleCode("pt-BR"), "pt-BR")
  assert.equal(getDateFnsLocaleCode("en-US"), "en-US")
  assert.equal(getDateFnsLocaleCode("unknown"), "en-US")
})

test("maps app locales to browser locale tags for display formatting", () => {
  assert.equal(getHtmlLocale("zh_CN"), "zh-CN")
  assert.equal(getHtmlLocale("ar-MA"), "ar-MA")
  assert.equal(getHtmlLocale("ja-JP"), "ja")
})

test("formats ISO values for date and time controls", () => {
  assert.match(toDateInputValue("2026-05-08T09:30:00.000Z"), /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(toDateTimeInputValue("2026-05-08T09:30:00.000Z").length, 16)
  assert.match(toDateTimeInputValue("2026-05-08T09:30:00.000Z"), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  assert.match(toTimeInputValue("2026-05-08T09:30:00.000Z"), /^\d{2}:\d{2}$/)
  assert.equal(toDateInputValue("not-a-date"), "")
  assert.equal(toDateTimeInputValue("not-a-date"), "")
  assert.equal(toTimeInputValue("not-a-date"), "00:00")
})

test("combines selected date and time into an ISO value", () => {
  const result = toIsoDateTimeValue(new Date(2026, 4, 8), "14:35")

  assert.equal(typeof result, "string")
  assert.equal(toDateTimeInputValue(result), "2026-05-08T14:35")
  assert.equal(toDateTimeInputValue(toIsoDateInputValue("2026-05-09", "08:20")), "2026-05-09T08:20")
})

test("clamps ISO values to min and max bounds", () => {
  const min = "2026-05-08T09:30:00.000Z"
  const max = "2026-05-10T18:00:00.000Z"

  assert.equal(applyDateTimeBounds("2026-05-08T08:00:00.000Z", min, max), min)
  assert.equal(applyDateTimeBounds("2026-05-11T08:00:00.000Z", min, max), max)
  assert.equal(applyDateTimeBounds("2026-05-09T08:00:00.000Z", min, max), "2026-05-09T08:00:00.000Z")
  assert.equal(applyDateTimeBounds("not-a-date", min, max), null)
})

test("keeps future-day times when the minimum is near the current time", () => {
  const min = "2026-05-14T12:01:00.000Z"
  const tomorrowEarly = "2026-05-15T01:00:00.000Z"

  assert.equal(applyDateTimeBounds(tomorrowEarly, min), tomorrowEarly)
})

test("returns localized display text", () => {
  const value = "2026-05-08T09:30:00.000Z"

  assert.notEqual(formatDisplayDateTime(value, "en"), "")
  assert.notEqual(formatDisplayDateTime(value, "zh"), "")
  assert.equal(formatDisplayDateTime(null, "zh"), "")
})

test("DateTimePicker does not render native date or time picker inputs inside the popover", () => {
  const source = fs.readFileSync("components/datetime-picker.tsx", "utf8")

  assert.equal(source.includes('type="date"'), false)
  assert.equal(source.includes('type="time"'), false)
})

test("DateTimePicker can render its popover inside an existing dialog", () => {
  const pickerSource = fs.readFileSync("components/datetime-picker.tsx", "utf8")
  const popoverSource = fs.readFileSync("components/ui/popover.tsx", "utf8")

  assert.equal(popoverSource.includes("portalContainer?:"), true)
  assert.equal(popoverSource.includes("<PopoverPrimitive.Portal container={portalContainer}>"), true)
  assert.equal(pickerSource.includes("portalContainer={portalContainer}"), true)
})

test("DateTimePicker keeps the calendar date selected when clicked again", () => {
  const source = fs.readFileSync("components/datetime-picker.tsx", "utf8")

  assert.equal(source.includes('mode="single"'), true)
  assert.equal(source.includes("required"), true)
})
