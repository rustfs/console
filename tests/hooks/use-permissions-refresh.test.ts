import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { act, createElement, useEffect, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import ts from "typescript"
import type { usePermissions as UsePermissions } from "../../hooks/use-permissions"

const mocksKey = Symbol.for("browser-permission-refresh")
const mockExports: Record<string, string[]> = {
  "@/contexts/auth-context": ["useAuth"],
  "@/contexts/api-context": ["useApiOptional", "useApiReady"],
  "@/contexts/s3-context": ["useS3Ready"],
  "next/navigation": ["useRouter", "usePathname", "useSearchParams"],
  "react-i18next": ["useTranslation"],
  "@remixicon/react": ["RiAddLine", "RiRefreshLine", "RiArchiveLine", "RiSettings5Line", "RiDeleteBin5Line"],
  "@/components/ui/button": ["Button"],
  "@/components/ui/spinner": ["Spinner"],
  "@/components/search-input": ["SearchInput"],
  "@/components/page": ["Page"],
  "@/components/page-header": ["PageHeader"],
  "@/components/data-table/data-table": ["DataTable"],
  "@/hooks/use-data-table": ["useDataTable"],
  "@/components/buckets/new-form": ["BucketNewForm"],
  "@/components/buckets/usage-overview": ["BucketUsageOverview"],
  "@/hooks/use-bucket": ["useBucket"],
  "@/hooks/use-object": ["useObject"],
  "@/lib/feedback/dialog": ["useDialog"],
  "@/lib/feedback/message": ["useMessage"],
  "./content": ["BrowserContent"],
}

function moduleUrl(path: string, overrides: Record<string, string> = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const rewritten = source.replace(/from "([^"]+)"/g, (match, specifier: string) => {
    let url = overrides[specifier]
    if (!url && mockExports[specifier]) {
      const stub = mockExports[specifier]
        .map(
          (name) =>
            `export function ${name}(...args) { return globalThis[Symbol.for("browser-permission-refresh")].${name}(...args) }`,
        )
        .join("\n")
      url = `data:text/javascript,${encodeURIComponent(stub)}`
    }
    if (!url && specifier === "next/link") {
      url = `data:text/javascript,${encodeURIComponent("export default function Link() { return null }")}`
    }
    return `from "${url ?? (specifier.startsWith("@/") ? specifier : import.meta.resolve(specifier))}"`
  })
  return `data:text/javascript,${encodeURIComponent(rewritten)}`
}

const permissionsUrl = moduleUrl("hooks/use-permissions.tsx")
const overrides = { "@/hooks/use-permissions": permissionsUrl }
const { PermissionsProvider, usePermissions } = (await import(
  permissionsUrl
)) as typeof import("../../hooks/use-permissions")
const { DashboardAuthGuard } = (await import(
  moduleUrl("components/dashboard-auth-guard.tsx", overrides)
)) as typeof import("../../components/dashboard-auth-guard")
const { default: BrowserPage } = (await import(
  moduleUrl("app/(dashboard)/browser/page.tsx", overrides)
)) as typeof import("../../app/(dashboard)/browser/page")
const { useFirstAccessibleDashboardRoute } = (await import(
  moduleUrl("hooks/use-first-accessible-dashboard-route.ts", overrides)
)) as typeof import("../../hooks/use-first-accessible-dashboard-route")

const policy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [{ Effect: "Allow", Action: ["console:Browser"], Resource: ["*"] }],
})
const accountInfo = (objects = 1) => ({ policy, buckets: [{ name: "test-bucket", objects, size: objects * 100 }] })
type Credentials = { AccessKeyId: string; SecretAccessKey: string; SessionToken: string }
type Api = { get: (path: string) => Promise<unknown> }

function makeApi(isAdmin = false) {
  const requests: ReturnType<typeof Promise.withResolvers<unknown>>[] = []
  const api: Api = {
    get(path) {
      if (path === "/is-admin" || path === "/account/info") return Promise.resolve({ is_admin: isAdmin })
      assert.equal(path, "/accountinfo")
      const request = Promise.withResolvers<unknown>()
      requests.push(request)
      return request.promise
    },
  }
  return { api, requests }
}

