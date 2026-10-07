import assert from "node:assert/strict"
import test from "node:test"
import { buildEventTargetSubscriptionsPath } from "../../lib/event-target-api"

const loadApiClient = () => import(new URL("../../lib/api-client.ts", import.meta.url).href)

test("destination subscriptions use notification subsystems in admin requests", async () => {
  const { ApiClient } = await loadApiClient()
  const requests: string[] = []
  const expected = [{ bucket: "photos", id: "uploads", events: ["s3:ObjectCreated:*"] }]
  const api = new ApiClient(
    {
      fetch: async (input: string | Request) => {
        requests.push(String(input))
        return Response.json(expected)
      },
    },
    { baseUrl: "https://console.test/rustfs/admin/v3" },
  )

  for (const service of ["webhook", "kafka", "amqp", "mqtt", "nats", "pulsar", "redis", "mysql", "postgres"]) {
    const subscriptions = await api.get(buildEventTargetSubscriptionsPath(service, "primary"))
    assert.deepEqual(subscriptions, expected)
    assert.equal(requests.at(-1), `https://console.test/rustfs/admin/v3/target/notify_${service}/primary/subscriptions`)
  }
})

test("destination subscription requests encode names without creating path or query segments", async () => {
  const { ApiClient } = await loadApiClient()
  const requests: string[] = []
  const api = new ApiClient(
    {
      fetch: async (input: string | Request) => {
        requests.push(String(input))
        return Response.json([])
      },
    },
    { baseUrl: "https://console.test/prefix/rustfs/admin/v3" },
  )

  assert.deepEqual(await api.get(buildEventTargetSubscriptionsPath("webhook", "目标 /?#%")), [])
  assert.deepEqual(requests, [
    "https://console.test/prefix/rustfs/admin/v3/target/notify_webhook/%E7%9B%AE%E6%A0%87%20%2F%3F%23%25/subscriptions",
  ])
})

test("destination subscription request failures remain available to the page retry flow", async () => {
  const { ApiClient } = await loadApiClient()
  let attempts = 0
  const api = new ApiClient(
    {
      fetch: async () => {
        attempts += 1
        return attempts === 1 ? Response.json({ message: "Temporary failure" }, { status: 500 }) : Response.json([])
      },
    },
    { baseUrl: "https://console.test/rustfs/admin/v3" },
  )
  const path = buildEventTargetSubscriptionsPath("webhook", "primary")

  await assert.rejects(api.get(path), { status: 500, message: "Temporary failure" })
  assert.deepEqual(await api.get(path), [])
  assert.equal(attempts, 2)
})
