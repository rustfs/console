import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import ts from "typescript"
import type { usePermissions as UsePermissions } from "../../hooks/use-permissions"

type Permissions = ReturnType<typeof UsePermissions>
type Credentials = { AccessKeyId: string; SecretAccessKey: string; SessionToken: string }
type Api = { get: (path: string, options?: { suppress403Redirect?: boolean }) => Promise<unknown> }
const mocksKey = Symbol.for("force-cleanup-permission-contexts")

const source = ts.transpileModule(readFileSync(new URL("../../hooks/use-permissions.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const testSource = source.replace(/from "([^"]+)"/g, (match, specifier: string) => {
  const hook =
    specifier === "@/contexts/auth-context"
      ? "useAuth"
      : specifier === "@/contexts/api-context"
        ? "useApiOptional"
        : null
  const stub = hook
    ? `export function ${hook}() { return globalThis[Symbol.for("force-cleanup-permission-contexts")].${hook}() }`
    : null
  const url = stub
    ? `data:text/javascript,${encodeURIComponent(stub)}`
    : specifier.startsWith("@/")
      ? new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href
      : import.meta.resolve(specifier)
  return `from "${url}"`
})
const { PermissionsProvider, usePermissions } = (await import(
  `data:text/javascript,${encodeURIComponent(testSource)}`
)) as typeof import("../../hooks/use-permissions")
const target = { bucket: "test-bucket", objectKey: "folder/" }
const ordinaryPolicy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [{ Effect: "Allow", Action: ["s3:*", "admin:*"], Resource: ["*"] }],
})
const forcePolicy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [{ Effect: "Allow", Action: ["s3:DeleteObject", "s3:ForceDeleteObject"], Resource: ["*"] }],
})

async function mountPermissions(t: TestContext, initialApi: Api) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previousDescriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  let api = initialApi
  let credentials: Credentials | undefined = { AccessKeyId: "first", SecretAccessKey: "secret", SessionToken: "token" }
  let isAdmin = false
  const setIsAdmin = (value: boolean) => {
    isAdmin = value
  }
  Reflect.set(globalThis, mocksKey, {
    useApiOptional: () => api,
    useAuth: () => ({ isAdmin, isAuthenticated: !!credentials, credentials, setIsAdmin }),
  })

  let permissions: Permissions
  function Probe() {
    permissions = usePermissions()
    return null
  }
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  const render = async () => {
    await act(async () => root.render(createElement(PermissionsProvider, null, createElement(Probe))))
  }
  t.after(async () => {
    await act(async () => root.unmount())
    await browser.happyDOM.close()
    Reflect.deleteProperty(globalThis, mocksKey)
    for (const [key, descriptor] of previousDescriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  await render()
  return {
    get permissions() {
      return permissions!
    },
    async changeCredentials(next: Credentials | undefined, nextApi: Api = api) {
      credentials = next
      api = nextApi
      await render()
    },
  }
}

function makeApi(owner: unknown, policy: string = ordinaryPolicy): Api {
  return {
    async get(path) {
      if (path === "/is-admin") return { is_admin: true }
      if (path === "/account/info") return { is_admin: owner }
      return { policy }
    },
  }
}

test("IAM administrators keep ordinary capabilities but need an explicit force cleanup grant", async (t) => {
  const mounted = await mountPermissions(t, makeApi(false))
  assert.equal(mounted.permissions.isAdmin, true)
  assert.equal(mounted.permissions.canCapability("objects.delete", target), true)
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), false)
})

test("an IAM administrator can force cleanup with an explicit policy grant", async (t) => {
  const mounted = await mountPermissions(t, makeApi(false, forcePolicy))
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), true)
})

test("a confirmed owner can force cleanup only a non-root folder target", async (t) => {
  const mounted = await mountPermissions(t, makeApi(true))
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), true)
  for (const objectKey of ["", "/", "///", "file.txt"]) {
    assert.equal(mounted.permissions.canCapability("objects.forceCleanup", { ...target, objectKey }), false)
  }
})

test("a missing owner endpoint fails closed without a forbidden redirect", async (t) => {
  const api = makeApi(false)
  const options: { suppress403Redirect?: boolean }[] = []
  const mounted = await mountPermissions(t, {
    async get(path, requestOptions) {
      if (path === "/account/info") {
        options.push(requestOptions ?? {})
        throw new Error("AccessDenied")
      }
      return api.get(path, requestOptions)
    },
  })
  assert.deepEqual(options, [{ suppress403Redirect: true }])
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), false)
  assert.equal(mounted.permissions.canCapability("objects.delete", target), true)
})

test("non-boolean owner flags do not grant force cleanup", async (t) => {
  const mounted = await mountPermissions(t, makeApi("true"))
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), false)
})

test("an explicit grant works when the owner endpoint is unavailable", async (t) => {
  const api = makeApi(false, forcePolicy)
  const mounted = await mountPermissions(t, {
    async get(path, options) {
      if (path === "/account/info") throw new Error("NotFound")
      return api.get(path, options)
    },
  })
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), true)
})

test("a pending owner probe does not delay ordinary policy capabilities", async (t) => {
  const owner = Promise.withResolvers<unknown>()
  const mounted = await mountPermissions(t, {
    async get(path) {
      if (path === "/is-admin") return { is_admin: false }
      if (path === "/account/info") return owner.promise
      return { policy: ordinaryPolicy }
    },
  })
  assert.equal(mounted.permissions.hasFetchedPolicy, true)
  assert.equal(mounted.permissions.isLoading, false)
  assert.equal(mounted.permissions.canCapability("objects.delete", target), true)
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), false)
  await act(async () => owner.resolve({ is_admin: false }))
})

test("a late owner response cannot authorize changed credentials", async (t) => {
  const oldOwner = Promise.withResolvers<unknown>()
  const api = makeApi(false)
  const mounted = await mountPermissions(t, {
    get: (path, options) => (path === "/account/info" ? oldOwner.promise : api.get(path, options)),
  })
  await mounted.changeCredentials({ AccessKeyId: "second", SecretAccessKey: "other", SessionToken: "new-token" }, api)
  assert.equal(mounted.permissions.hasFetchedPolicy, true)
  await act(async () => oldOwner.resolve({ is_admin: true }))
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), false)
})

test("changing only the signing secret clears the owner grant", async (t) => {
  const nextOwner = Promise.withResolvers<unknown>()
  let first = true
  const api = makeApi(true)
  const mounted = await mountPermissions(t, {
    get(path, options) {
      if (path === "/account/info" && !first) return nextOwner.promise
      return api.get(path, options)
    },
  })
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), true)
  first = false
  await mounted.changeCredentials({ AccessKeyId: "first", SecretAccessKey: "changed", SessionToken: "token" })
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), false)
  await act(async () => nextOwner.resolve({ is_admin: false }))
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), false)
})

test("logout clears the owner grant", async (t) => {
  const mounted = await mountPermissions(t, makeApi(true))
  await mounted.changeCredentials(undefined)
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), false)
})

test("switching the API client clears the previous server's owner grant", async (t) => {
  const mounted = await mountPermissions(t, makeApi(true))
  await mounted.changeCredentials(
    { AccessKeyId: "first", SecretAccessKey: "secret", SessionToken: "token" },
    makeApi(false),
  )
  assert.equal(mounted.permissions.canCapability("objects.forceCleanup", target), false)
})
