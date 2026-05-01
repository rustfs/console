import test from "node:test"
import assert from "node:assert/strict"
import { addApiPrefixMiddleware } from "../../lib/api-prefix-middleware"

// Minimal mock of the AWS SDK middlewareStack contract: capture each
// addRelativeTo() call so the test can inspect the registered middleware
// and the relation/toMiddleware metadata.
type MwOpts = { name: string; relation: "before" | "after"; toMiddleware: string; override?: boolean }

function makeFakeClient() {
  const calls: Array<{ mw: unknown; opts: MwOpts }> = []
  const client = {
    middlewareStack: {
      addRelativeTo(mw: unknown, opts: MwOpts) {
        calls.push({ mw, opts })
      },
    },
  }
  return { client, calls }
}

const PREFIX_ENV = "NEXT_PUBLIC_API_PREFIX"

function withEnv<T>(value: string | undefined, fn: () => T): T {
  const prev = process.env[PREFIX_ENV]
  if (value === undefined) delete process.env[PREFIX_ENV]
  else process.env[PREFIX_ENV] = value
  try {
    return fn()
  } finally {
    if (prev === undefined) delete process.env[PREFIX_ENV]
    else process.env[PREFIX_ENV] = prev
  }
}

test("addApiPrefixMiddleware: no-op when NEXT_PUBLIC_API_PREFIX is empty", () => {
  withEnv("", () => {
    const { client, calls } = makeFakeClient()
    addApiPrefixMiddleware(client)
    assert.equal(calls.length, 0)
  })
})

test("addApiPrefixMiddleware: registers a finalizeRequest-after-auth middleware when prefix is set", () => {
  withEnv("/rustfs/api", () => {
    const { client, calls } = makeFakeClient()
    addApiPrefixMiddleware(client)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].opts.name, "addRustfsApiPrefix")
    assert.equal(calls[0].opts.relation, "after")
    assert.equal(calls[0].opts.toMiddleware, "awsAuthMiddleware")
  })
})

test("addApiPrefixMiddleware: prepends the prefix to request.path", async () => {
  await withEnv("/rustfs/api", async () => {
    const { client, calls } = makeFakeClient()
    addApiPrefixMiddleware(client)
    // biome-ignore lint/suspicious/noExplicitAny: AWS SDK middleware shape
    const mw = calls[0].mw as (next: any) => (args: any) => Promise<unknown>
    const handler = mw(async (args: unknown) => args)
    const args = { request: { path: "/foo/bar" } }
    await handler(args)
    assert.equal(args.request.path, "/rustfs/api/foo/bar")
  })
})

test("addApiPrefixMiddleware: normalizes a root path '/' to keep a single slash", async () => {
  await withEnv("/rustfs/api", async () => {
    const { client, calls } = makeFakeClient()
    addApiPrefixMiddleware(client)
    // biome-ignore lint/suspicious/noExplicitAny: AWS SDK middleware shape
    const mw = calls[0].mw as (next: any) => (args: any) => Promise<unknown>
    const handler = mw(async (args: unknown) => args)
    const args = { request: { path: "/" } }
    await handler(args)
    assert.equal(args.request.path, "/rustfs/api/")
  })
})

test("addApiPrefixMiddleware: idempotent (does not double-apply the prefix)", async () => {
  await withEnv("/rustfs/api", async () => {
    const { client, calls } = makeFakeClient()
    addApiPrefixMiddleware(client)
    // biome-ignore lint/suspicious/noExplicitAny: AWS SDK middleware shape
    const mw = calls[0].mw as (next: any) => (args: any) => Promise<unknown>
    const handler = mw(async (args: unknown) => args)
    const args = { request: { path: "/rustfs/api/foo" } }
    await handler(args)
    assert.equal(args.request.path, "/rustfs/api/foo")
  })
})
