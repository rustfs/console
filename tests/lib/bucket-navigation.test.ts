import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Window } from "happy-dom"
import ts from "typescript"
import {
  getBucketEntryRoute,
  getBucketNavigationItems,
  isBucketNavigationItemActive,
} from "../../lib/bucket-navigation"

const allowAll = () => true
const allowEvents = (path: string) => path.split("?")[0] === "/events"

test("the default bucket entry opens objects and falls back to an allowed rule page", () => {
  assert.equal(getBucketEntryRoute(allowAll), "/browser")
  for (const route of ["/replication", "/events", "/lifecycle"]) {
    assert.equal(
      getBucketEntryRoute((path) => path === route),
      route,
    )
  }
  assert.equal(
    getBucketEntryRoute(() => false),
    null,
  )
})

test("bucket navigation evaluates the known bucket rather than a global page scope", () => {
  const permission = (path: string) =>
    new URL(path, "https://fixture.invalid").searchParams.get("bucket") === "allowed-bucket"
  assert.ok(getBucketNavigationItems("allowed-bucket", permission).length > 0)
  assert.deepEqual(getBucketNavigationItems("denied-bucket", permission), [])
})

test("bucket navigation preserves the selected bucket in every destination", () => {
  const name = "logs + archive/2026&copy"
  const items = getBucketNavigationItems(name, allowAll)
  assert.deepEqual(
    items.map((item) => item.route),
    ["/browser", "/buckets", "/replication", "/events", "/lifecycle"],
  )
  for (const item of items) {
    const url = new URL(item.href, "https://console.example.test")
    assert.equal(url.pathname, item.route)
    assert.deepEqual([...url.searchParams], [["bucket", name]])
  }
})

test("rule-only permission keeps its bucket destination without exposing objects or settings", () => {
  assert.deepEqual(getBucketNavigationItems("logs", allowEvents), [
    { route: "/events", label: "Events", href: "/events?bucket=logs" },
  ])
})

test("an unselected bucket or an account with no allowed destination has no local navigation", () => {
  assert.deepEqual(getBucketNavigationItems("", allowAll), [])
  assert.deepEqual(
    getBucketNavigationItems("logs", () => false),
    [],
  )
})

test("current navigation recognizes trailing slashes and the migration settings subtask", () => {
  assert.equal(isBucketNavigationItemActive("/events", "/events/"), true)
  assert.equal(isBucketNavigationItemActive("/events", "/events-target"), false)
  assert.equal(isBucketNavigationItemActive("/buckets", "/on-demand-migration/"), true)
  assert.equal(isBucketNavigationItemActive("/browser", "/buckets"), false)
})

