import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3"
import { addS3ErrorMiddleware } from "../../lib/s3-error-middleware"

function createClient(t: TestContext, statusCode: number, body: string) {
  const onSessionExpired = t.mock.fn<() => void>()
  const client = new S3Client({
    region: "us-east-1",
    endpoint: "https://console.example.test",
    credentials: {
      accessKeyId: "test-access",
      secretAccessKey: "test-secret",
      sessionToken: "test-token",
    },
    maxAttempts: 1,
    requestHandler: {
      async handle() {
        return {
          response: {
            statusCode,
            headers: { "content-type": "application/xml" },
            body: new TextEncoder().encode(body),
          },
        }
      },
    },
  })
  t.after(() => client.destroy())
  addS3ErrorMiddleware(client, onSessionExpired)
  return { client, onSessionExpired }
}

const errorXml = (code: string) =>
  `<Error><Code>${code}</Code><Message>Service reported ${code}</Message><RequestId>test-request</RequestId></Error>`

const matchesServiceError = (statusCode: number, code: string) => (error: unknown) => {
  assert.ok(error instanceof Error)
  assert.equal(error.name, code)
  assert.equal(error.message, `Service reported ${code}`)
  assert.equal((error as Error & { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode, statusCode)
  return true
}

for (const [statusCode, code] of [
  [403, "InvalidAccessKeyId"],
  [400, "ExpiredToken"],
  [403, "ExpiredToken"],
  [403, "UnauthorizedAccess"],
  [401, "Unauthorized"],
] as const) {
  test(`S3 ${statusCode} ${code} expires the session and still rejects the service error`, async (t) => {
    const { client, onSessionExpired } = createClient(t, statusCode, errorXml(code))

    await assert.rejects(client.send(new ListBucketsCommand({})), matchesServiceError(statusCode, code))
    assert.equal(onSessionExpired.mock.callCount(), 1)
  })
}

test("an empty S3 401 response expires the session without resolving a fabricated SDK output", async (t) => {
  const { client, onSessionExpired } = createClient(t, 401, "")

  await assert.rejects(client.send(new ListBucketsCommand({})), (error: unknown) => {
    assert.ok(error instanceof Error)
    assert.notEqual(error.name, "TypeError")
    return (error as Error & { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 401
  })
  assert.equal(onSessionExpired.mock.callCount(), 1)
})

for (const [statusCode, code] of [
  [403, "AccessDenied"],
  [403, "SignatureDoesNotMatch"],
  [404, "NoSuchBucket"],
  [500, "InternalError"],
] as const) {
  test(`S3 ${statusCode} ${code} remains rejected without expiring a valid session`, async (t) => {
    const { client, onSessionExpired } = createClient(t, statusCode, errorXml(code))

    await assert.rejects(client.send(new ListBucketsCommand({})), matchesServiceError(statusCode, code))
    assert.equal(onSessionExpired.mock.callCount(), 0)
  })
}

test("a successful S3 list preserves deserialized buckets and does not expire the session", async (t) => {
  const { client, onSessionExpired } = createClient(
    t,
    200,
    '<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Owner><ID>owner</ID><DisplayName>Owner</DisplayName></Owner><Buckets><Bucket><Name>photos</Name><CreationDate>2026-01-01T00:00:00.000Z</CreationDate></Bucket></Buckets></ListAllMyBucketsResult>',
  )

  const result = await client.send(new ListBucketsCommand({}))

  assert.deepEqual(
    result.Buckets?.map((bucket) => bucket.Name),
    ["photos"],
  )
  assert.equal(result.$metadata.httpStatusCode, 200)
  assert.equal(onSessionExpired.mock.callCount(), 0)
})

test("an empty successful XML response preserves the SDK output without a TypeError", async (t) => {
  const { client, onSessionExpired } = createClient(
    t,
    200,
    '<?xml version="1.0"?><ListAllMyBucketsResult></ListAllMyBucketsResult>',
  )

  const result = await client.send(new ListBucketsCommand({}))

  assert.equal(result.Buckets, undefined)
  assert.equal(result.$metadata.httpStatusCode, 200)
  assert.equal(onSessionExpired.mock.callCount(), 0)
})

test("a transport failure preserves the original error and does not expire the session", async (t) => {
  const networkError = new Error("Network unavailable")
  const onSessionExpired = t.mock.fn<() => void>()
  const client = new S3Client({
    region: "us-east-1",
    endpoint: "https://console.example.test",
    credentials: { accessKeyId: "test-access", secretAccessKey: "test-secret" },
    maxAttempts: 1,
    requestHandler: {
      async handle(): Promise<never> {
        throw networkError
      },
    },
  })
  t.after(() => client.destroy())
  addS3ErrorMiddleware(client, onSessionExpired)

  await assert.rejects(client.send(new ListBucketsCommand({})), (error) => error === networkError)
  assert.equal(onSessionExpired.mock.callCount(), 0)
})