async function mountBrowser(t: TestContext, options: { deniedPolicyStatus?: boolean; isAdmin?: boolean } = {}) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previousDescriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const initial = makeApi(options.isAdmin)
  let api = initial.api
  let credentials: Credentials | undefined = { AccessKeyId: "first", SecretAccessKey: "secret", SessionToken: "token" }
  let isAdmin = false
  let pathname = "/browser"
  let apiReady = true
  let s3Ready = true
  let mounts = 0
  let unmounts = 0
  let permissions: ReturnType<typeof UsePermissions>
  let firstRoute: ReturnType<typeof useFirstAccessibleDashboardRoute>
  const setIsAdmin = (value: boolean) => {
    isAdmin = value
  }
  const router = { replace: t.mock.fn(), push: t.mock.fn() }
  const listBuckets = t.mock.fn<(options?: { force?: boolean }) => Promise<unknown>>(async () => ({
    Buckets: [{ Name: "test-bucket" }],
  }))
  const getBucketPolicyStatus = t.mock.fn(async () => {
    if (options.deniedPolicyStatus) throw new Error("AccessDenied")
    return { PolicyStatus: { IsPublic: false } }
  })
  const mocks = {
    ...Object.fromEntries(
      Object.values(mockExports)
        .flat()
        .map((name) => [name, () => null]),
    ),
    useAuth: () => ({ isAuthenticated: !!credentials, credentials, isAdmin, setIsAdmin }),
    useApiOptional: () => api,
    useApiReady: () => ({ isReady: apiReady }),
    useS3Ready: () => ({ isReady: s3Ready }),
    useRouter: () => router,
    usePathname: () => pathname,
    useSearchParams: () => new URLSearchParams(),
    useTranslation: () => ({ t: (key: string) => key }),
    useBucket: () => ({ listBuckets, getBucketPolicyStatus }),
    useObject: () => ({}),
    useDataTable: (table: { data: unknown[] }) => ({ table }),
    Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) =>
      createElement("button", { onClick }, children),
    PageHeader: ({ children, actions }: { children: ReactNode; actions: ReactNode }) =>
      createElement("header", null, children, actions),
    DataTable: ({ table }: { table: { data: unknown[] } }) => createElement("output", null, JSON.stringify(table.data)),
    Page: function Page({ children }: { children: ReactNode }) {
      useEffect(() => {
        mounts += 1
        return () => {
          unmounts += 1
        }
      }, [])
      return createElement("main", null, children)
    },
  }
  Reflect.set(globalThis, mocksKey, mocks)
  function Probe() {
    permissions = usePermissions()
    firstRoute = useFirstAccessibleDashboardRoute()
    return null
  }
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  const render = async () => {
    await act(async () =>
      root.render(
        createElement(
          PermissionsProvider,
          null,
          createElement(Probe),
          createElement(
            DashboardAuthGuard,
            null,
            pathname === "/browser" ? createElement(BrowserPage) : createElement("div", null, "Other page"),
          ),
        ),
      ),
    )
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
    container,
    router,
    listBuckets,
    getBucketPolicyStatus,
    requests: initial.requests,
    get mounts() {
      return mounts
    },
    get unmounts() {
      return unmounts
    },
    get permissions() {
      return permissions!
    },
    get firstRoute() {
      return firstRoute!
    },
    async resolve(index: number, info: unknown = accountInfo()) {
      assert.ok(initial.requests[index], `accountinfo request ${index} exists`)
      await act(async () => initial.requests[index].resolve(info))
    },
    async refresh() {
      const button = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Refresh")
      assert.ok(button, "Browser refresh button remains available")
      await act(async () => button.click())
    },
    async navigate(path: string) {
      pathname = path
      await render()
    },
    async changeIdentity(next: Credentials | undefined, nextApi: Api = api) {
      credentials = next
      api = nextApi
      await render()
    },
    async readiness(nextApiReady: boolean, nextS3Ready: boolean) {
      apiReady = nextApiReady
      s3Ready = nextS3Ready
      await render()
    },
  }
}

for (const deniedPolicyStatus of [false, true]) {
  test(`Browser stays mounted during permission refresh when bucket policy status ${deniedPolicyStatus ? "is denied" : "succeeds"}`, async (t) => {
    const mounted = await mountBrowser(t, { deniedPolicyStatus })
    assert.ok(mounted.container.querySelector('[role="status"]'))
    assert.equal(mounted.listBuckets.mock.callCount(), 0)
    assert.equal(mounted.firstRoute.isReady, false)
    await mounted.resolve(0)
    assert.ok(mounted.container.querySelector("main"), "background refresh retains the Browser")
    assert.equal(mounted.firstRoute.route, "/browser")
    assert.equal(mounted.permissions.isLoading, true)
    await mounted.resolve(1)
    assert.deepEqual([mounted.mounts, mounted.unmounts, mounted.requests.length], [1, 0, 2])
    assert.equal(mounted.listBuckets.mock.callCount(), 1)
    assert.equal(mounted.getBucketPolicyStatus.mock.callCount(), 1)
    assert.equal(mounted.router.replace.mock.callCount(), 0)
    const rows = JSON.parse(mounted.container.querySelector("output")!.textContent)
    assert.equal(rows[0].IsPublic, deniedPolicyStatus ? undefined : false)
  })
}

