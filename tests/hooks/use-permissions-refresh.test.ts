import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { act, createElement, useEffect, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import { flexRender, type CellContext } from "@tanstack/react-table"
import ts from "typescript"
import type { usePermissions as UsePermissions } from "../../hooks/use-permissions"
import type { PermissionRequest, PermissionResult } from "../../lib/effective-permissions"

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
      url = `data:text/javascript,${encodeURIComponent(`import { createElement } from "${import.meta.resolve("react")}"; export default function Link({children, ...props}) { return createElement("a", props, children) }`)}`
    }
    return `from "${url ?? (specifier.startsWith("@/") ? specifier : import.meta.resolve(specifier))}"`
  })
  return `data:text/javascript,${encodeURIComponent(rewritten)}`
}

const permissionsUrl = moduleUrl("hooks/use-permissions.tsx")
const overrides = {
  "@/hooks/use-permissions": permissionsUrl,
  "@/components/buckets/name-cell": moduleUrl("components/buckets/name-cell.tsx"),
}
const { PermissionsProvider, usePermissions } = (await import(
  permissionsUrl
)) as typeof import("../../hooks/use-permissions")
const { DashboardAuthGuard } = (await import(
  moduleUrl("components/dashboard-auth-guard.tsx", overrides)
)) as typeof import("../../components/dashboard-auth-guard")
const { default: BrowserPage } = (await import(
  moduleUrl("app/(dashboard)/browser/page.tsx", overrides)
)) as typeof import("../../app/(dashboard)/browser/page")
const { BucketList } = (await import(
  moduleUrl("components/buckets/list.tsx", overrides)
)) as typeof import("../../components/buckets/list")
const { useFirstAccessibleDashboardRoute } = (await import(
  moduleUrl("hooks/use-first-accessible-dashboard-route.ts", overrides)
)) as typeof import("../../hooks/use-first-accessible-dashboard-route")

const policy = JSON.stringify({
  Version: "2012-10-17",
  Statement: [{ Effect: "Allow", Action: ["console:Browser"], Resource: ["*"] }],
})
const accountInfo = (objects = 1) => ({ policy, buckets: [{ name: "test-bucket", objects, size: objects * 100 }] })
const temporaryFailures = [
  ["network", () => new TypeError("Network unavailable")],
  ["HTTP 500", () => Object.assign(new Error("Server error"), { status: 500 })],
  ["HTTP 503", () => Object.assign(new Error("Service unavailable"), { status: 503 })],
] as const
type Credentials = { AccessKeyId: string; SecretAccessKey: string; SessionToken: string }
type Api = {
  get: (path: string) => Promise<unknown>
  post?: (path: string, body: unknown) => Promise<unknown>
  resolveUrl?: (path: string) => string
}
type UsageRow = { Name: string; Count?: number; SizeBytes?: number }
type UsageTable = {
  data: UsageRow[]
  columns: {
    accessorKey?: string
    id?: string
    cell?: (context: { row: { original: UsageRow } }) => ReactNode
  }[]
}

function makeApi(
  isAdmin = false,
  effective?: (check: PermissionRequest) => PermissionResult | Promise<PermissionResult>,
  deferOwners = false,
) {
  const requests: ReturnType<typeof Promise.withResolvers<unknown>>[] = []
  const ownerRequests: ReturnType<typeof Promise.withResolvers<unknown>>[] = []
  const permissionRequests: PermissionRequest[] = []
  const api: Api = {
    get(path) {
      if (path === "/is-admin") return Promise.resolve({ is_admin: isAdmin })
      if (path === "/account/info") {
        const request = Promise.withResolvers<unknown>()
        ownerRequests.push(request)
        if (!deferOwners) request.resolve({ is_admin: isAdmin })
        return request.promise
      }
      assert.equal(path, "/accountinfo?view=snapshot")
      const request = Promise.withResolvers<unknown>()
      requests.push(request)
      return request.promise
    },
  }
  if (effective) {
    api.resolveUrl = (path) => `https://console.test/rustfs/admin/v3${path}`
    api.post = async (_path, body) => {
      const { checks } = body as { checks: PermissionRequest[] }
      permissionRequests.push(...checks)
      return {
        results: await Promise.all(checks.map(async (check) => ({ id: check.id, ...(await effective(check)) }))),
      }
    }
  }
  return { api, requests, ownerRequests, permissionRequests }
}

