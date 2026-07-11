import test from "node:test"
import assert from "node:assert/strict"
import { redactRequestOptionsForLog } from "../../lib/api-request-log"

const loadApiClient = () => import(new URL("../../lib/api-client.ts", import.meta.url).href)

test("ApiClient does not mutate request options and preserves existing query parameters", async () => {
  const { ApiClient } = await loadApiClient()
  const urls: string[] = []
  const transport = {
    fetch: async (input: string | Request) => {
      urls.push(String(input))
      return Response.json({ ok: true })
    },
  }
  const client = new ApiClient(transport, { baseUrl: "https://console.test/api" })
  const options = { params: { page: "2" }, headers: { "X-Request": "one" } }

  await client.get("/objects?prefix=photos", options)
  await client.get("/objects?prefix=photos", options)

  assert.deepEqual(options, { params: { page: "2" }, headers: { "X-Request": "one" } })
  assert.deepEqual(urls, [
    "https://console.test/api/objects?prefix=photos&page=2",
    "https://console.test/api/objects?prefix=photos&page=2",
  ])
})

test("ApiClient rejects 401 and 403 responses after invoking global handlers", async () => {
  const { ApiClient } = await loadApiClient()
  const handled: number[] = []
  const errorHandler = {
    handle401: async () => {
      handled.push(401)
    },
    handle403: async () => {
      handled.push(403)
    },
    handleServerError: async () => {},
    handleByStatus: async () => {},
  }
  const statuses = [401, 403]
  const client = new ApiClient(
    {
      fetch: async () => {
        const status = statuses.shift() ?? 500
        return Response.json({ message: `HTTP ${status}` }, { status })
      },
    },
    { errorHandler },
  )

  await assert.rejects(client.get("https://console.test/unauthorized"), { message: "HTTP 401", status: 401 })
  await assert.rejects(client.get("https://console.test/forbidden"), { message: "HTTP 403", status: 403 })
  assert.deepEqual(handled, [401, 403])
})

test("ApiClient redacts sensitive headers and request bodies from development logs", () => {
  const redacted = redactRequestOptionsForLog({
    headers: { Authorization: "Bearer header-secret", Cookie: "session=cookie-secret" },
    body: JSON.stringify({
      password: "body-secret",
      profile: { apiKey: "nested-secret" },
      creds: '{"private_key":"gcs-private-key"}',
    }),
  })

  const serialized = JSON.stringify(redacted)
  assert.doesNotMatch(serialized, /body-secret|nested-secret|header-secret|cookie-secret|gcs-private-key/)
  assert.match(serialized, /\[REDACTED\]/)
})
