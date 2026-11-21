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
import { formatDateTime } from "../../lib/functions"

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
const usageValueUrl = moduleUrl("components/buckets/usage-value.tsx")
const overrides = {
  "@/hooks/use-permissions": permissionsUrl,
  "@/components/buckets/usage-value": usageValueUrl,
  "@/components/buckets/name-cell": moduleUrl("components/buckets/name-cell.tsx", {
    "@/components/buckets/usage-value": usageValueUrl,
  }),
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
) {
  const requests: ReturnType<typeof Promise.withResolvers<unknown>>[] = []
  const permissionRequests: PermissionRequest[] = []
  const api: Api = {
    get(path) {
      if (path === "/is-admin" || path === "/account/info") return Promise.resolve({ is_admin: isAdmin })
      assert.equal(path, "/accountinfo")
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
  return { api, requests, permissionRequests }
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
  } = {},
) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previousDescriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const initial = makeApi(options.isAdmin, options.effective)
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
  for (const hasCompleteUsage of [false, true]) {
    test(`${surface} ${hasCompleteUsage ? "retains complete usage alongside" : "shows only"} replaceable scanner progress`, async (t) => {
      t.mock.timers.enable({ apis: ["setTimeout"] })
      const mounted = await mountBrowser(t, { surface })
      const info = (objects: number, size: number) => ({
        policy,
        buckets: [
          {
            name: "test-bucket",
            ...(hasCompleteUsage
              ? { objects: 90, size: 900, usage_value_state: "carried", usage_updated_at: 1700000000000 }
              : {}),
            scan_progress: {
              stage: "scanning",
              updated_at: 1800000000000,
              objects,
              size,
              sources_observed: 1,
              sources_total: 2,
            },
          },
        ],
      })
      let liveStatus: ReturnType<typeof mounted.container.querySelector> = null
      const assertSample = (objects: number, size: number) => {
        const row = JSON.parse(mounted.container.querySelector("output")!.textContent)[0]
        const name = mounted.container.querySelector('[data-bucket="test-bucket"] [data-metric="Name"]')!
        const count = mounted.container.querySelector('[data-bucket="test-bucket"] [data-metric="Count"]')!
        const capacity = mounted.container.querySelector('[data-bucket="test-bucket"] [data-metric="SizeBytes"]')!
        const status = name.querySelector('[role="status"]')!
        assert.ok(status, "the Name cell contains the shared scanner status")
        if (liveStatus) assert.ok(status === liveStatus, "refresh must update the existing live-region node")
        liveStatus = status
        assert.deepEqual(
          Array.from(count.querySelectorAll(".tabular-nums > span"), (span) => span.textContent),
          hasCompleteUsage ? ["90", `${objects} scanned`] : [`${objects} scanned`],
        )
        assert.deepEqual(
          Array.from(capacity.querySelectorAll(".tabular-nums > span"), (span) => span.textContent),
          hasCompleteUsage ? ["900.0 B", `${size}.0 B scanned`] : [`${size}.0 B scanned`],
        )
        assert.ok(status.classList.contains("sr-only"), "announcements stay separate from the visible status")
        assert.equal(
          status.textContent,
          `Scan progress for test-bucket. Scan in progress. Checkpoint: ${formatDateTime(1800000000000)}. Object Count: ${objects} scanned. Size: ${size}.0 B scanned${hasCompleteUsage ? `. Last complete scan: ${formatDateTime(1700000000000)}` : ""}`,
        )
        assert.deepEqual(
          Array.from(name.querySelectorAll("time"), (time) => time.dateTime),
          [1800000000000, ...(hasCompleteUsage ? [1700000000000] : [])].map((time) => new Date(time).toISOString()),
        )
        assert.ok(
          Array.from(name.querySelectorAll("span")).some(
            (span) => span.textContent === "Scan in progress" && !span.closest(".sr-only"),
          ),
          "the stage also remains visible outside the live span",
        )
        assert.equal(
          name.querySelector("a")?.getAttribute("href"),
          surface === "Browser" ? "/browser?bucket=test-bucket" : "/custom-buckets/test-bucket",
        )
        assert.equal(status.getAttribute("aria-live"), "polite")
        assert.equal(status.getAttribute("aria-atomic"), "true")
        assert.equal(status.hasAttribute("aria-label"), false)
        assert.equal(mounted.container.querySelectorAll('[data-bucket="test-bucket"] [role="status"]').length, 1)
        assert.deepEqual(mounted.container.textContent.match(/Scanned usage is not the bucket total\./g), [
          "Scanned usage is not the bucket total.",
        ])
        if (hasCompleteUsage) {
          assert.deepEqual([row.Count, row.SizeBytes], [90, 900])
          assert.match(status.textContent, /Last complete scan:/)
        } else {
          assert.equal(Object.hasOwn(row, "Count"), false)
          assert.equal(Object.hasOwn(row, "SizeBytes"), false)
          assert.doesNotMatch(status.textContent, /Last complete scan:/)
        }
      }

      const first = info(7, 71)
      const next = info(9, 91)
      await mounted.resolve(0, first)
      const registeredStatus = mounted.container.querySelector('[data-metric="Name"] [role="status"]')!
      assert.ok(registeredStatus, "the initial render registers a live region")
      assert.equal(registeredStatus.textContent, "", "the live region registers before its first announcement")
      let mutations = 0
      const observer = new mounted.browser.MutationObserver((records) => {
        mutations += records.length
      })
      observer.observe(registeredStatus, { childList: true, characterData: true, subtree: true })
      t.after(() => observer.disconnect())
      const takeMutations = () => {
        const count = mutations + observer.takeRecords().length
        mutations = 0
        return count
      }
      if (surface === "Browser") {
        await mounted.resolve(1, first)
        assert.ok(
          mounted.container.querySelector('[data-metric="Name"] [role="status"]') === registeredStatus,
          "the initial loading transition retains the empty live region",
        )
      }
      await mounted.flushAnnouncements()
      assert.ok(takeMutations() > 0, "the first announcement is a later mutation of the registered node")
      assertSample(7, 71)
      let previous = first
      for (const response of [first, next, next]) {
        const requestIndex = mounted.requests.length
        const previousAnnouncement: string = registeredStatus.textContent
        await mounted.refresh()
        assert.ok(
          mounted.container.querySelector('[data-metric="Name"] [role="status"]') === registeredStatus,
          "the loading state keeps the same live-region node",
        )
        assert.equal(registeredStatus.textContent, previousAnnouncement)
        await mounted.resolve(requestIndex, structuredClone(response))
        assert.equal(registeredStatus.textContent, previousAnnouncement, "new content waits for the next task")
        await mounted.flushAnnouncements()
        assertSample(response.buckets[0].scan_progress.objects, response.buckets[0].scan_progress.size)
        if (response === previous) assert.equal(takeMutations(), 0, "an identical response must not announce again")
        else assert.ok(takeMutations() > 0, "a changed response updates the existing announcement")
        previous = response
      }
    })
  }

  test(`${surface} clears and restores its registered announcement without publishing superseded samples`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] })
    const bucketName = "bucket &prefix=other/路径"
    const mounted = await mountBrowser(t, { surface, bucketName })
    const idle = {
      policy,
      buckets: [
        { name: bucketName, objects: 90, size: 900, usage_value_state: "carried", usage_updated_at: 1700000000000 },
      ],
    }
    const sample = (objects: number, size: number) => ({
      policy,
      buckets: [
        {
          ...idle.buckets[0],
          scan_progress: {
            stage: "scanning",
            updated_at: 1800000000000,
            objects,
            size,
            sources_observed: 1,
            sources_total: 2,
          },
        },
      ],
    })
    await mounted.resolve(0, idle)
    const liveStatus = mounted.container.querySelector('[data-metric="Name"] [role="status"]')!
    assert.ok(liveStatus)
    assert.equal(liveStatus.textContent, "")
    if (surface === "Browser") await mounted.resolve(1, idle)
    await mounted.flushAnnouncements()
    assert.equal(liveStatus.textContent, "", "old complete measurements alone do not announce active progress")
    const link = mounted.container.querySelector('[data-metric="Name"] a')!
    assert.equal(link.textContent, bucketName)
    assert.equal(
      link.getAttribute("href"),
      surface === "Browser"
        ? `/browser?bucket=${encodeURIComponent(bucketName)}`
        : `/custom-buckets/${encodeURIComponent(bucketName)}`,
    )
    const replace = async (response: unknown) => {
      const index = mounted.requests.length
      await mounted.refresh()
      await mounted.resolve(index, response)
      assert.ok(
        mounted.container.querySelector('[data-metric="Name"] [role="status"]') === liveStatus,
        "loading and progress disappearance must not replace the live span",
      )
    }

    const first = sample(7, 71)
    await replace(first)
    assert.equal(liveStatus.textContent, "", "restored content is deferred after the empty node is registered")
    await mounted.flushAnnouncements()
    const firstAnnouncement = liveStatus.textContent
    assert.match(firstAnnouncement, /Object Count: 7 scanned/)
    assert.match(firstAnnouncement, /Size: 71.0 B scanned/)
    await replace(idle)
    assert.equal(liveStatus.textContent, firstAnnouncement, "clearing also happens in the next task")
    await mounted.flushAnnouncements()
    assert.equal(liveStatus.textContent, "")
    assert.match(mounted.container.querySelector('[data-metric="Name"] time')!.textContent, /Last complete scan:.*2023/)
    assert.doesNotMatch(mounted.container.textContent, /Scan in progress|Scanned usage is not the bucket total/)

    await replace(first)
    assert.equal(liveStatus.textContent, "")
    await mounted.flushAnnouncements()
    assert.equal(liveStatus.textContent, firstAnnouncement, "the same sample can announce after a real clear")
    await replace(sample(9, 91))
    await replace(sample(11, 111))
    assert.equal(liveStatus.textContent, firstAnnouncement, "pending writes remain deferred across rapid responses")
    await mounted.flushAnnouncements()
    assert.match(liveStatus.textContent, /Object Count: 11 scanned/)
    assert.match(liveStatus.textContent, /Size: 111.0 B scanned/)
    assert.doesNotMatch(liveStatus.textContent, /Object Count: (7|9) scanned/)

    await replace(sample(13, 131))
    await replace(idle)
    await mounted.flushAnnouncements()
    assert.equal(liveStatus.textContent, "", "removing progress cancels a pending announcement")
    assert.deepEqual(
      Array.from(
        mounted.container.querySelectorAll('[data-metric="Count"] .tabular-nums > span'),
        (span) => span.textContent,
      ),
      ["90"],
    )
    assert.deepEqual(
      Array.from(
        mounted.container.querySelectorAll('[data-metric="SizeBytes"] .tabular-nums > span'),
        (span) => span.textContent,
      ),
      ["900.0 B"],
    )
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
