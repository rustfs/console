import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Window } from "happy-dom"
import ts from "typescript"

const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`
const mocksKey = Symbol.for("top-nav-breadcrumb-test")
const imports: Record<string, string> = {
  react: import.meta.resolve("react"),
  "react/jsx-runtime": import.meta.resolve("react/jsx-runtime"),
  "next/link": moduleUrl(`import React from "${import.meta.resolve("react")}";
    export default props => React.createElement("a", props);`),
  "next/navigation": moduleUrl(`
    export const usePathname = () => globalThis[Symbol.for("top-nav-breadcrumb-test")].pathname;
    export const useSearchParams = () => globalThis[Symbol.for("top-nav-breadcrumb-test")].searchParams;`),
  "react-i18next": moduleUrl("export const useTranslation = () => ({ t: key => key });"),
  "@/hooks/use-permissions": moduleUrl(
    'export const usePermissions = () => globalThis[Symbol.for("top-nav-breadcrumb-test")];',
  ),
  "@/lib/theme/manifest": moduleUrl("export const getThemeManifest = () => ({ links: {} });"),
}

for (const [name, path] of [
  ["@/config/navs", "config/navs.ts"],
  ["@/components/ui/breadcrumb", "components/ui/breadcrumb.tsx"],
  ["@/components/top-nav-breadcrumb", "components/top-nav-breadcrumb.tsx"],
]) {
  const source = ts
    .transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    })
    .outputText.replace(/from "([^"]+)"/g, (_, specifier: string) => {
      return `from "${imports[specifier] ?? import.meta.resolve(specifier)}"`
    })
  imports[name] = moduleUrl(source)
}
const { TopNavBreadcrumb } = await import(imports["@/components/top-nav-breadcrumb"])

async function render(
  pathname: string,
  query: string,
  canAccessPath: (path: string) => boolean,
  check: (document: Window["document"]) => void,
) {
  const browser = new Window()
  Reflect.set(globalThis, mocksKey, { pathname, searchParams: new URLSearchParams(query), canAccessPath })
  try {
    browser.document.body.innerHTML = renderToStaticMarkup(React.createElement(TopNavBreadcrumb))
    check(browser.document)
  } finally {
    Reflect.deleteProperty(globalThis, mocksKey)
    await browser.happyDOM.close()
  }
}

const all = () => true

test("recovery navigation identifies its page with the human-readable label", async () => {
  await render(
    "/recovery/",
    "",
    (path) => path === "/recovery",
    (document) => {
      assert.deepEqual(
        [...document.querySelectorAll('[aria-current="page"]')].map((node) => node.textContent),
        ["Recovery & Integrity"],
      )
      assert.equal(document.querySelectorAll("a").length, 0)
    },
  )
})

for (const [pathname, current] of [
  ["/rebalance/", "Rebalance"],
  ["/pool-decommission/", "Decommission"],
]) {
  test(`${pathname} announces only the destination as current and keeps the pool ancestor plain`, async () => {
    await render(pathname, "", all, (document) => {
      assert.deepEqual(
        [...document.querySelectorAll('[aria-current="page"]')].map((node) => node.textContent),
        [current],
      )
      const ancestor = document.querySelector('[data-slot="breadcrumb-item"] > span')!
      assert.equal(ancestor.textContent, "Pool Management")
      assert.equal(ancestor.hasAttribute("role"), false)
      assert.equal(ancestor.hasAttribute("aria-current"), false)
      assert.equal(ancestor.hasAttribute("aria-disabled"), false)
    })
  })
}

test("an events-only account gets one current page and no inaccessible bucket link", async () => {
  await render(
    "/events/",
    "bucket=photos",
    (path) => path === "/events",
    (document) => {
      assert.deepEqual(
        [...document.querySelectorAll('[aria-current="page"]')].map((node) => node.textContent),
        ["Events"],
      )
      assert.deepEqual(
        [...document.querySelectorAll("a")].map((link) => [link.textContent, link.getAttribute("href")]),
        [["Buckets", "/events"]],
      )
      const bucket = document.querySelectorAll('[data-slot="breadcrumb-item"]')[1].firstElementChild!
      assert.equal(bucket.textContent, "photos")
      assert.equal(bucket.hasAttribute("role"), false)
      assert.equal(bucket.hasAttribute("aria-current"), false)
    },
  )
})

test("object ancestors remain native links and only the final folder is current", async () => {
  await render("/browser/", "bucket=photos&key=2026%2Fdesign+files%2F", all, (document) => {
    assert.deepEqual(
      [...document.querySelectorAll("a")].map((link) => [link.textContent, link.getAttribute("href")]),
      [
        ["Buckets", "/browser"],
        ["photos", "/browser?bucket=photos"],
        ["2026", "/browser?bucket=photos&key=2026%2F"],
      ],
    )
    assert.deepEqual(
      [...document.querySelectorAll('[aria-current="page"]')].map((node) => node.textContent),
      ["design files"],
    )
  })
})

test("a single breadcrumb still identifies the current page", async () => {
  await render("/browser/", "", all, (document) => {
    assert.deepEqual(
      [...document.querySelectorAll('[aria-current="page"]')].map((node) => node.textContent),
      ["Buckets"],
    )
    assert.equal(document.querySelectorAll("a").length, 0)
  })
})
