import test from "node:test"
import assert from "node:assert/strict"
import {
  addDeleteReplicationMiddleware,
  applyDeleteReplicationStatuses,
  injectDeleteReplication,
  readDeleteReplicationStatuses,
} from "../../lib/bucket-replication-delete"

const RULE = (id: string, deleteStatus?: string) =>
  `<Rule><ID>${id}</ID><Status>Enabled</Status><DeleteMarkerReplication><Status>Disabled</Status></DeleteMarkerReplication>` +
  (deleteStatus ? `<DeleteReplication><Status>${deleteStatus}</Status></DeleteReplication>` : "") +
  `<Destination><Bucket>arn:minio:replication::id:${id}</Bucket></Destination></Rule>`

const CONFIG = (...rules: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><ReplicationConfiguration><Role></Role>${rules.join("")}</ReplicationConfiguration>`

test("readDeleteReplicationStatuses: returns one status per rule in document order", () => {
  const xml = CONFIG(RULE("a", "Enabled"), RULE("b"), RULE("c", "Disabled"))
  assert.deepEqual(readDeleteReplicationStatuses(xml), ["Enabled", undefined, "Disabled"])
})

test("readDeleteReplicationStatuses: ignores DeleteMarkerReplication and whitespace", () => {
  const xml = CONFIG(
    `<Rule>\n  <DeleteMarkerReplication><Status>Enabled</Status></DeleteMarkerReplication>\n  <DeleteReplication>\n    <Status> Enabled </Status>\n  </DeleteReplication>\n</Rule>`,
  )
  assert.deepEqual(readDeleteReplicationStatuses(xml), ["Enabled"])
})

test("readDeleteReplicationStatuses: no rules yields an empty list", () => {
  assert.deepEqual(readDeleteReplicationStatuses(CONFIG()), [])
})

test("applyDeleteReplicationStatuses: sets the status on matching rules only", () => {
  const rules = [{ ID: "a" }, { ID: "b", DeleteReplication: { Status: "Stale" } }, { ID: "c" }]
  applyDeleteReplicationStatuses(rules, ["Enabled", undefined, "Disabled"])
  assert.deepEqual(rules, [
    { ID: "a", DeleteReplication: { Status: "Enabled" } },
    { ID: "b", DeleteReplication: { Status: "Stale" } },
    { ID: "c", DeleteReplication: { Status: "Disabled" } },
  ])
})

test("injectDeleteReplication: appends the element to each rule the form set it on", () => {
  const body = "<ReplicationConfiguration><Rule><ID>a</ID></Rule><Rule><ID>b</ID></Rule></ReplicationConfiguration>"
  const patched = injectDeleteReplication(body, [{ DeleteReplication: { Status: "Enabled" } }, {}])
  assert.equal(
    patched,
    "<ReplicationConfiguration><Rule><ID>a</ID><DeleteReplication><Status>Enabled</Status></DeleteReplication></Rule><Rule><ID>b</ID></Rule></ReplicationConfiguration>",
  )
})

test("injectDeleteReplication: leaves the body alone without rules", () => {
  assert.equal(injectDeleteReplication("<x/>", []), "<x/>")
  assert.equal(injectDeleteReplication(undefined, [{}]), undefined)
})

// Minimal stand-in for the SDK stack: record the registered middlewares so the
// test can run them around a fake deserializer.
type Handler = (args: Record<string, unknown>) => Promise<unknown>
type Middleware = (next: Handler, context: { commandName?: string }) => Handler

function makeFakeClient(streamCollector?: (stream: unknown) => Promise<Uint8Array>) {
  const registered = new Map<string, Middleware>()
  const client = {
    config: { streamCollector },
    middlewareStack: {
      add(mw: Middleware, opts: { name: string }) {
        registered.set(opts.name, mw)
      },
      addRelativeTo(mw: Middleware, opts: { name: string; relation: string; toMiddleware: string }) {
        assert.equal(opts.toMiddleware, "deserializerMiddleware")
        registered.set(opts.name, mw)
      },
    },
  }
  return { client, registered }
}

test("addDeleteReplicationMiddleware: merges statuses the SDK dropped into GetBucketReplication output", async () => {
  const xml = CONFIG(RULE("a", "Enabled"), RULE("b"))
  const { client, registered } = makeFakeClient(async () => new TextEncoder().encode(xml))
  addDeleteReplicationMiddleware(client)
  const context = { commandName: "GetBucketReplicationCommand" }

  // Chain as the SDK does: merge -> deserializer -> buffer -> HTTP handler.
  const http: Handler = async () => ({ response: { statusCode: 200, body: { stream: true } } })
  const buffered = registered.get("bufferDeleteReplicationXml")!(http, context)
  // The SDK's throw200Exceptions middleware re-wraps the body as a fresh,
  // consumed stream before the merge step sees it.
  const deserializer: Handler = async (args) => {
    const { response } = (await buffered(args)) as { response: { body: unknown } }
    assert.ok(response.body instanceof Uint8Array, "deserializer must see a buffered body")
    response.body = { consumedStream: true }
    return { response, output: { ReplicationConfiguration: { Rules: [{ ID: "a" }, { ID: "b" }] } } }
  }
  const handler = registered.get("mergeDeleteReplication")!(deserializer, context)

  const result = (await handler({ request: { path: "/" } })) as {
    output: { ReplicationConfiguration: { Rules: unknown[] } }
  }
  assert.deepEqual(result.output.ReplicationConfiguration.Rules, [
    { ID: "a", DeleteReplication: { Status: "Enabled" } },
    { ID: "b" },
  ])
})

test("addDeleteReplicationMiddleware: leaves other commands and error responses untouched", async () => {
  let collected = 0
  const { client, registered } = makeFakeClient(async () => {
    collected += 1
    return new Uint8Array()
  })
  addDeleteReplicationMiddleware(client)

  const stream = { stream: true }
  const http: Handler = async () => ({ response: { statusCode: 200, body: stream } })
  const other = (await registered.get("bufferDeleteReplicationXml")!(http, { commandName: "ListBucketsCommand" })(
    {},
  )) as {
    response: { body: unknown }
  }
  assert.equal(other.response.body, stream)

  const failing: Handler = async () => ({ response: { statusCode: 404, body: stream } })
  const error = (await registered.get("bufferDeleteReplicationXml")!(failing, {
    commandName: "GetBucketReplicationCommand",
  })({})) as { response: { body: unknown } }
  assert.equal(error.response.body, stream)
  assert.equal(collected, 0)
})

test("addDeleteReplicationMiddleware: injects DeleteReplication into PutBucketReplication bodies", async () => {
  const { client, registered } = makeFakeClient()
  addDeleteReplicationMiddleware(client)
  const args = {
    input: { Bucket: "b", ReplicationConfiguration: { Rules: [{ DeleteReplication: { Status: "Enabled" } }] } },
    request: { body: "<ReplicationConfiguration><Rule><ID>a</ID></Rule></ReplicationConfiguration>" },
  }
  await registered.get("injectDeleteReplication")!(async (a) => a, {})(args)
  assert.equal(
    args.request.body,
    "<ReplicationConfiguration><Rule><ID>a</ID><DeleteReplication><Status>Enabled</Status></DeleteReplication></Rule></ReplicationConfiguration>",
  )
})
