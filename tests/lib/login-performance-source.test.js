import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const rootLayout = fs.readFileSync("app/layout.tsx", "utf8")
const dashboardLayout = fs.readFileSync("app/(dashboard)/layout.tsx", "utf8")
const authContext = fs.readFileSync("contexts/auth-context.tsx", "utf8")
const loginPage = fs.readFileSync("app/(auth)/auth/login/page.tsx", "utf8")
const oidcCallbackPage = fs.readFileSync("app/(auth)/auth/oidc-callback/page.tsx", "utf8")
const i18nProvider = fs.readFileSync("components/providers/i18n-provider.tsx", "utf8")
const i18nSource = fs.readFileSync("lib/i18n.ts", "utf8")
const loadingShell = fs.readFileSync("components/app-loading-shell.tsx", "utf8")

test("root layout does not load dashboard-only providers on auth routes", () => {
  assert.doesNotMatch(rootLayout, /@\/contexts\/api-context/)
  assert.doesNotMatch(rootLayout, /@\/contexts\/s3-context/)
  assert.doesNotMatch(rootLayout, /@\/contexts\/task-context/)
  assert.doesNotMatch(rootLayout, /@\/hooks\/use-permissions/)
  assert.doesNotMatch(rootLayout, /<ApiProvider>/)
  assert.doesNotMatch(rootLayout, /<S3Provider>/)
  assert.doesNotMatch(rootLayout, /<TaskProvider>/)
  assert.doesNotMatch(rootLayout, /<PermissionsProvider>/)
})

test("dashboard layout owns dashboard providers before the auth guard", () => {
  for (const symbol of ["ApiProvider", "S3Provider", "TaskProvider", "PermissionsProvider", "DashboardAuthGuard"]) {
    assert.match(dashboardLayout, new RegExp(symbol))
  }

  assert.ok(dashboardLayout.indexOf("<ApiProvider>") < dashboardLayout.indexOf("<S3Provider>"))
  assert.ok(dashboardLayout.indexOf("<S3Provider>") < dashboardLayout.indexOf("<TaskProvider>"))
  assert.ok(dashboardLayout.indexOf("<TaskProvider>") < dashboardLayout.indexOf("<PermissionsProvider>"))
  assert.ok(dashboardLayout.indexOf("<PermissionsProvider>") < dashboardLayout.indexOf("<DashboardAuthGuard>"))
})

test("auth routes do not depend on dashboard permission resolution", () => {
  assert.doesNotMatch(loginPage, /useFirstAccessibleDashboardRoute/)
  assert.doesNotMatch(oidcCallbackPage, /useFirstAccessibleDashboardRoute/)
})

test("STS client is loaded only when login is submitted", () => {
  assert.doesNotMatch(authContext, /import\s+\{\s*getStsToken\s*\}\s+from\s+["']@\/lib\/sts["']/)
  assert.match(authContext, /await import\(["']@\/lib\/sts["']\)/)
})

test("login and i18n fallbacks render a visible loading shell", () => {
  assert.match(loginPage, /fallback=\{<AppLoadingShell \/>\}/)
  assert.match(i18nProvider, /return <AppLoadingShell \/>/)
  assert.doesNotMatch(loginPage, /fallback=\{<div className="min-h-screen bg-background" \/>\}/)
  assert.doesNotMatch(i18nProvider, /return <div className="min-h-screen bg-background" \/>/)
  assert.match(loadingShell, /animate-pulse/)
})

test("OIDC provider discovery is deferred off the first render path", () => {
  assert.match(loginPage, /requestIdleCallback/)
  assert.doesNotMatch(loginPage, /fetchOidcProviders\(config\.serverHost\)\.then\(setOidcProviders\)/)
})

test("i18n initializes only the detected locale plus fallback and lazy-loads later languages", () => {
  assert.match(i18nSource, /function detectInitialLocale/)
  assert.match(i18nSource, /const initialLocales = \[\.\.\.new Set<Locale>\(\[DEFAULT_LOCALE, initialLocale\]\)\]/)
  assert.match(i18nSource, /export async function ensureLocaleResources/)
  assert.match(i18nSource, /export async function changeLocale/)
  assert.doesNotMatch(i18nSource, /for \(const \[code, file\] of Object\.entries\(LOCALE_FILE_MAP\)\)/)
})
