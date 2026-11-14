import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import ts from "typescript"
import type { PermissionRequest } from "../../lib/effective-permissions"
import type { usePermissions as UsePermissions } from "../../hooks/use-permissions"

const mocksKey = Symbol.for("effective-permission-hook-fixture")
const source = ts
  .transpileModule(readFileSync(new URL("../../hooks/use-permissions.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  })
  .outputText.replace(/from "([^"]+)"/g, (_, specifier: string) => {
    const hook =
      specifier === "@/contexts/auth-context"
        ? "useAuth"
        : specifier === "@/contexts/api-context"
          ? "useApiOptional"
          : null
    const stub = hook
      ? `export function ${hook}() { return globalThis[Symbol.for("effective-permission-hook-fixture")].${hook}() }`
      : null
    const url = stub
      ? `data:text/javascript,${encodeURIComponent(stub)}`
      : specifier.startsWith("@/")
        ? new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href
        : import.meta.resolve(specifier)
    return `from "${url}"`
  })
const { PermissionsProvider, usePermissions } = (await import(
  `data:text/javascript,${encodeURIComponent(source)}`
)) as typeof import("../../hooks/use-permissions")
const target = { bucket: "alice-data", objectKey: "/file.txt" }
const readPolicy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Action: ["s3:GetObject", "s3:ListBucket"],
      Resource: ["arn:aws:s3:::alice-data", "arn:aws:s3:::alice-data/*"],
    },
  ],
})

async function mount(
  t: TestContext,
  decision: (request: PermissionRequest) => { decision: string; potential?: boolean },
  identityPolicy = readPolicy,
) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previous = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const requests: PermissionRequest[] = []
  const api = {
    resolveUrl: (path: string) => `https://fixture.invalid${path}`,
    async get(path: string) {
      return path === "/accountinfo" ? { policy: identityPolicy } : { is_admin: false }
    },
    async post(_path: string, body: { checks: PermissionRequest[] }, options: { suppressBodyLogging?: boolean }) {
      assert.equal(options.suppressBodyLogging, true)
      requests.push(...body.checks)
      return { results: body.checks.map((request) => ({ id: request.id, ...decision(request) })) }
    },
  }
  let credentials = { AccessKeyId: "fixture-alice", SecretAccessKey: "fixture-secret", SessionToken: "fixture-token" }
  const setIsAdmin = () => {}
  Reflect.set(globalThis, mocksKey, {
    useApiOptional: () => api,
    useAuth: () => ({ isAdmin: false, isAuthenticated: true, credentials, setIsAdmin }),
  })
  let permissions!: ReturnType<typeof UsePermissions>
  function Probe() {
    permissions = usePermissions()
    return null
  }
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  const render = async () =>
    act(async () => root.render(createElement(PermissionsProvider, null, createElement(Probe))))
  await render()
  t.after(async () => {
    await act(async () => root.unmount())
    await browser.happyDOM.close()
    Reflect.deleteProperty(globalThis, mocksKey)
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  return {
    get permissions() {
      return permissions
    },
    requests,
    async changeIdentity() {
      credentials = { ...credentials, AccessKeyId: "fixture-bob" }
      await render()
    },
  }
}

test("a bucket-policy allowance enables an exact operation absent from the identity policy", async (t) => {
  const mounted = await mount(t, () => ({ decision: "allowed" }))
  let allowed = false
  await act(async () => {
    allowed = await mounted.permissions.checkCapability("objects.upload", target)
  })
  assert.equal(allowed, true)
  assert.equal(mounted.permissions.canCapability("objects.upload", target), true)
  assert.ok(mounted.requests.some(({ action, object }) => action === "s3:PutObject" && object === "/file.txt"))
})

test("an explicitly empty warehouse object retains the bucket ARN on a legacy server", async (t) => {
  const mounted = await mount(
    t,
    () => {
      throw Object.assign(new Error("Unsupported"), { status: 404 })
    },
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Action: ["admin:GetTableNamespace"], Resource: ["arn:aws:s3:::alice-data"] }],
    }),
  )
  let allowed = false
  await act(async () => {
    allowed = await mounted.permissions.checkAction("admin:GetTableNamespace", { bucket: "alice-data", objectKey: "" })
  })
  assert.equal(allowed, true)
  assert.equal(mounted.permissions.canAction("admin:GetTableNamespace", { bucket: "alice-data", objectKey: "" }), true)
  assert.ok(mounted.requests.some((request) => request.object === ""))
})

test("a server-side session or condition denial overrides a broad identity projection", async (t) => {
  const mounted = await mount(t, () => ({ decision: "denied" }))
  let allowed = true
  await act(async () => {
    allowed = await mounted.permissions.checkCapability("objects.download", target)
  })
  assert.equal(allowed, false)
  assert.equal(mounted.permissions.canCapability("objects.download", target), false)
})

test("an unknown-target hint shows an entry point but cannot authorize a concrete write", async (t) => {
  const mounted = await mount(t, () => ({ decision: "unknown", potential: true }))
  await act(async () => {
    await mounted.permissions.loadAction({ action: "s3:PutObject", context: { bucket: "alice-data" } })
  })
  assert.equal(mounted.permissions.mayCapability("objects.upload", { bucket: "alice-data" }), true)
  let allowed = true
  await act(async () => {
    allowed = await mounted.permissions.checkCapability("objects.upload", target)
  })
  assert.equal(allowed, false)
})

test("a task's old checker cannot inherit the next user's credentials", async (t) => {
  const mounted = await mount(t, () => ({ decision: "allowed" }))
  const oldChecker = mounted.permissions.checkCapability
  await mounted.changeIdentity()
  const before = mounted.requests.length
  assert.equal(await oldChecker("objects.upload", target), false)
  assert.equal(mounted.requests.length, before)
})
