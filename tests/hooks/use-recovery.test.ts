import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import ts from "typescript"
import { ApiClient } from "../../lib/api-client"
import { RecoveryError } from "../../lib/recovery"

const contextKey = Symbol.for("recovery-hook-api")
const context = { api: null as ApiClient | null, isReady: true }
Reflect.set(globalThis, contextKey, context)
const dataUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`
const contextUrl = dataUrl('export function useApiReady() { return globalThis[Symbol.for("recovery-hook-api")] }')
const source = ts.transpileModule(readFileSync(new URL("../../hooks/use-recovery.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText
const hooks = (await import(
  dataUrl(
    source.replace(
      /from "([^"]+)"/g,
      (_, specifier: string) =>
        `from "${specifier === "@/contexts/api-context" ? contextUrl : specifier === "react" ? import.meta.resolve("react") : specifier}"`,
    ),
  )
)) as typeof import("../../hooks/use-recovery")

async function mount<T>(t: TestContext, renderHook: () => T) {
  const browser = new Window()
  let visibility = "visible"
  Object.defineProperty(browser.document, "visibilityState", { configurable: true, get: () => visibility })
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previous = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  let current: T
  let active = true
  function Harness() {
    current = renderHook()
    return null
  }
  const render = () => act(async () => root.render(createElement(Harness)))
  const unmount = async () => {
    if (!active) return
    active = false
    await act(async () => root.unmount())
  }
  t.after(async () => {
    await unmount()
    await browser.happyDOM.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
    context.api = null
    context.isReady = true
  })
  await render()
  return {
    result: () => current!,
    render,
    unmount,
    visibility: async (value: string) => {
      visibility = value
      await act(async () => browser.document.dispatchEvent(new browser.Event("visibilitychange")))
    },
  }
}

test("recovery reads are singleflight and repeated refresh does not overlap", async (t) => {
  const pending = Promise.withResolvers<string>()
  let calls = 0
  const loader = async () => {
    calls++
    return pending.promise
  }
  const hook = await mount(t, () => hooks.useRecoveryRead(loader, { enabled: true, identity: "a" }))
  void hook.result().refresh()
  void hook.result().refresh()
  assert.equal(hook.result().loading, true)
  assert.equal(calls, 1)
  await act(async () => pending.resolve("observed"))
  assert.equal(hook.result().data, "observed")
})

test("hiding a page cancels reads, rejects late data, and refreshes when visible", async (t) => {
  const old = Promise.withResolvers<string>()
  let calls = 0
  let signal: AbortSignal | undefined
  const loader = (current: AbortSignal) => {
    signal = current
    return ++calls === 1 ? old.promise : Promise.resolve("fresh")
  }
  const hook = await mount(t, () => hooks.useRecoveryRead(loader, { enabled: true, identity: "a" }))
  await hook.visibility("hidden")
  assert.equal(signal?.aborted, true)
  await act(async () => old.resolve("late"))
  assert.equal(hook.result().data, null)
  await hook.visibility("visible")
  assert.equal(hook.result().data, "fresh")
  assert.equal(calls, 2)
})

test("authentication identity changes clear previous data and cancel the previous request", async (t) => {
  const old = Promise.withResolvers<string>()
  let identity = "first"
  let calls = 0
  let oldSignal: AbortSignal | undefined
  const loader = (signal: AbortSignal) => {
    calls++
    if (calls === 1) return Promise.resolve("old identity")
    if (calls === 2) {
      oldSignal = signal
      return old.promise
    }
    return Promise.resolve("new identity")
  }
  const hook = await mount(t, () => hooks.useRecoveryRead(loader, { enabled: true, identity }))
  await act(async () => {
    void hook.result().refresh()
  })
  identity = "second"
  await hook.render()
  assert.equal(oldSignal?.aborted, true)
  assert.equal(hook.result().data, "new identity")
  await act(async () => old.resolve("stale privileged response"))
  assert.equal(hook.result().data, "new identity")
})

test("disabled reads clear previous observations and cannot be manually refreshed", async (t) => {
  let enabled = true
  let calls = 0
  const loader = async () => {
    calls++
    return "private"
  }
  const hook = await mount(t, () => hooks.useRecoveryRead(loader, { enabled, identity: "same" }))
  enabled = false
  await hook.render()
  await hook.result().refresh()
  assert.equal(hook.result().data, null)
  assert.equal(calls, 1)
})

test("unmount cancels pending reads", async (t) => {
  let signal: AbortSignal | undefined
  const loader = (value: AbortSignal) => {
    signal = value
    return new Promise<string>(() => {})
  }
  const hook = await mount(t, () => hooks.useRecoveryRead(loader, { enabled: true, identity: "a" }))
  await hook.unmount()
  assert.equal(signal?.aborted, true)
})

test("failed refresh retains stale data and exposes a safe error", async (t) => {
  let calls = 0
  const loader = async () => {
    if (++calls > 1) throw new Error("sensitive arbitrary server message")
    return "last observation"
  }
  const hook = await mount(t, () => hooks.useRecoveryRead(loader, { enabled: true, identity: "a" }))
  await act(async () => hook.result().refresh())
  assert.equal(hook.result().data, "last observation")
  assert.equal(hook.result().stale, true)
  assert.equal(hook.result().error?.code, "network")
  assert.equal(hook.result().error?.message.includes("sensitive"), false)
})

test("summary-style polling backs off on failures and pauses while hidden", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  let calls = 0
  const loader = async () => {
    calls++
    throw new RecoveryError("network")
  }
  const hook = await mount(t, () => hooks.useRecoveryRead(loader, { enabled: true, identity: "a", pollIntervalMs: 10 }))
  assert.equal(calls, 1)
  await act(async () => t.mock.timers.tick(10))
  assert.equal(calls, 1)
  await act(async () => t.mock.timers.tick(10))
  assert.equal(calls, 2)
  await hook.visibility("hidden")
  await act(async () => t.mock.timers.tick(100))
  assert.equal(calls, 2)
})

function api(fetcher: () => Promise<Response>) {
  return new ApiClient({ fetch: fetcher }, { baseUrl: "https://server.test/rustfs/admin/v3" })
}

test("RecoveryClient scope is stable per API instance and changes with authentication", async (t) => {
  context.api = api(async () => Response.json({}))
  const hook = await mount(t, () => hooks.useRecoveryClient())
  const first = hook.result()
  await hook.render()
  assert.equal(hook.result(), first)
  context.api = api(async () => Response.json({}))
  await hook.render()
  assert.notEqual(hook.result()?.scopeId, first?.scopeId)
  context.isReady = false
  await hook.render()
  assert.equal(hook.result(), null)
})

test("MRF list stays on demand and permission-disabled load never sends a request", async (t) => {
  let calls = 0
  let enabled = false
  context.api = api(async () => {
    calls++
    return Response.json({})
  })
  const hook = await mount(t, () => hooks.useMrfList({ enabled }))
  await hook.result().load()
  assert.equal(calls, 0)
  enabled = true
  await hook.render()
  assert.equal(calls, 0)
  await act(async () => hook.result().load())
  assert.equal(calls, 1)
})

test("page hiding and unmount do not cancel an already submitted action", async (t) => {
  let signal: AbortSignal | null | undefined
  const pending = Promise.withResolvers<Response>()
  context.api = new ApiClient(
    {
      fetch: async (_url, init) => {
        signal = init?.signal
        return pending.promise
      },
    },
    { baseUrl: "https://server.test/rustfs/admin/v3" },
  )
  const hook = await mount(t, () => hooks.useRecoveryClient())
  const client = hook.result()!
  const nodeId = "a".repeat(64)
  const responsibilityId = "11111111-1111-1111-1111-111111111111"
  const action = client.mrfAction({
    nodeId,
    request: { action: "refresh", responsibilityId, expectedBucketIncarnationId: null },
  })
  await hook.visibility("hidden")
  await hook.unmount()
  assert.equal(signal?.aborted, false)
  pending.resolve(
    Response.json({
      contractVersion: 1,
      topologyFingerprint: "topology",
      observationStartedAtMs: 1,
      observationFinishedAtMs: 2,
      expectedNodes: 1,
      pageComplete: true,
      nextCursor: null,
      nodes: [
        {
          nodeId,
          host: "node",
          state: "ok",
          reply: {
            result: "action",
            action: { responsibilityId, state: "refreshed", dataVerified: false, durableResponsibilityRetained: true },
          },
        },
      ],
    }),
  )
  await action
})
