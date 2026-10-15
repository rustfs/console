import assert from "node:assert/strict"
import test from "node:test"
import { parseTimestampMilliseconds } from "../../lib/safe-date"

test("catalog millisecond timestamps accept numeric and string values", () => {
  const timestamp = Date.parse("2026-09-24T06:24:24.123Z")

  for (const value of [timestamp, String(timestamp), ` ${timestamp} `]) {
    assert.equal(parseTimestampMilliseconds(value)?.toISOString(), "2026-09-24T06:24:24.123Z")
  }
})

test("catalog millisecond timestamps preserve zero and pre-epoch dates", () => {
  for (const value of [0, "0", -1, "-1"]) {
    assert.equal(parseTimestampMilliseconds(value)?.getTime(), Number(value))
  }
})

test("missing catalog timestamps do not become the epoch", () => {
  for (const value of [undefined, null, "", " ", "\t\n"]) {
    assert.equal(parseTimestampMilliseconds(value), undefined)
  }
})

test("invalid catalog timestamps cannot create invalid time attributes", () => {
  for (const value of ["invalid", "2026-09-24T06:24:24Z", NaN, Infinity, -Infinity, 8.64e15 + 1, true, false, [], {}]) {
    assert.equal(parseTimestampMilliseconds(value), undefined)
  }
})
