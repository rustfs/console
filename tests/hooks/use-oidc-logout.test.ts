import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { act, cloneElement, createElement, useEffect, type ReactElement, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import ts from "typescript"
import type { ApiErrorHandler } from "../../lib/api-error-handler"
import type { useAuth as UseAuth } from "../../contexts/auth-context"

const mocksKey = Symbol.for("oidc-logout-navigation")
const mockExports: Record<string, string[]> = {
  "next/navigation": ["useRouter", "usePathname", "useSearchParams"],
  "react-i18next": ["useTranslation"],
  "@/components/ui/button": ["Button"],
  "@/components/ui/spinner": ["Spinner"],
  "@/hooks/use-permissions": ["usePermissions"],
  "@/lib/mfa-challenge": ["fetchMfaChallenge"],
  "@/lib/sts": ["getStsToken"],
  "@/lib/api-prefix-middleware": ["addApiPrefixMiddleware"],
  "@/lib/bucket-replication-delete": ["addDeleteReplicationMiddleware"],
}
const constructors: Record<string, string> = {
  "@/lib/api-client": "ApiClient",
  "@/lib/aws4fetch": "AwsClient",
  "@aws-sdk/client-s3": "S3Client",
}
const overrides: Record<string, string> = {}
const dataUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`
const mocks = 'globalThis[Symbol.for("oidc-logout-navigation")]'
overrides["@/lib/config"] = dataUrl(
  `export const configManager = { loadConfig: (...args) => ${mocks}.configManager.loadConfig(...args), clearCache: () => {} }`,
)

function moduleUrl(path: string) {
  const source = ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const resolve = (specifier: string) => {
    if (overrides[specifier]) return overrides[specifier]
    const constructor = constructors[specifier]
    if (constructor) {
      return dataUrl(
        `export class ${constructor} { constructor(...args) { return new ${mocks}.${constructor}(...args) } }`,
      )
    }
    if (mockExports[specifier]) {
      return dataUrl(
        mockExports[specifier]
          .map((name) => `export const ${name} = (...args) => ${mocks}.${name}(...args)`)
          .join("\n"),
      )
    }
    return specifier.startsWith("@/") ? specifier : import.meta.resolve(specifier)
  }
  return dataUrl(
    source
      .replace(/from "([^"]+)"/g, (_, specifier: string) => `from "${resolve(specifier)}"`)
      .replace(/import\("([^"]+)"\)/g, (_, specifier: string) => `import("${resolve(specifier)}")`),
  )
}

overrides["@/hooks/use-local-storage"] = moduleUrl("hooks/use-local-storage.ts")
overrides["@/contexts/auth-context"] = moduleUrl("contexts/auth-context.tsx")
overrides["@/contexts/api-context"] = moduleUrl("contexts/api-context.tsx")
overrides["@/contexts/s3-context"] = moduleUrl("contexts/s3-context.tsx")
const { AuthProvider, useAuth } = (await import(
  overrides["@/contexts/auth-context"]
)) as typeof import("../../contexts/auth-context")
const { ApiProvider, useApiReady } = (await import(
  overrides["@/contexts/api-context"]
)) as typeof import("../../contexts/api-context")
const { S3Provider, useS3Ready } = (await import(
  overrides["@/contexts/s3-context"]
)) as typeof import("../../contexts/s3-context")
const { DashboardAuthGuard } = (await import(
  moduleUrl("components/dashboard-auth-guard.tsx")
)) as typeof import("../../components/dashboard-auth-guard")

type Auth = ReturnType<typeof UseAuth>
type Middleware = (next: (args: unknown) => Promise<unknown>) => (args: unknown) => Promise<unknown>
const config = {
  serverHost: "https://s3.example.test",
  api: { baseURL: "https://s3.example.test/rustfs/admin/v3" },
  s3: { endpoint: "https://s3.example.test", region: "us-east-1" },
}
const logoutUrl = `${config.serverHost}/rustfs/admin/v3/oidc/logout?logout_token=test-logout-token`
const credentials = {
  AccessKeyId: "test-access",
  SecretAccessKey: "test-secret",
  SessionToken: "test-session",
  Expiration: "2099-01-01T00:00:00.000Z",
}

async function mountDashboard(
  t: TestContext,
  options: {
    token?: string | null
    expiration?: string
    expectAuthenticated?: boolean
    onCredentials?: (auth: Auth) => void
  } = {},
) {
  const browser = new Window({ url: "https://console.example.test/browser/" })
  const globals = {
    window: browser,
    document: browser.document,
    localStorage: browser.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const previous = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const timers: { callback: () => void; delay: number; cancelled: boolean }[] = []
  t.mock.method(browser, "setTimeout", (callback: () => void, delay: number) => {
    timers.push({ callback, delay, cancelled: false })
    return timers.length
  })
  t.mock.method(browser, "clearTimeout", (id: number) => {
    if (timers[id - 1]) timers[id - 1].cancelled = true
  })
  const navigate = t.mock.fn<(url: string) => void>()
  const replaceDocument = t.mock.fn<(url: string) => void>()
  Object.defineProperty(browser, "location", {
    configurable: true,
    value: {
      pathname: "/browser/",
      origin: "https://console.example.test",
      set href(url: string) {
        navigate(url)
      },
      replace: replaceDocument,
    },
  })
  browser.localStorage.setItem(
    "auth.credentials",
    JSON.stringify({ ...credentials, Expiration: options.expiration ?? credentials.Expiration }),
  )
  browser.localStorage.setItem("auth.isAdmin", "true")
  const token = options.token === undefined ? "test-logout-token" : options.token
  if (token !== null) browser.localStorage.setItem("auth.oidcSession", JSON.stringify({ logoutToken: token }))

  const router = { replace: t.mock.fn<(path: string) => void>(), push: t.mock.fn<(path: string) => void>() }
  const configManager = { loadConfig: t.mock.fn(async () => config) }
  const apiHandlers: ApiErrorHandler[] = []
  const s3Handlers: Middleware[] = []
  let routeAllowed = true
  Reflect.set(globalThis, mocksKey, {
    configManager,
    useRouter: () => router,
    usePathname: () => "/browser/",
    useSearchParams: () => new URLSearchParams(),
    useTranslation: () => ({ t: (key: string) => key }),
    usePermissions: () => ({
      isAdmin: false,
      hasFetchedPolicy: true,
      hasResolvedAdmin: true,
      canAccessPath: () => routeAllowed,
      hasPendingChecks: () => false,
    }),
    Spinner: () => null,
    Button: ({ children, render }: { children: ReactNode; render?: ReactElement<{ children?: ReactNode }> }) =>
      render ? cloneElement(render, {}, children) : createElement("button", null, children),
    fetchMfaChallenge: async () => ({ required: false }),
    getStsToken: async () => ({ ...credentials, Expiration: new Date(credentials.Expiration) }),
    addApiPrefixMiddleware: () => {},
    addDeleteReplicationMiddleware: () => {},
    AwsClient: class {},
    ApiClient: class {
      constructor(_client: unknown, options: { errorHandler: ApiErrorHandler }) {
        apiHandlers.push(options.errorHandler)
      }
    },
    S3Client: class {
      config = {}
      middlewareStack = {
        addRelativeTo(middleware: Middleware, options: { name: string }) {
          if (options.name === "handleXmlResponse") s3Handlers.push(middleware)
        },
      }
    },
  })
  let auth: Auth
  const clientSnapshots: {
    session?: string
    apiReady: boolean
    s3Ready: boolean
    apiExists: boolean
    s3Exists: boolean
  }[] = []
  function ClientProbe() {
    const auth = useAuth()
    const api = useApiReady()
    const s3 = useS3Ready()
    clientSnapshots.push({
      session: auth.credentials?.AccessKeyId,
      apiReady: api.isReady,
      s3Ready: s3.isReady,
      apiExists: !!api.api,
      s3Exists: !!s3.client,
    })
    return null
  }
  function Probe() {
    const value = useAuth()
    auth = value
    useEffect(() => {
      if (value.isAuthenticated) options.onCredentials?.(value)
    }, [value])
    return null
  }
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  const render = async () =>
    act(async () =>
      root.render(
        createElement(
          AuthProvider,
          null,
          createElement(Probe),
          createElement(
            ApiProvider,
            null,
            createElement(
              S3Provider,
              null,
              createElement(ClientProbe),
              createElement(DashboardAuthGuard, null, createElement("main", null, "Dashboard")),
            ),
          ),
        ),
      ),
    )
  t.after(async () => {
    await act(async () => root.unmount())
    await browser.happyDOM.close()
    Reflect.deleteProperty(globalThis, mocksKey)
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  await render()
  assert.equal(!!container.querySelector("main"), options.expectAuthenticated ?? true)
  assert.equal(apiHandlers.length, options.expectAuthenticated === false ? 0 : 1)
  assert.equal(s3Handlers.length, options.expectAuthenticated === false ? 0 : 1)
  return {
    browser,
    clientSnapshots,
    timers,
    async fireTimer(index = timers.length - 1) {
      await act(async () => timers[index].callback())
    },
    get latestApiHandler() {
      return apiHandlers.at(-1)!
    },
    latestS3Error: (error: unknown) =>
      s3Handlers.at(-1)!(async () => {
        throw error
      })({}),
    container,
    router,
    configManager,
    navigate,
    replaceDocument,
    // Keep the callbacks from clients created BEFORE logout so stale closures are exercised.
    apiHandler: apiHandlers[0],
    s3Error: (error: unknown) =>
      s3Handlers[0](async () => {
        throw error
      })({}),
    get auth() {
      return auth!
    },
    async logout() {
      let redirected = false
      await act(async () => {
        redirected = await auth.logoutWithOidcRedirect()
      })
      return redirected
    },
    async denyRoute() {
      routeAllowed = false
      await render()
    },
    async syncStorage(key: string, newValue: string | null) {
      await act(async () => {
        const oldValue = browser.localStorage.getItem(key)
        if (newValue === null) browser.localStorage.removeItem(key)
        else browser.localStorage.setItem(key, newValue)
        browser.dispatchEvent(
          new browser.StorageEvent("storage", {
            key,
            oldValue: oldValue ?? undefined,
            newValue: newValue ?? undefined,
          }),
        )
      })
    },
  }
}

async function pendingLogout(mounted: Awaited<ReturnType<typeof mountDashboard>>) {
  const pending = Promise.withResolvers<typeof config>()
  mounted.configManager.loadConfig.mock.mockImplementation(() => pending.promise)
  let task: Promise<boolean>
  await act(async () => {
    task = mounted.auth.logoutWithOidcRedirect()
  })
  return {
    async finish() {
      await act(async () => {
        pending.resolve(config)
        await task
      })
    },
  }
}

test("OIDC logout clears local credentials and navigates only to the federated logout endpoint", async (t) => {
  const mounted = await mountDashboard(t)
  assert.equal(await mounted.logout(), true)
  assert.deepEqual(
    mounted.navigate.mock.calls.map((call) => call.arguments),
    [[logoutUrl]],
  )
  assert.equal(mounted.router.replace.mock.callCount(), 0)
  assert.equal(mounted.auth.isAuthenticated, false)
  for (const key of ["auth.credentials", "auth.isAdmin", "auth.oidcSession"])
    assert.equal(mounted.browser.localStorage.getItem(key), null)
  assert.equal(mounted.container.querySelector("main"), null)
  assert.equal(mounted.container.querySelector("a")?.getAttribute("href"), "/auth/login")
})

test("repeated logout and the local logout shortcut cannot replace an in-flight federated logout", async (t) => {
  const mounted = await mountDashboard(t)
  const pending = await pendingLogout(mounted)
  assert.equal(mounted.auth.getIsLoggingOut(), true)
  await act(async () => {
    assert.equal(await mounted.auth.logoutWithOidcRedirect(), true)
    mounted.auth.logoutAndRedirect()
  })
  assert.equal(mounted.configManager.loadConfig.mock.callCount(), 3, "two initial clients and one logout config load")
  assert.equal(mounted.navigate.mock.callCount(), 0)
  assert.equal(mounted.router.replace.mock.callCount(), 0)
  await pending.finish()
  assert.deepEqual(
    mounted.navigate.mock.calls.map((call) => call.arguments),
    [[logoutUrl]],
  )
  assert.equal(mounted.router.replace.mock.callCount(), 0)
})

for (const token of [null, "   "]) {
  test(`logout with ${token === null ? "no" : "an empty"} OIDC token keeps the local login fallback`, async (t) => {
    const mounted = await mountDashboard(t, { token })
    assert.equal(await mounted.logout(), false)
    assert.equal(mounted.auth.isAuthenticated, false)
    assert.equal(mounted.navigate.mock.callCount(), 0)
    assert.deepEqual(
      mounted.router.replace.mock.calls.map((call) => call.arguments),
      [["/auth/login/?unauthorized=true"]],
    )
  })
}

for (const failure of ["config", "navigation"]) {
  test(`${failure} failure restores normal logout and reports the error`, async (t) => {
    const mounted = await mountDashboard(t)
    const error = new Error(`${failure} unavailable`)
    const errors = t.mock.method(console, "error", t.mock.fn<typeof console.error>())
    if (failure === "config")
      mounted.configManager.loadConfig.mock.mockImplementation(async () => {
        throw error
      })
    else
      mounted.navigate.mock.mockImplementation(() => {
        throw error
      })
    assert.equal(await mounted.logout(), false)
    assert.equal(mounted.auth.getIsLoggingOut(), false)
    assert.equal(mounted.auth.isAuthenticated, false)
    assert.deepEqual(
      mounted.router.replace.mock.calls.map((call) => call.arguments),
      [["/auth/login/?unauthorized=true"]],
    )
    assert.equal(errors.mock.callCount(), 1)
    assert.ok(errors.mock.calls[0].arguments.includes(error))
  })
}

test("permission changes cannot redirect to forbidden while logout config is pending", async (t) => {
  const mounted = await mountDashboard(t)
  const pending = await pendingLogout(mounted)
  await mounted.denyRoute()
  assert.equal(mounted.router.replace.mock.callCount(), 0)
  await pending.finish()
  assert.equal(mounted.router.replace.mock.callCount(), 0)
})

const apiFailures = [
  { status: 401, path: "/buckets", target: "/auth/login/?unauthorized=true" },
  { status: 403, path: "/accountinfo", target: "/403/" },
  { status: 403, path: "/is-admin", target: "/403/" },
  { status: 403, path: "/version", target: "/403/" },
  { status: 403, path: "/buckets", target: "/403/" },
]
const s3Failures = [
  { $metadata: { httpStatusCode: 401 } },
  { $metadata: { httpStatusCode: 403 }, Code: "UnauthorizedAccess" },
  { $metadata: { httpStatusCode: 403 }, Code: "InvalidAccessKeyId" },
  { $metadata: { httpStatusCode: 400 }, Code: "ExpiredToken" },
]

for (const phase of ["config pending", "navigation started"]) {
  test(`old API and S3 error callbacks cannot navigate during logout: ${phase}`, async (t) => {
    const mounted = await mountDashboard(t)
    const pending = await pendingLogout(mounted)
    if (phase === "navigation started") await pending.finish()
    await act(async () => {
      for (const { status, path } of apiFailures) await mounted.apiHandler.handleByStatus(status, path)
      for (const error of s3Failures) {
        await assert.rejects(mounted.s3Error(error), (caught) => caught === error)
      }
    })
    assert.equal(mounted.router.replace.mock.callCount(), 0)
    if (phase === "config pending") {
      assert.equal(mounted.auth.isAuthenticated, true)
      await pending.finish()
    }
    assert.deepEqual(
      mounted.navigate.mock.calls.map((call) => call.arguments),
      [[logoutUrl]],
    )
  })
}

for (const { status, path, target } of apiFailures) {
  test(`API ${status} at ${path} still redirects outside federated logout`, async (t) => {
    const mounted = await mountDashboard(t)
    await act(async () => mounted.apiHandler.handleByStatus(status, path))
    assert.equal(mounted.router.replace.mock.calls[0].arguments[0], target)
    assert.equal(mounted.auth.isAuthenticated, target === "/403/")
  })
}

for (const error of s3Failures) {
  test(`S3 ${error.Code ?? "401"} still logs out outside federated logout`, async (t) => {
    const mounted = await mountDashboard(t)
    await act(async () => assert.rejects(mounted.s3Error(error), (caught) => caught === error))
    assert.equal(mounted.router.replace.mock.calls[0].arguments[0], "/auth/login/?unauthorized=true")
    assert.equal(mounted.auth.isAuthenticated, false)
  })
}

test("unrelated S3 errors remain rejected during federated logout", async (t) => {
  const mounted = await mountDashboard(t)
  await mounted.logout()
  const error = Object.assign(new Error("Denied"), { $metadata: { httpStatusCode: 403 }, Code: "AccessDenied" })
  await assert.rejects(mounted.s3Error(error), (caught) => caught === error)
})

for (const method of ["sts", "password"]) {
  test(`a new ${method} login resets the logout flag and restores ordinary expiration handling`, async (t) => {
    const mounted = await mountDashboard(t)
    await mounted.logout()
    await act(async () => {
      if (method === "sts") await mounted.auth.loginWithStsCredentials(credentials)
      else await mounted.auth.login({ accessKeyId: "test-access", secretAccessKey: "test-secret" })
    })
    assert.equal(mounted.auth.getIsLoggingOut(), false)
    assert.equal(mounted.auth.isAuthenticated, true)
    await act(async () => mounted.auth.logout())
    assert.deepEqual(
      mounted.router.replace.mock.calls.map((call) => call.arguments),
      [["/auth/login/?unauthorized=true"]],
    )
  })
}

test("a session received from another tab can log out with its own OIDC token", async (t) => {
  const mounted = await mountDashboard(t)
  await mounted.logout()
  await mounted.syncStorage("auth.credentials", JSON.stringify({ ...credentials, AccessKeyId: "other-tab" }))
  await mounted.syncStorage("auth.oidcSession", JSON.stringify({ logoutToken: "other-tab-token" }))
  assert.equal(mounted.auth.isAuthenticated, true)
  assert.equal(await mounted.logout(), true)
  assert.deepEqual(
    mounted.navigate.mock.calls.map((call) => call.arguments),
    [[logoutUrl], [`${config.serverHost}/rustfs/admin/v3/oidc/logout?logout_token=other-tab-token`]],
  )
  assert.equal(mounted.auth.isAuthenticated, false)
  assert.equal(mounted.browser.localStorage.getItem("auth.credentials"), null)
  assert.equal(mounted.browser.localStorage.getItem("auth.oidcSession"), null)
  assert.equal(mounted.router.replace.mock.callCount(), 0)
})

for (const service of ["API", "S3"]) {
  test(`old ${service} callbacks cannot erase a cross-tab session before child effects run`, async (t) => {
    let failure: Promise<unknown> | undefined
    const mounted = await mountDashboard(t, {
      onCredentials: (auth) => {
        if (auth.credentials?.AccessKeyId !== "other-tab") return
        failure =
          service === "API"
            ? mounted.apiHandler.handle401()
            : mounted.s3Error({ $metadata: { httpStatusCode: 403 }, Code: "UnauthorizedAccess" }).catch(() => undefined)
      },
    })
    await mounted.logout()
    await mounted.syncStorage("auth.credentials", JSON.stringify({ ...credentials, AccessKeyId: "other-tab" }))
    await act(async () => failure)
    assert.ok(failure, "the new authenticated session runs its child effect")
    assert.equal(mounted.router.replace.mock.callCount(), 0)
    assert.equal(mounted.auth.isAuthenticated, true)
  })
}

test("deleted, invalid and unrelated storage values preserve an in-flight logout", async (t) => {
  const mounted = await mountDashboard(t)
  await mounted.logout()
  const updates: [string, string | null][] = [
    ["auth.credentials", null],
    ["auth.credentials", JSON.stringify({ AccessKeyId: "incomplete" })],
    ["auth.credentials", JSON.stringify({ ...credentials, Expiration: "2000-01-01T00:00:00.000Z" })],
    ["auth.oidcSession", JSON.stringify({ logoutToken: "unrelated-token" })],
    ["theme", "dark"],
  ]
  for (const [key, value] of updates) {
    await mounted.syncStorage(key, value)
    await act(async () => mounted.apiHandler.handle401())
    assert.equal(mounted.auth.getIsLoggingOut(), true, `keeps logout protection for ${key}: ${value}`)
    assert.equal(mounted.router.replace.mock.callCount(), 0)
  }
  assert.deepEqual(
    mounted.navigate.mock.calls.map((call) => call.arguments),
    [[logoutUrl]],
  )
})

test("a repeated current-credentials storage event cannot interrupt logout config loading", async (t) => {
  const mounted = await mountDashboard(t)
  const pending = await pendingLogout(mounted)
  await mounted.syncStorage("auth.credentials", JSON.stringify(credentials))
  await act(async () => mounted.apiHandler.handle401())
  assert.equal(mounted.auth.getIsLoggingOut(), true)
  assert.equal(mounted.router.replace.mock.callCount(), 0)
  await pending.finish()
  assert.deepEqual(
    mounted.navigate.mock.calls.map((call) => call.arguments),
    [[logoutUrl]],
  )
  assert.equal(mounted.router.replace.mock.callCount(), 0)
})

test("restoring an old logged-out document preserves a newer session and reloads login", async (t) => {
  const mounted = await mountDashboard(t)
  await mounted.logout()
  const newSession = {
    "auth.credentials": JSON.stringify({ ...credentials, AccessKeyId: "new-session" }),
    "auth.isAdmin": "false",
    "auth.oidcSession": JSON.stringify({ logoutToken: "new-logout-token" }),
  }
  for (const [key, value] of Object.entries(newSession)) mounted.browser.localStorage.setItem(key, value)
  const event = new mounted.browser.Event("pageshow")
  Object.defineProperty(event, "persisted", { value: true })
  await act(async () => mounted.browser.dispatchEvent(event))
  assert.deepEqual(
    Object.fromEntries(Object.keys(newSession).map((key) => [key, mounted.browser.localStorage.getItem(key)])),
    newSession,
  )
  assert.deepEqual(
    mounted.replaceDocument.mock.calls.map((call) => call.arguments),
    [["/auth/login"]],
  )
  assert.equal(mounted.router.replace.mock.callCount(), 0)
})

for (const phase of ["before storage event", "after storage event"]) {
  test(`old API and S3 callbacks preserve a replacement session ${phase}`, async (t) => {
    const mounted = await mountDashboard(t)
    const replacement = { ...credentials, AccessKeyId: "replacement", SessionToken: "replacement-token" }
    const serialized = JSON.stringify(replacement)
    mounted.browser.localStorage.setItem("auth.credentials", serialized)
    mounted.browser.localStorage.setItem("auth.isAdmin", "true")
    mounted.browser.localStorage.setItem("auth.oidcSession", JSON.stringify({ logoutToken: "replacement-logout" }))
    if (phase === "after storage event") await mounted.syncStorage("auth.credentials", serialized)
    await act(async () => {
      for (const { status, path } of apiFailures) await mounted.apiHandler.handleByStatus(status, path)
      for (const error of s3Failures) await assert.rejects(mounted.s3Error(error), (caught) => caught === error)
    })
    assert.equal(mounted.router.replace.mock.callCount(), 0)
    assert.equal(mounted.browser.localStorage.getItem("auth.credentials"), serialized)
    assert.equal(mounted.browser.localStorage.getItem("auth.isAdmin"), "true")
    assert.equal(
      mounted.browser.localStorage.getItem("auth.oidcSession"),
      JSON.stringify({ logoutToken: "replacement-logout" }),
    )
  })
}

test("reusing an access key with a new session token protects the replacement session", async (t) => {
  const mounted = await mountDashboard(t)
  const serialized = JSON.stringify({ ...credentials, SessionToken: "replacement-token" })
  mounted.browser.localStorage.setItem("auth.credentials", serialized)
  await act(async () => mounted.apiHandler.handle401())
  assert.equal(mounted.browser.localStorage.getItem("auth.credentials"), serialized)
  assert.equal(mounted.router.replace.mock.callCount(), 0)
})

test("logout followed by login in the same React batch persists the new session immediately", async (t) => {
  const mounted = await mountDashboard(t)
  const replacement = { ...credentials, AccessKeyId: "replacement" }
  await act(async () => {
    mounted.auth.logout()
    assert.equal(mounted.browser.localStorage.getItem("auth.credentials"), null)
    await mounted.auth.loginWithStsCredentials(replacement)
    assert.equal(mounted.browser.localStorage.getItem("auth.credentials"), JSON.stringify(replacement))
  })
  await act(async () => mounted.apiHandler.handle401())
  assert.equal(mounted.auth.credentials?.AccessKeyId, "replacement")
  assert.equal(mounted.router.replace.mock.callCount(), 0)
})

test("a queued old storage event reloads the latest session instead of its obsolete payload", async (t) => {
  const mounted = await mountDashboard(t)
  const replacement = { ...credentials, AccessKeyId: "replacement" }
  mounted.browser.localStorage.setItem("auth.credentials", JSON.stringify(replacement))
  await act(async () =>
    mounted.browser.dispatchEvent(
      new mounted.browser.StorageEvent("storage", {
        key: "auth.credentials",
        newValue: JSON.stringify(credentials),
      }),
    ),
  )
  assert.equal(mounted.auth.credentials?.AccessKeyId, "replacement")
})

for (const service of ["API", "S3"]) {
  test(`new ${service} callbacks still expire a replacement session`, async (t) => {
    const mounted = await mountDashboard(t)
    await mounted.syncStorage("auth.credentials", JSON.stringify({ ...credentials, AccessKeyId: "replacement" }))
    await act(async () => {
      if (service === "API") await mounted.latestApiHandler.handle401()
      else {
        const error = { Code: "ExpiredToken", $metadata: { httpStatusCode: 400 } }
        await assert.rejects(mounted.latestS3Error(error), (caught) => caught === error)
      }
    })
    assert.equal(mounted.auth.isAuthenticated, false)
    assert.equal(mounted.router.replace.mock.calls[0].arguments[0], "/auth/login/?unauthorized=true")
  })
}

test("the expiration timer logs out an idle tab exactly at expiration", async (t) => {
  const start = Date.parse("2026-11-14T00:00:00Z")
  let now = start
  t.mock.method(Date, "now", () => now)
  const mounted = await mountDashboard(t, { expiration: new Date(start + 60_000).toISOString() })
  assert.equal(mounted.timers[0].delay, 60_000)
  now += 60_000
  await mounted.fireTimer(0)
  assert.equal(mounted.auth.isAuthenticated, false)
  assert.equal(mounted.browser.localStorage.getItem("auth.credentials"), null)
  assert.equal(mounted.navigate.mock.callCount(), 0, "automatic expiration does not start IdP logout")
  assert.equal(mounted.router.replace.mock.calls[0].arguments[0], "/auth/login/?unauthorized=true")
})

test("an early expiration callback reschedules instead of logging out", async (t) => {
  const start = Date.parse("2026-11-14T00:00:00Z")
  t.mock.method(Date, "now", () => start)
  const mounted = await mountDashboard(t, { expiration: new Date(start + 60_000).toISOString() })
  await mounted.fireTimer(0)
  assert.equal(mounted.auth.isAuthenticated, true)
  assert.equal(mounted.timers.at(-1)?.delay, 60_000)
  assert.equal(mounted.router.replace.mock.callCount(), 0)
})

test("long-lived sessions use a bounded timeout instead of overflowing browser timers", async (t) => {
  const mounted = await mountDashboard(t)
  assert.equal(mounted.timers[0].delay, 2 ** 31 - 1)
})

for (const phase of ["before storage event", "after storage event"]) {
  test(`an old timer preserves a new session ${phase}`, async (t) => {
    const start = Date.parse("2026-11-14T00:00:00Z")
    let now = start
    t.mock.method(Date, "now", () => now)
    const mounted = await mountDashboard(t, { expiration: new Date(start + 60_000).toISOString() })
    const replacement = { ...credentials, AccessKeyId: "replacement" }
    mounted.browser.localStorage.setItem("auth.credentials", JSON.stringify(replacement))
    if (phase === "after storage event") await mounted.syncStorage("auth.credentials", JSON.stringify(replacement))
    now += 60_000
    await mounted.fireTimer(0)
    assert.equal(mounted.browser.localStorage.getItem("auth.credentials"), JSON.stringify(replacement))
    assert.equal(mounted.router.replace.mock.callCount(), 0)
    if (phase === "after storage event") assert.equal(mounted.timers[0].cancelled, true)
  })
}

for (const event of ["visibilitychange", "pageshow"]) {
  test(`${event} rechecks expiration after browser suspension`, async (t) => {
    const start = Date.parse("2026-11-14T00:00:00Z")
    let now = start
    t.mock.method(Date, "now", () => now)
    const mounted = await mountDashboard(t, { expiration: new Date(start + 60_000).toISOString() })
    now += 90_000
    await act(async () => {
      if (event === "visibilitychange") {
        Object.defineProperty(mounted.browser.document, "visibilityState", { configurable: true, value: "visible" })
        mounted.browser.document.dispatchEvent(new mounted.browser.Event(event))
      } else mounted.browser.dispatchEvent(new mounted.browser.Event(event))
    })
    assert.equal(mounted.auth.isAuthenticated, false)
    assert.equal(mounted.router.replace.mock.calls[0].arguments[0], "/auth/login/?unauthorized=true")
  })
}

test("a timer cannot interrupt pending federated logout even after local expiration", async (t) => {
  const start = Date.parse("2026-11-14T00:00:00Z")
  let now = start
  t.mock.method(Date, "now", () => now)
  const mounted = await mountDashboard(t, { expiration: new Date(start + 60_000).toISOString() })
  const pending = await pendingLogout(mounted)
  now += 60_000
  await mounted.fireTimer(0)
  assert.equal(mounted.router.replace.mock.callCount(), 0)
  assert.notEqual(mounted.browser.localStorage.getItem("auth.credentials"), null)
  await pending.finish()
  assert.deepEqual(
    mounted.navigate.mock.calls.map((call) => call.arguments),
    [[logoutUrl]],
  )
})

test("replacement credentials never expose old clients while new configuration is pending", async (t) => {
  const mounted = await mountDashboard(t)
  const pending = Promise.withResolvers<typeof config>()
  mounted.configManager.loadConfig.mock.mockImplementation(() => pending.promise)
  await mounted.syncStorage("auth.credentials", JSON.stringify({ ...credentials, AccessKeyId: "replacement" }))
  const snapshots = mounted.clientSnapshots.filter((snapshot) => snapshot.session === "replacement")
  assert.ok(snapshots.length > 0)
  assert.ok(
    snapshots.every((snapshot) => !snapshot.apiExists && !snapshot.s3Exists && !snapshot.apiReady && !snapshot.s3Ready),
  )
  await act(async () => pending.resolve(config))
  const ready = mounted.clientSnapshots.at(-1)!
  assert.equal(ready.session, "replacement")
  assert.equal(ready.apiReady && ready.s3Ready && ready.apiExists && ready.s3Exists, true)
})

test("an existing session still expires when the browser refuses localStorage", async (t) => {
  const mounted = await mountDashboard(t)
  for (const method of ["getItem", "setItem", "removeItem"] as const) {
    t.mock.method(mounted.browser.localStorage, method, () => {
      throw new Error("Storage denied")
    })
  }
  assert.equal(mounted.auth.isAuthenticated, true)
  await act(async () => mounted.latestApiHandler.handle401())
  assert.equal(mounted.auth.isAuthenticated, false)
  assert.equal(mounted.router.replace.mock.calls[0].arguments[0], "/auth/login/?unauthorized=true")
})

test("a quota failure rejects login without creating an untracked in-memory session", async (t) => {
  const mounted = await mountDashboard(t)
  t.mock.method(mounted.browser.localStorage, "setItem", () => {
    throw new Error("Quota exceeded")
  })
  await act(async () =>
    assert.rejects(mounted.auth.loginWithStsCredentials({ ...credentials, AccessKeyId: "replacement" }), {
      message: "Unable to save the session in browser storage",
    }),
  )
  assert.equal(mounted.auth.credentials?.AccessKeyId, credentials.AccessKeyId)
  assert.equal(mounted.browser.localStorage.getItem("auth.credentials"), JSON.stringify(credentials))
  await act(async () => mounted.latestApiHandler.handle401())
  assert.equal(mounted.auth.isAuthenticated, false)
})

test("a failed login cannot release pending OIDC logout protection", async (t) => {
  const mounted = await mountDashboard(t)
  const pending = await pendingLogout(mounted)
  t.mock.method(mounted.browser.localStorage, "setItem", () => {
    throw new Error("Quota exceeded")
  })
  await act(async () =>
    assert.rejects(mounted.auth.loginWithStsCredentials({ ...credentials, AccessKeyId: "replacement" })),
  )
  assert.equal(mounted.auth.getIsLoggingOut(), true)
  await pending.finish()
  assert.deepEqual(
    mounted.navigate.mock.calls.map((call) => call.arguments),
    [[logoutUrl]],
  )
})