test("manual refresh and returning to Browser still force fresh buckets and account usage", async (t) => {
  const mounted = await mountBrowser(t)
  await mounted.resolve(0)
  await mounted.resolve(1)
  await mounted.refresh()
  assert.equal(mounted.mounts, 1)
  assert.equal(mounted.firstRoute.isReady, true)
  await mounted.resolve(2, accountInfo(8))
  assert.equal(JSON.parse(mounted.container.querySelector("output")!.textContent)[0].Count, 8)
  await mounted.navigate("/account")
  await mounted.navigate("/browser")
  await mounted.resolve(3, accountInfo(12))
  assert.equal(JSON.parse(mounted.container.querySelector("output")!.textContent)[0].Count, 12)
  assert.deepEqual(
    mounted.listBuckets.mock.calls.map((call) => call.arguments[0]),
    [{ force: true }, { force: true }, { force: true }],
  )
  assert.deepEqual([mounted.mounts, mounted.unmounts, mounted.requests.length], [2, 1, 4])
})

test("the first denied policy never mounts Browser and redirects to forbidden", async (t) => {
  const mounted = await mountBrowser(t)
  await mounted.resolve(0, { policy: "" })
  assert.equal(mounted.mounts, 0)
  assert.deepEqual(
    mounted.router.replace.mock.calls.map((call) => call.arguments),
    [["/403/"]],
  )
})

for (const fails of [false, true]) {
  test(`a refresh ${fails ? "failure" : "revoking Browser permission"} removes Browser and redirects to forbidden`, async (t) => {
    const mounted = await mountBrowser(t)
    await mounted.resolve(0)
    if (fails) {
      const errors = t.mock.method(console, "error", () => {})
      await act(async () => mounted.requests[1].reject(new Error("Policy unavailable")))
      assert.equal(errors.mock.callCount(), 1)
    } else await mounted.resolve(1, { policy: "" })
    assert.equal(mounted.container.querySelector("main"), null)
    assert.equal(mounted.unmounts, 1)
    assert.equal(mounted.firstRoute.route, "/403/")
    assert.deepEqual(
      mounted.router.replace.mock.calls.map((call) => call.arguments),
      [["/403/"]],
    )
  })
}

for (const change of ["access key", "secret", "session token", "api", "logout"] as const) {
  test(`${change} discards an old in-flight policy refresh`, async (t) => {
    const mounted = await mountBrowser(t)
    await mounted.resolve(0)
    const next = makeApi()
    const credentials =
      change === "logout"
        ? undefined
        : {
            AccessKeyId: change === "access key" ? "second" : "first",
            SecretAccessKey: change === "secret" ? "changed" : "secret",
            SessionToken: change === "session token" ? "changed" : "token",
          }
    await mounted.changeIdentity(credentials, change === "api" ? next.api : undefined)
    await mounted.resolve(1)
    assert.equal(mounted.permissions.hasFetchedPolicy, false)
    assert.equal(mounted.permissions.canAccessPath("/browser"), false)
    assert.equal(mounted.container.querySelector("main"), null)
    if (change === "logout") {
      assert.deepEqual(
        mounted.router.replace.mock.calls.map((call) => call.arguments),
        [["/auth/login/?unauthorized=true"]],
      )
    } else {
      const requests = change === "api" ? next.requests : mounted.requests.slice(2)
      assert.equal(requests.length, 1)
      await act(async () => requests[0].resolve({ policy: "" }))
      assert.deepEqual(
        mounted.router.replace.mock.calls.map((call) => call.arguments),
        [["/403/"]],
      )
    }
  })
}

test("administrators can mount Browser before account policy resolves", async (t) => {
  const mounted = await mountBrowser(t, { isAdmin: true })
  assert.ok(mounted.container.querySelector("main"))
  assert.equal(mounted.firstRoute.route, "/browser")
  for (let index = 0; index < mounted.requests.length; index += 1) await mounted.resolve(index, { policy: "" })
  assert.deepEqual([mounted.mounts, mounted.unmounts], [1, 0])
  assert.equal(mounted.router.replace.mock.callCount(), 0)
})

test("API and S3 readiness continue to block guarded content", async (t) => {
  const mounted = await mountBrowser(t)
  await mounted.readiness(false, true)
  await mounted.resolve(0)
  assert.equal(mounted.mounts, 0)
  await mounted.readiness(true, false)
  assert.equal(mounted.mounts, 0)
  await mounted.readiness(true, true)
  await mounted.resolve(1)
  assert.equal(mounted.mounts, 1)
})
