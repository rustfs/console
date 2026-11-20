import assert from "node:assert/strict"
import test from "node:test"
import { S3Client } from "@aws-sdk/client-s3"
import { listAllBuckets } from "../../lib/list-all-buckets"

test("collects all pages within the account and deduplicates names", async () => {
  const result = await listAllBuckets(async ({ input: { ContinuationToken: token } }) =>
    token
      ? { $metadata: {}, Buckets: [{ Name: "a" }, { Name: "b" }] }
      : { $metadata: {}, Buckets: [{ Name: "a" }], ContinuationToken: "more" },
  )
  assert.deepEqual(result.Buckets, [{ Name: "a" }, { Name: "b" }])
  assert.equal(result.ContinuationToken, undefined)
})

test("a repeated token or failed later page cannot produce an apparently complete list", async () => {
  await assert.rejects(
    listAllBuckets(async () => ({ $metadata: {}, ContinuationToken: "repeated" })),
    /repeated/,
  )
  await assert.rejects(
    listAllBuckets(async ({ input: { ContinuationToken: token } }) => {
      if (token) throw new Error("AccessDenied")
      return { $metadata: {}, ContinuationToken: "next", Buckets: [{ Name: "a" }] }
    }),
    /AccessDenied/,
  )
})

test("the S3 wire request opts into pagination on the first and subsequent pages", async (t) => {
  const queries: Record<string, unknown>[] = []
  const client = new S3Client({
    region: "us-east-1",
    endpoint: "https://console.test",
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
    maxAttempts: 1,
    requestHandler: {
      async handle(request: { query: Record<string, unknown> }) {
        queries.push(request.query)
        const next = queries.length === 1 ? "<ContinuationToken>more</ContinuationToken>" : ""
        return {
          response: {
            statusCode: 200,
            headers: { "content-type": "application/xml" },
            body: new TextEncoder().encode("<ListAllMyBucketsResult>" + next + "</ListAllMyBucketsResult>"),
          },
        }
      },
    },
  })
  t.after(() => client.destroy())
  await listAllBuckets((command) => client.send(command))
  assert.deepEqual(
    queries.map((q) => [q["max-buckets"], q["continuation-token"]]),
    [
      ["1000", undefined],
      ["1000", "more"],
    ],
  )
})
