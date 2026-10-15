import test from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { formatDateTime, formatDateTimeWithOffset } from "../../lib/functions"

function formatInTimezone(timeZone: string, values: (string | number)[]): string[][] {
  const moduleUrl = new URL("../../lib/functions.ts", import.meta.url).href
  const output = execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--input-type=module",
      "--eval",
      `import { formatDateTime, formatDateTimeWithOffset } from ${JSON.stringify(moduleUrl)};
       process.stdout.write(JSON.stringify(${JSON.stringify(values)}.map(value => [
         formatDateTime(value), formatDateTimeWithOffset(value)
       ])));`,
    ],
    { encoding: "utf8", env: { ...process.env, TZ: timeZone } },
  )
  return JSON.parse(output)
}

test("date formatting uses the same numeric local time for strings, timestamps, and Date objects", () => {
  const date = new Date(2026, 8, 24, 14, 24, 24, 987)

  for (const value of [date, date.getTime(), date.toISOString()]) {
    assert.equal(formatDateTime(value), "2026-09-24 14:24:24")
  }
})

test("date formatting pads single digits and uses hour zero at midnight", () => {
  assert.equal(formatDateTime(new Date(2026, 0, 2, 0, 3, 4)), "2026-01-02 00:03:04")
})

test("date formatting returns the supplied fallback for missing and invalid values", () => {
  for (const value of [undefined, null, "", "   ", "not-a-date", new Date(NaN), NaN, Infinity]) {
    assert.equal(formatDateTime(value), "--")
    assert.equal(formatDateTime(value, "-"), "-")
    assert.equal(formatDateTimeWithOffset(value), "--")
    assert.equal(formatDateTimeWithOffset(value, ""), "")
  }
})

test("date formatting is independent of the document language", (t) => {
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document")
  t.after(() => {
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument)
    else Reflect.deleteProperty(globalThis, "document")
  })

  const date = new Date(2026, 8, 24, 14, 24, 24)
  const withOffset = formatDateTimeWithOffset(date)
  for (const lang of ["en-US", "zh-CN", "ar-MA"]) {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { documentElement: { lang } },
    })
    assert.equal(formatDateTime(date), "2026-09-24 14:24:24")
    assert.equal(formatDateTimeWithOffset(date), withOffset)
  }
})

test("date formatting does not mutate the input Date or its ISO value", () => {
  const date = new Date("2026-09-24T06:24:24.987Z")

  formatDateTime(date)
  formatDateTimeWithOffset(date)

  assert.equal(date.toISOString(), "2026-09-24T06:24:24.987Z")
})

test("UTC formatting supports epoch zero, explicit offsets, and valid future dates", () => {
  assert.deepEqual(formatInTimezone("UTC", [0, "2026-09-24T14:24:24+08:00", "9999-01-01T00:00:00Z"]), [
    ["1970-01-01 00:00:00", "1970-01-01 00:00:00 UTC+00:00"],
    ["2026-09-24 06:24:24", "2026-09-24 06:24:24 UTC+00:00"],
    ["9999-01-01 00:00:00", "9999-01-01 00:00:00 UTC+00:00"],
  ])
})

test("Shanghai formatting preserves native date-only parsing and crosses the year at local midnight", () => {
  assert.deepEqual(formatInTimezone("Asia/Shanghai", ["2026-09-24", "2026-12-31T16:00:00Z"]), [
    ["2026-09-24 08:00:00", "2026-09-24 08:00:00 UTC+08:00"],
    ["2027-01-01 00:00:00", "2027-01-01 00:00:00 UTC+08:00"],
  ])
})

test("New York formatting uses the event offset across daylight saving transitions", () => {
  assert.deepEqual(
    formatInTimezone("America/New_York", [
      "2026-03-08T06:59:59Z",
      "2026-03-08T07:00:00Z",
      "2026-11-01T05:30:00Z",
      "2026-11-01T06:30:00Z",
    ]),
    [
      ["2026-03-08 01:59:59", "2026-03-08 01:59:59 UTC-05:00"],
      ["2026-03-08 03:00:00", "2026-03-08 03:00:00 UTC-04:00"],
      ["2026-11-01 01:30:00", "2026-11-01 01:30:00 UTC-04:00"],
      ["2026-11-01 01:30:00", "2026-11-01 01:30:00 UTC-05:00"],
    ],
  )
})

test("date formatting preserves half-hour timezone offsets", () => {
  assert.deepEqual(formatInTimezone("Asia/Kolkata", ["2026-09-24T00:00:00Z"]), [
    ["2026-09-24 05:30:00", "2026-09-24 05:30:00 UTC+05:30"],
  ])
})
