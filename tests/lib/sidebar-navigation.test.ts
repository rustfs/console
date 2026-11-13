import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"
import type { NavItem } from "../../types/app-config"
import { getVisibleNavigation, groupNavigation, isNavigationItemActive } from "../../lib/sidebar-navigation"
import { getFirstAccessibleDashboardRoute, MENU_CONTROLLED_DASHBOARD_ROUTES } from "../../lib/dashboard-route-meta"
import { getNavigationBreadcrumbs } from "../../lib/navigation-breadcrumbs"

const source = ts
  .transpileModule(readFileSync("config/navs.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  })
  .outputText.replace(
    /import \{ getThemeManifest \} from "@\/lib\/theme\/manifest";/,
    "const getThemeManifest = () => ({ links: {} });",
  )
const { default: navs, footerNavs } = (await import(`data:text/javascript,${encodeURIComponent(source)}`)) as {
  default: NavItem[]
  footerNavs: NavItem[]
}
const allow =
  (...paths: string[]) =>
  (path: string) =>
    paths.includes(path)
const all = () => true
const breadcrumbs = (pathname: string, query = "", canAccessPath: (path: string) => boolean = all) =>
  getNavigationBreadcrumbs({
    pathname,
    searchParams: new URLSearchParams(query),
    navs: [...navs, ...footerNavs],
    t: (key) => key,
    canAccessPath,
  })

test("navigation groups follow the six approved product domains", () => {
  assert.deepEqual(
    groupNavigation(getVisibleNavigation(navs, all)).map((group) => group.label),
    ["Data Management", "Identity", "Cluster Management", "Security and Compliance", "Operations", "Administration"],
  )
})

test("data management keeps event destinations before S3 Tables", () => {
  const group = groupNavigation(getVisibleNavigation(navs, all)).find((item) => item.label === "Data Management")

  assert.deepEqual(
    group?.items.map((item) => item.to),
    ["/browser", "/tiers", "/events-target", "/table-catalog"],
  )
})

test("identity management keeps user groups before users", () => {
  const group = groupNavigation(getVisibleNavigation(navs, all)).find((item) => item.label === "Identity")

  assert.deepEqual(
    group?.items.map((item) => item.to),
    ["/access-keys", "/policies", "/user-groups", "/users", "/import-export", "/oidc"],
  )
})

test("administration contains the license after system settings", () => {
  const group = groupNavigation(getVisibleNavigation(navs, all)).find((item) => item.label === "Administration")

  assert.deepEqual(
    group?.items.map((item) => item.to),
    ["/settings", "/license"],
  )
})

test("event-only users retain a bucket entry without browser access or empty groups", () => {
  const groups = groupNavigation(getVisibleNavigation(navs, allow("/events")))
  assert.deepEqual(
    groups.map((group) => ({ label: group.label, links: group.items.map((item) => [item.label, item.to]) })),
    [{ label: "Data Management", links: [["Buckets", "/events"]] }],
  )
})

test("pool management preserves only the permitted operation", () => {
  const groups = groupNavigation(getVisibleNavigation(navs, allow("/pool-decommission")))
  assert.deepEqual(
    groups[0].items[0].children?.map((item) => item.to),
    ["/pool-decommission"],
  )
})

test("users without pool access have no empty pool menu", () => {
  assert.deepEqual(
    groupNavigation(getVisibleNavigation(navs, allow("/site-replication")))[0].items.map((item) => item.to),
    ["/site-replication"],
  )
})

test("the footer contains only documentation", () => {
  assert.deepEqual(
    footerNavs.map((item) => item.label),
    ["Documentation"],
  )
})

test("documentation remains available without dashboard permissions", () => {
  assert.deepEqual(
    getVisibleNavigation(footerNavs, () => false).map((item) => item.label),
    ["Documentation"],
  )
})

test("users without license permission do not see the license entry", () => {
  const group = groupNavigation(getVisibleNavigation(navs, allow("/settings"))).find(
    (item) => item.label === "Administration",
  )

  assert.deepEqual(
    group?.items.map((item) => item.to),
    ["/settings"],
  )
})

test("license-only users retain its administration entry", () => {
  assert.deepEqual(
    groupNavigation(getVisibleNavigation(navs, allow("/license"))).map((group) => ({
      label: group.label,
      links: group.items.map((item) => [item.label, item.to]),
    })),
    [{ label: "Administration", links: [["License", "/license"]] }],
  )
})

test("pool retirement keeps the approved Decommission label", () => {
  const group = groupNavigation(getVisibleNavigation(navs, all)).find((item) => item.label === "Cluster Management")
  const poolMenu = group?.items.find((item) => item.label === "Pool Management")

  assert.equal(poolMenu?.children?.find((item) => item.to === "/pool-decommission")?.label, "Decommission")
})

test("bucket settings, rules and migration keep the bucket sidebar entry active", () => {
  const bucket = navs.find((item) => item.key === "buckets")!
  for (const path of ["/browser/", "/buckets", "/events/", "/replication", "/lifecycle", "/on-demand-migration/"]) {
    assert.equal(isNavigationItemActive(bucket, path), true, path)
  }
  assert.equal(isNavigationItemActive(bucket, "/events-target"), false)
})

test("navigation matches path boundaries instead of similarly prefixed routes", () => {
  assert.equal(isNavigationItemActive({ label: "Home", to: "/" }, "/browser"), false)
  assert.equal(isNavigationItemActive({ label: "Users", to: "/users" }, "/users-archive"), false)
})

test("all menu destinations participate in permission-aware landing selection", () => {
  const paths = (items: NavItem[]): string[] =>
    items.flatMap((item) => (item.children ? paths(item.children) : item.to?.startsWith("/") ? [item.to] : []))
  for (const path of paths([...navs, ...footerNavs])) {
    assert.equal(MENU_CONTROLLED_DASHBOARD_ROUTES.includes(path), true, path)
    assert.equal(getFirstAccessibleDashboardRoute({ isAdmin: false, canAccessPath: allow(path) }), path)
  }
})

test("bucket-only rule permissions remain valid landing destinations", () => {
  for (const path of ["/events", "/replication", "/lifecycle"]) {
    assert.equal(getFirstAccessibleDashboardRoute({ isAdmin: false, canAccessPath: allow(path) }), path)
  }
})

test("bucket list breadcrumb contains no duplicate bucket label", () => {
  assert.deepEqual(breadcrumbs("/browser/"), [{ label: "Buckets", href: undefined }])
})

test("object breadcrumbs preserve bucket and folder paths with encoded identifiers", () => {
  assert.deepEqual(breadcrumbs("/browser/", "bucket=photos&key=2026%2Fdesign+files%2F"), [
    { label: "Buckets", href: "/browser" },
    { label: "photos", href: "/browser?bucket=photos" },
    { label: "2026", href: "/browser?bucket=photos&key=2026%2F" },
    { label: "design files", href: undefined },
  ])
})

test("event-only breadcrumbs never link to an inaccessible browser page", () => {
  assert.deepEqual(breadcrumbs("/events/", "bucket=photos", allow("/events")), [
    { label: "Buckets", href: "/events" },
    { label: "photos", href: undefined },
    { label: "Events" },
  ])
})

test("old migration deep links retain human labels and bucket context", () => {
  assert.deepEqual(
    breadcrumbs("/on-demand-migration", "bucket=photos").map((item) => item.label),
    ["Buckets", "photos", "On-demand migration"],
  )
})

test("nested pool and administration routes resolve their labels", () => {
  assert.deepEqual(
    breadcrumbs("/pool-decommission/").map((item) => item.label),
    ["Pool Management", "Decommission"],
  )
  assert.deepEqual(
    breadcrumbs("/license/").map((item) => item.label),
    ["License"],
  )
})
