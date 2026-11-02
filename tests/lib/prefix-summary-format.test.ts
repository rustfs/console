import test from "node:test"
import assert from "node:assert/strict"
import { formatBytes } from "../../lib/functions"
import { compareByteCounts } from "../../lib/prefix-summary"

test("formats large bigint byte counts with integer rounding and existing units", () => {
  assert.equal(formatBytes(0n), "0 B")
  assert.equal(formatBytes(1536n), "1.5 KiB")
  assert.equal(formatBytes(9007199254740992n), "8.0 PiB")
  assert.equal(formatBytes(9007199254740992n, true), "8.0 Pi")
  assert.equal(formatBytes(1126n), "1.1 KiB")
})

test("compares numbers and bigint byte counts without precision loss", () => {
  const bytes: Array<number | bigint> = [9007199254740993n, 10, 9007199254740992n, 0, -1, 1n]
  assert.deepEqual(bytes.sort(compareByteCounts), [-1, 0, 1n, 10, 9007199254740992n, 9007199254740993n])
  assert.equal(compareByteCounts(1, 1n), 0)
})
