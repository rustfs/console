import test from "node:test"
import assert from "node:assert/strict"
import { ListObjectsV2Command, type S3Client } from "@aws-sdk/client-s3"
import { fetchPrefixSummary } from "../../lib/prefix-summary-request"

test("requests each page using the literal prefix, URL encoding and abort signal without a delimiter", async () => {
  const controller = new AbortController()
  const calls: Array<{ command: ListObjectsV2Command; signal: AbortSignal }> = []
  const client = {
    send: async (command: ListObjectsV2Command, { abortSignal }: { abortSignal: AbortSignal }) => {
      calls.push({ command, signal: abortSignal })
      return calls.length === 1
        ? { IsTruncated: true, NextContinuationToken: "opaque" }
        : { IsTruncated: false, Contents: [{ Size: 5, LastModified: new Date("2026-01-01") }] }
    },
  } as unknown as S3Client
  const summary = await fetchPrefixSummary(client, "bucket", "a//%☃/", controller.signal)
  assert.equal(summary.size, 5)
  assert.equal(calls.length, 2)
  for (const { command, signal } of calls) {
    assert.ok(command instanceof ListObjectsV2Command)
    assert.equal(command.input.Prefix, "a//%☃/")
    assert.equal(command.input.Delimiter, undefined)
    assert.equal(command.input.EncodingType, "url")
    assert.equal(signal, controller.signal)
  }
  assert.equal(calls[1].command.input.ContinuationToken, "opaque")
})