async function mountBrowser(
  t: TestContext,
  options: {
    surface?: "Browser" | "BucketList"
    bucketName?: string
    deniedPolicyStatus?: boolean
    isAdmin?: boolean
    search?: string
    effective?: (check: PermissionRequest) => PermissionResult | Promise<PermissionResult>
    deferOwners?: boolean
  } = {},
) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previousDescriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const initial = makeApi(options.isAdmin, options.effective, options.deferOwners)
  const pollTimers = new Map<ReturnType<Window["setInterval"]>, () => void>()
  const setInterval = browser.setInterval.bind(browser)
  const clearInterval = browser.clearInterval.bind(browser)
  t.mock.method(
    browser,
    "setInterval",
    (callback: Parameters<Window["setInterval"]>[0], delay?: number, ...args: unknown[]) => {
      if (delay !== 30000) return setInterval(callback, delay, ...args)
      const timer = setInterval(() => {}, delay)
      pollTimers.set(timer, () => callback(...args))
      return timer
    },
  )
  t.mock.method(browser, "clearInterval", (timer: ReturnType<Window["setInterval"]>) => {
    pollTimers.delete(timer)
    clearInterval(timer)
  })
  let api = initial.api
  let credentials: Credentials | undefined = { AccessKeyId: "first", SecretAccessKey: "secret", SessionToken: "token" }
  let isAdmin = false
  let pathname = "/browser"
  let searchParams = new URLSearchParams(options.search)
  let apiReady = true
  let s3Ready = true
  let mounts = 0
  let unmounts = 0
  let permissions: ReturnType<typeof UsePermissions>
  let firstRoute: ReturnType<typeof useFirstAccessibleDashboardRoute>
  const setIsAdmin = (value: boolean) => {
    isAdmin = value
  }
  const getIsLoggingOut = () => false
  const router = { replace: t.mock.fn(), push: t.mock.fn() }
  const listBuckets = t.mock.fn<(options?: { force?: boolean }) => Promise<unknown>>(async () => ({
    Buckets: [{ Name: options.bucketName ?? "test-bucket" }],
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
    useAuth: () => ({ isAuthenticated: !!credentials, credentials, isAdmin, setIsAdmin, getIsLoggingOut }),
    useApiOptional: () => api,
    useApiReady: () => ({ isReady: apiReady }),
    useS3Ready: () => ({ isReady: s3Ready }),
    useRouter: () => router,
    usePathname: () => pathname,
    useSearchParams: () => searchParams,
    useTranslation: () => ({
      t: (key: string, values: Record<string, unknown> = {}) =>
        Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), key),
    }),
    useBucket: () => ({ listBuckets, getBucketPolicyStatus }),
    useObject: () => ({}),
    useDataTable: (table: UsageTable) => ({ table }),
    Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) =>
      createElement("button", { onClick }, children),
    PageHeader: ({ children, actions }: { children: ReactNode; actions: ReactNode }) =>
      createElement("header", null, children, actions),
    DataTable: ({ table }: { table: UsageTable }) =>
      createElement(
        "div",
        null,
        createElement("output", null, JSON.stringify(table.data)),
        createElement(
          "table",
          null,
          createElement(
            "tbody",
            null,
            table.data.map((row) =>
              createElement(
                "tr",
                { key: row.Name, "data-bucket": row.Name },
                table.columns
                  .filter((column) => ["Name", "Count", "SizeBytes"].includes(column.accessorKey ?? column.id ?? ""))
                  .map((column) =>
                    createElement(
                      "td",
                      { key: column.accessorKey ?? column.id, "data-metric": column.accessorKey ?? column.id },
                      flexRender(column.cell, { row: { original: row } } as CellContext<UsageRow, unknown>),
                    ),
                  ),
              ),
            ),
          ),
        ),
      ),
    BrowserContent: ({ bucketName }: { bucketName: string }) =>
      createElement("article", { "data-scoped-bucket": bucketName }, bucketName),
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
            pathname.replace(/\/$/, "") === "/browser"
              ? options.surface === "BucketList"
                ? createElement(BucketList, {
                    title: "Buckets",
                    emptyDescription: "No buckets",
                    getBucketHref: (name) => `/custom-buckets/${encodeURIComponent(name)}`,
                  })
                : createElement(BrowserPage)
              : createElement("div", null, "Other page"),
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
    browser,
    container,
    router,
    listBuckets,
    getBucketPolicyStatus,
    requests: initial.requests,
    ownerRequests: initial.ownerRequests,
    permissionRequests: initial.permissionRequests,
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
    async resolveOwner(index: number, owner: boolean) {
      assert.ok(initial.ownerRequests[index], `owner request ${index} exists`)
      await act(async () => initial.ownerRequests[index].resolve({ is_admin: owner }))
    },
    async poll() {
      assert.equal(pollTimers.size, 1, "one active bucket usage polling timer")
      await act(async () => {
        for (const callback of pollTimers.values()) callback()
      })
    },
    async refresh() {
      const button = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Refresh")
      assert.ok(button, "Browser refresh button remains available")
      await act(async () => button.click())
    },
    async flushAnnouncements() {
      await act(async () => t.mock.timers.tick(0))
    },
    async navigate(path: string) {
      const url = new URL(path, "https://console.test")
      pathname = url.pathname
      searchParams = url.searchParams
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

test("the bucket query route consults that bucket before mounting callers without an identity scope", async (t) => {
  const mounted = await mountBrowser(t, {
    search: "bucket=alice-data&key=allowed%2F",
    effective: ({ action, bucket, prefix }) => ({
      decision: action === "s3:ListBucket" && bucket === "alice-data" && prefix === "allowed/" ? "allowed" : "denied",
    }),
  })
  await mounted.resolve(0, { policy: "" })
  assert.ok(mounted.container.querySelector('[data-scoped-bucket="alice-data"]'))
  assert.equal(mounted.router.replace.mock.callCount(), 0)
  assert.ok(
    mounted.permissionRequests.some(
      ({ action, bucket, prefix }) => action === "s3:ListBucket" && bucket === "alice-data" && prefix === "allowed/",
    ),
  )
})

test("a known directory remains accessible with only a bucket-policy upload hint", async (t) => {
  const mounted = await mountBrowser(t, {
    search: "bucket=alice-data&key=incoming%2F",
    effective: ({ action, bucket }) =>
      action === "s3:PutObject" && bucket === "alice-data"
        ? { decision: "unknown", potential: true }
        : { decision: "denied" },
  })
  await mounted.resolve(0, { policy: "" })
  assert.ok(mounted.container.querySelector('[data-scoped-bucket="alice-data"]'))
  assert.equal(mounted.router.replace.mock.callCount(), 0)
  assert.equal(
    await mounted.permissions.checkCapability("objects.upload", {
      bucket: "alice-data",
      objectKey: "incoming/file.txt",
    }),
    false,
  )
})

for (const outcome of ["allowed", "denied", "identity change", "route change"] as const) {
  test(`bucket-policy page state survives revalidation until ${outcome}`, async (t) => {
    let waiting = false
    let decision = "allowed"
    const gate = Promise.withResolvers<void>()
    const mounted = await mountBrowser(t, {
      search: "bucket=alice-data",
      effective: async ({ action, bucket }) => {
        if (waiting) await gate.promise
        return {
          decision:
            action === "s3:ListBucket" && bucket === "alice-data" ? (decision as "allowed" | "denied") : "denied",
        }
      },
    })
    await mounted.resolve(0, { policy: "" })
    const page = mounted.container.querySelector('[data-scoped-bucket="alice-data"]')!
    assert.ok(page)
    page.setAttribute("data-selection", "report.txt")
    waiting = true
    await act(async () => {
      void mounted.permissions.fetchUserPolicy()
    })
    await mounted.resolve(1, { policy: "" })
    assert.equal(mounted.container.querySelector('[data-scoped-bucket="alice-data"]'), page)
    assert.equal(page.getAttribute("data-selection"), "report.txt")
    assert.equal(
      mounted.permissions.canCapability("objects.delete", { bucket: "alice-data", objectKey: "report.txt" }),
      false,
    )
    if (outcome === "identity change") {
      await mounted.changeIdentity({ AccessKeyId: "other", SecretAccessKey: "secret", SessionToken: "other" })
      assert.equal(mounted.container.contains(page), false)
    } else if (outcome === "route change") {
      await mounted.navigate("/browser?bucket=other-bucket")
      assert.equal(mounted.container.contains(page), false)
    }
    if (outcome === "denied") decision = "denied"
    await act(async () => gate.resolve())
    if (outcome === "allowed") assert.equal(mounted.container.querySelector('[data-scoped-bucket="alice-data"]'), page)
    if (outcome === "denied") {
      assert.equal(mounted.container.contains(page), false)
      assert.ok(mounted.router.replace.mock.calls.some((call) => call.arguments[0] === "/403/"))
    }
  })
}

test("an exact-object query route checks object read permission rather than bucket listing", async (t) => {
  const mounted = await mountBrowser(t, {
    search: "bucket=alice-data&key=private%2Ffile.txt",
    effective: ({ action, bucket, object }) => ({
      decision:
        action === "s3:GetObject" && bucket === "alice-data" && object === "private/file.txt" ? "allowed" : "denied",
    }),
  })
  await mounted.resolve(0, { policy: "" })
  assert.ok(mounted.container.querySelector('[data-scoped-bucket="alice-data"]'))
  assert.equal(mounted.router.replace.mock.callCount(), 0)
  assert.ok(
    mounted.permissionRequests.some(({ action, object }) => action === "s3:GetObject" && object === "private/file.txt"),
  )
})

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

for (const surface of ["Browser", "BucketList"] as const) {
  for (const olderOutcome of ["success", "failure"] as const) {
    test(`${surface} ignores an older polling ${olderOutcome} after a newer manual refresh completes`, async (t) => {
      const errors = t.mock.method(console, "error", () => {})
      const mounted = await mountBrowser(t, { surface })
      await mounted.resolve(0)
      if (surface === "Browser") await mounted.resolve(1)
      const older = mounted.requests.length
      await mounted.poll()
      await mounted.refresh()
      assert.equal(mounted.requests.length, older + 2)
      const latest = accountInfo(90)
      await mounted.resolve(older + 1, latest)
      const revision = mounted.permissions.permissionVersion
      if (olderOutcome === "success") await mounted.resolve(older, accountInfo(7))
      else await act(async () => mounted.requests[older].reject(new Error("Older polling request failed")))

      assert.equal(mounted.permissions.userInfo, latest)
      assert.equal(mounted.permissions.permissionVersion, revision)
      assert.equal(mounted.permissions.isLoading, false)
      assert.equal(mounted.permissions.hasFetchedPolicy, true)
      assert.equal(JSON.parse(mounted.container.querySelector("output")!.textContent)[0].Count, 90)
      assert.equal(mounted.unmounts, 0)
      assert.equal(errors.mock.callCount(), 0)
    })
  }
}

for (const olderOutcome of ["success", "failure"] as const) {
  test(`an older ${olderOutcome} cannot clear loading or publish while the latest refresh is pending`, async (t) => {
    const errors = t.mock.method(console, "error", () => {})
    const mounted = await mountBrowser(t)
    await mounted.resolve(0)
    await mounted.resolve(1)
    const previous = mounted.permissions.userInfo
    const older = mounted.requests.length
    await mounted.poll()
    await mounted.refresh()
    if (olderOutcome === "success") await mounted.resolve(older, accountInfo(7))
    else await act(async () => mounted.requests[older].reject(new Error("Older polling request failed")))

    assert.equal(mounted.permissions.userInfo, previous)
    assert.equal(mounted.permissions.isLoading, true)
    assert.equal(mounted.permissions.hasFetchedPolicy, true)
    assert.equal(errors.mock.callCount(), 0)
    await mounted.resolve(older + 1, accountInfo(90))
    assert.equal(mounted.permissions.isLoading, false)
    assert.equal(JSON.parse(mounted.container.querySelector("output")!.textContent)[0].Count, 90)
  })
}

for (const olderOutcome of ["grant", "deny", "failure"] as const) {
  test(`an older owner ${olderOutcome} cannot replace the latest same-identity owner result`, async (t) => {
    const mounted = await mountBrowser(t, { deferOwners: true })
    await mounted.resolve(0)
    await mounted.resolve(1)
    const older = mounted.requests.length
    await mounted.poll()
    await mounted.refresh()
    await mounted.resolve(older + 1, accountInfo(90))
    const latestOwner = olderOutcome !== "grant"
    await mounted.resolveOwner(older + 1, latestOwner)
    const context = { bucket: "test-bucket", objectKey: "unfinished/" }
    assert.equal(mounted.permissions.canCapability("objects.forceCleanup", context), latestOwner)

    if (olderOutcome === "failure")
      await act(async () => mounted.ownerRequests[older].reject(new Error("Older owner request failed")))
    else await mounted.resolveOwner(older, olderOutcome === "grant")
    assert.equal(mounted.permissions.canCapability("objects.forceCleanup", context), latestOwner)
  })
}

for (const surface of ["Browser", "BucketList"] as const) {
  test(`${surface} renders complete bucket statistics without scanner details`, async (t) => {
    const mounted = await mountBrowser(t, { surface })
    const info = {
      policy,
      buckets: [
        {
          name: "test-bucket",
          objects: 90,
          size: 900,
          scan_progress: {
            stage: "scanning",
            updated_at: 1800000000000,
            objects: 7,
            size: 71,
            sources_observed: 1,
            sources_total: 2,
          },
        },
      ],
    }
    await mounted.resolve(0, info)
    if (surface === "Browser") await mounted.resolve(1, info)

    const row = JSON.parse(mounted.container.querySelector("output")!.textContent)[0]
    const name = mounted.container.querySelector('[data-bucket="test-bucket"] [data-metric="Name"]')!
    const count = mounted.container.querySelector('[data-bucket="test-bucket"] [data-metric="Count"]')!
    const capacity = mounted.container.querySelector('[data-bucket="test-bucket"] [data-metric="SizeBytes"]')!

    assert.deepEqual([row.Count, row.SizeBytes], [90, 900])
    assert.equal(name.textContent, "test-bucket")
    assert.equal(count.textContent, "90")
    assert.equal(capacity.textContent, "900.0 B")
    assert.equal(name.querySelector('[role="status"]'), null)
    assert.doesNotMatch(mounted.container.textContent, /scanned|Scan progress|Checkpoint|Last complete scan/)
    assert.equal(
      name.querySelector("a")?.getAttribute("href"),
      surface === "Browser" ? "/browser?bucket=test-bucket" : "/custom-buckets/test-bucket",
    )

    const link = name.querySelector("a")
    const requestIndex = mounted.requests.length
    await mounted.refresh()
    await mounted.resolve(requestIndex, info)
    assert.equal(name.querySelector("a"), link)
  })

  test(`${surface} renders missing bucket statistics as placeholders`, async (t) => {
    const mounted = await mountBrowser(t, { surface })
    const info = { policy, buckets: [{ name: "test-bucket" }] }
    await mounted.resolve(0, info)
    if (surface === "Browser") await mounted.resolve(1, info)

    const count = mounted.container.querySelector('[data-bucket="test-bucket"] [data-metric="Count"]')!
    const capacity = mounted.container.querySelector('[data-bucket="test-bucket"] [data-metric="SizeBytes"]')!

    assert.equal(count.textContent, "--")
    assert.equal(capacity.textContent, "--")
    assert.doesNotMatch(mounted.container.textContent, /Not measured|Unavailable/)
  })
}

test("the first denied policy never mounts Browser and redirects to forbidden", async (t) => {
  const mounted = await mountBrowser(t)
  await mounted.resolve(0, { policy: "" })
  assert.equal(mounted.mounts, 0)
  assert.deepEqual(
    mounted.router.replace.mock.calls.map((call) => call.arguments),
    [["/403/"]],
  )
})

for (const failure of ["revoked policy", "HTTP 401", "HTTP 403", "malformed policy", "invalid policy type"] as const) {
  test(`a refresh with ${failure} clears permission data and removes Browser`, async (t) => {
    const mounted = await mountBrowser(t)
    await mounted.resolve(0)
    if (failure === "HTTP 401" || failure === "HTTP 403") {
      const errors = t.mock.method(console, "error", () => {})
      await act(async () =>
        mounted.requests[1].reject(
          Object.assign(new Error("Access denied"), { status: failure === "HTTP 401" ? 401 : 403 }),
        ),
      )
      assert.equal(errors.mock.callCount(), 1)
    } else if (failure === "malformed policy" || failure === "invalid policy type") {
      const errors = t.mock.method(console, "error", () => {})
      await mounted.resolve(1, {
        ...accountInfo(90),
        policy: failure === "malformed policy" ? "{" : { toString: "invalid" },
      })
      assert.equal(errors.mock.callCount(), 1)
    } else await mounted.resolve(1, { policy: "" })
    if (failure !== "revoked policy") assert.equal(mounted.permissions.userInfo, null)
    assert.equal(mounted.permissions.userPolicy, null)
    assert.equal(mounted.container.querySelector("main"), null)
    assert.equal(mounted.unmounts, 1)
    assert.equal(mounted.firstRoute.route, "/403/")
    assert.deepEqual(
      mounted.router.replace.mock.calls.map((call) => call.arguments),
      [["/403/"]],
    )
  })
}

for (const status of [401, 403]) {
  test(`HTTP ${status} revalidates cached bucket-only access instead of retaining a stale grant`, async (t) => {
    t.mock.method(console, "error", () => {})
    let allowed = true
    const mounted = await mountBrowser(t, {
      search: "bucket=alice-data",
      effective: ({ action, bucket }) => ({
        decision: allowed && action === "s3:ListBucket" && bucket === "alice-data" ? "allowed" : "denied",
      }),
    })
    await mounted.resolve(0, { policy: "" })
    assert.ok(mounted.container.querySelector('[data-scoped-bucket="alice-data"]'))
    allowed = false
    const request = mounted.requests.length
    await act(async () => {
      void mounted.permissions.fetchUserPolicy()
    })
    await act(async () => mounted.requests[request].reject(Object.assign(new Error("Access denied"), { status })))
    assert.equal(mounted.permissions.userInfo, null)
    assert.equal(mounted.container.querySelector('[data-scoped-bucket="alice-data"]'), null)
    assert.ok(mounted.router.replace.mock.calls.some((call) => call.arguments[0] === "/403/"))
  })
}

for (const surface of ["Browser", "BucketList"] as const) {
  for (const [failure, makeError] of temporaryFailures) {
    test(`${surface} retains completed usage and permission after a ${failure} polling failure`, async (t) => {
      const errors = t.mock.method(console, "error", () => {})
      const mounted = await mountBrowser(t, { surface })
      const complete = accountInfo(90)
      await mounted.resolve(0, complete)
      if (surface === "Browser") await mounted.resolve(1, complete)
      const previousPolicy = mounted.permissions.userPolicy
      const revision = mounted.permissions.permissionVersion
      const page = mounted.container.querySelector("main")
      const request = mounted.requests.length
      await mounted.poll()
      await act(async () => mounted.requests[request].reject(makeError()))

      assert.equal(mounted.permissions.userInfo, complete)
      assert.equal(mounted.permissions.userPolicy, previousPolicy)
      assert.equal(mounted.permissions.permissionVersion, revision)
      assert.equal(mounted.permissions.isLoading, false)
      assert.equal(mounted.permissions.hasFetchedPolicy, true)
      assert.equal(mounted.container.querySelector("main"), page)
      assert.equal(JSON.parse(mounted.container.querySelector("output")!.textContent)[0].Count, 90)
      assert.equal(mounted.router.replace.mock.callCount(), 0)
      assert.equal(errors.mock.callCount(), 1)

      await mounted.refresh()
      await mounted.resolve(request + 1, accountInfo(120))
      assert.equal(JSON.parse(mounted.container.querySelector("output")!.textContent)[0].Count, 120)
    })
  }
}

for (const [failure, makeError] of temporaryFailures) {
  test(`an initial ${failure} account request remains unknown without fabricating a prior result`, async (t) => {
    t.mock.method(console, "error", () => {})
    const mounted = await mountBrowser(t)
    await act(async () => mounted.requests[0].reject(makeError()))
    assert.equal(mounted.permissions.userInfo, null)
    assert.equal(mounted.permissions.userPolicy, null)
    assert.equal(mounted.permissions.isLoading, false)
    assert.equal(mounted.permissions.hasFetchedPolicy, true)
    assert.equal(mounted.container.querySelector("main"), null)
  })
}

test("a temporary failure for a new identity never restores the previous identity's complete usage", async (t) => {
  t.mock.method(console, "error", () => {})
  const mounted = await mountBrowser(t)
  await mounted.resolve(0, accountInfo(90))
  await mounted.resolve(1, accountInfo(90))
  const request = mounted.requests.length
  await mounted.changeIdentity({ AccessKeyId: "second", SecretAccessKey: "secret", SessionToken: "token" })
  await act(async () => mounted.requests[request].reject(new TypeError("Network unavailable")))
  assert.equal(mounted.permissions.userInfo, null)
  assert.equal(mounted.permissions.userPolicy, null)
  assert.equal(mounted.permissions.canAccessPath("/browser"), false)
  assert.equal(mounted.container.querySelector("main"), null)
})

test("a newer transient failure retains the last complete value and still rejects an older in-flight result", async (t) => {
  t.mock.method(console, "error", () => {})
  const mounted = await mountBrowser(t)
  const complete = accountInfo(90)
  await mounted.resolve(0, complete)
  await mounted.resolve(1, complete)
  const older = mounted.requests.length
  await mounted.poll()
  await mounted.refresh()
  await act(async () => mounted.requests[older + 1].reject(Object.assign(new Error("Unavailable"), { status: 503 })))
  await mounted.resolve(older, accountInfo(7))
  assert.equal(mounted.permissions.userInfo, complete)
  assert.equal(JSON.parse(mounted.container.querySelector("output")!.textContent)[0].Count, 90)
  assert.equal(mounted.router.replace.mock.callCount(), 0)
})

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
