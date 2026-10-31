import test from "node:test"
import assert from "node:assert/strict"
import { summarizePrefix } from "../../lib/prefix-summary"

const signal = () => new AbortController().signal
const object = (size: number, time: string) => ({ Size: size, LastModified: new Date(time) })

test("combines pages and returns the newest object time", async () => {
  const result = await summarizePrefix(
    async (token) =>
      token
        ? { Contents: [object(4, "2026-02-01")], IsTruncated: false }
        : { Contents: [object(3, "2026-01-01")], IsTruncated: true, NextContinuationToken: "next" },
    signal(),
  )
  assert.deepEqual(result, { size: 7, lastModified: new Date("2026-02-01") })
})

test("empty prefixes have zero size and no object time", async () => {
  assert.deepEqual(await summarizePrefix(async () => ({ IsTruncated: false }), signal()), {
    size: 0,
    lastModified: undefined,
  })
})

test("rejects missing metadata and unsafe totals", async () => {
  await assert.rejects(summarizePrefix(async () => ({ Contents: [{ Size: 2 }], IsTruncated: false }), signal()))
  await assert.rejects(
    summarizePrefix(
      async () => ({
        Contents: [object(Number.MAX_SAFE_INTEGER, "2026-01-01"), object(1, "2026-01-01")],
        IsTruncated: false,
      }),
      signal(),
    ),
  )
})

test("rejects missing and repeated continuation tokens", async () => {
  await assert.rejects(summarizePrefix(async () => ({ IsTruncated: true }), signal()))
  await assert.rejects(summarizePrefix(async () => ({ IsTruncated: true, NextContinuationToken: "same" }), signal()))
})

test("limits long scans and propagates network errors and cancellation", async () => {
  let pages = 0
  await assert.rejects(
    summarizePrefix(async () => ({ IsTruncated: true, NextContinuationToken: String(++pages) }), signal()),
  )
  assert.equal(pages, 100)
  await assert.rejects(
    summarizePrefix(async () => {
      throw new Error("network")
    }, signal()),
    /network/,
  )
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(summarizePrefix(async () => ({ IsTruncated: false }), controller.signal))
})

test("rejects malformed timestamps, oversized pages and missing truncation state", async () => {
  await assert.rejects(
    summarizePrefix(async () => ({ Contents: [object(1, "invalid")], IsTruncated: false }), signal()),
  )
  await assert.rejects(summarizePrefix(async () => ({ IsTruncated: undefined }), signal()))
  await assert.rejects(
    summarizePrefix(
      async () => ({ Contents: Array(100_001).fill(object(0, "2026-01-01")), IsTruncated: false }),
      signal(),
    ),
  )
})

test("cancellation after a page request never reports a partial result", async () => {
  const controller = new AbortController()
  await assert.rejects(
    summarizePrefix(async () => {
      controller.abort()
      return { Contents: [object(1, "2026-01-01")], IsTruncated: false }
    }, controller.signal),
  )
})