const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`
const mocksKey = Symbol.for("bucket-navigation-test")
const imports: Record<string, string> = {
  "react/jsx-runtime": import.meta.resolve("react/jsx-runtime"),
  "next/link": moduleUrl(`import React from "${import.meta.resolve("react")}";
    export default props => React.createElement("a", props);`),
  "next/navigation": moduleUrl(
    'export const usePathname = () => globalThis[Symbol.for("bucket-navigation-test")].pathname;',
  ),
  "react-i18next": moduleUrl("export const useTranslation = () => ({t: key => key});"),
  "@/hooks/use-permissions": moduleUrl(
    'export const usePermissions = () => globalThis[Symbol.for("bucket-navigation-test")].permissions;',
  ),
  "@/lib/bucket-navigation": new URL("../../lib/bucket-navigation.ts", import.meta.url).href,
  "@/lib/utils": moduleUrl("export const cn = (...values) => values.filter(Boolean).join(' ');"),
}
const source = ts
  .transpileModule(readFileSync(new URL("../../components/buckets/navigation.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  })
  .outputText.replace(/from "([^"]+)"/g, (_, specifier: string) => {
    assert.ok(imports[specifier], `Unexpected import: ${specifier}`)
    return `from "${imports[specifier]}"`
  })
const { BucketNavigation } = await import(moduleUrl(source))
imports["@/components/buckets/navigation"] = moduleUrl(source)
imports["@remixicon/react"] = import.meta.resolve("@remixicon/react")
for (const name of ["page-header", "buckets/scoped-header"]) {
  const componentSource = ts
    .transpileModule(readFileSync(new URL(`../../components/${name}.tsx`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    })
    .outputText.replace(/from "([^"]+)"/g, (_, specifier: string) => {
      assert.ok(imports[specifier], `Unexpected import: ${specifier}`)
      return `from "${imports[specifier]}"`
    })
  imports[`@/components/${name}`] = moduleUrl(componentSource)
}
const { BucketScopedHeader } = await import(imports["@/components/buckets/scoped-header"])

async function render(
  options: {
    bucketName?: string
    pathname?: string
    canAccessPath?: (path: string) => boolean
    hasResolvedAdmin?: boolean
    hasFetchedPolicy?: boolean
    headerTitle?: string
  },
  check: (document: Window["document"]) => void,
) {
  const browser = new Window()
  Reflect.set(globalThis, mocksKey, {
    pathname: options.pathname ?? "/events/",
    permissions: {
      isAdmin: false,
      canAccessPath: options.canAccessPath ?? allowAll,
      hasResolvedAdmin: options.hasResolvedAdmin ?? true,
      hasFetchedPolicy: options.hasFetchedPolicy ?? true,
    },
  })
  try {
    browser.document.body.innerHTML = renderToStaticMarkup(
      options.headerTitle
        ? React.createElement(BucketScopedHeader, {
            title: options.headerTitle,
            bucketName: options.bucketName ?? "photos",
            href: "/events",
            actions: React.createElement("button", { type: "button" }, "Add rule"),
          })
        : React.createElement(BucketNavigation, { bucketName: options.bucketName ?? "photos" }),
    )
    check(browser.document)
  } finally {
    Reflect.deleteProperty(globalThis, mocksKey)
    await browser.happyDOM.close()
  }
}

test("bucket navigation exposes real links and identifies exactly one current destination", async () => {
  await render({}, (document) => {
    const nav = document.querySelector('nav[aria-label="Bucket navigation"]')!
    assert.deepEqual(
      [...nav.querySelectorAll("a")].map((link) => [link.textContent, link.getAttribute("href")]),
      [
        ["Objects", "/browser?bucket=photos"],
        ["Bucket Settings", "/buckets?bucket=photos"],
        ["Bucket Replication", "/replication?bucket=photos"],
        ["Events", "/events?bucket=photos"],
        ["Lifecycle", "/lifecycle?bucket=photos"],
      ],
    )
    assert.equal(nav.querySelectorAll('[aria-current="page"]').length, 1)
    assert.equal(nav.querySelector('[aria-current="page"]')?.textContent, "Events")
    assert.equal(nav.querySelector('[role="tab"]'), null)
  })
})

test("local navigation stays hidden until the selected bucket and permissions are known", async () => {
  for (const options of [
    { bucketName: "" },
    { hasResolvedAdmin: false },
    { hasFetchedPolicy: false },
    { canAccessPath: () => false },
  ]) {
    await render(options, (document) => assert.equal(document.querySelector("nav"), null))
  }
})

test("the rendered navigation keeps a rule-only account in its permitted bucket workspace", async () => {
  await render({ canAccessPath: allowEvents }, (document) => {
    assert.deepEqual(
      [...document.querySelectorAll("a")].map((link) => link.getAttribute("href")),
      ["/events?bucket=photos"],
    )
  })
})

test("bucket headers retain the bucket identity and rule actions with an accessible return destination", async () => {
  for (const canAccessPath of [allowAll, allowEvents]) {
    await render({ headerTitle: "Events", canAccessPath }, (document) => {
      assert.deepEqual(
        [...document.querySelectorAll("h1")].map((heading) => heading.textContent),
        ["photos"],
      )
      const header = document.querySelector("header")!
      assert.equal(header.querySelector("button")?.textContent, "Add rule")
      assert.equal(header.querySelector("a")?.getAttribute("href"), canAccessPath("/browser") ? "/browser" : "/events")
      assert.equal(document.querySelectorAll('nav[aria-label="Bucket navigation"]').length, 1)
    })
  }
})
