import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Window } from "happy-dom"
import ts from "typescript"

const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`
const imports: Record<string, string> = {
  "react/jsx-runtime": import.meta.resolve("react/jsx-runtime"),
  "next/link": moduleUrl(`import React from "${import.meta.resolve("react")}";
    export default props => React.createElement("a", props);`),
  "react-i18next": moduleUrl('export const useTranslation = () => ({t: key => key, i18n: {language: "en-US"}});'),
  "@/lib/account-bucket-usage": new URL("../../lib/account-bucket-usage.js", import.meta.url).href,
  "@/lib/functions": new URL("../../lib/functions.ts", import.meta.url).href,
}
const source = ts
  .transpileModule(readFileSync(new URL("../../components/buckets/usage-overview.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  })
  .outputText.replace(/from "([^"]+)"/g, (_, specifier: string) => {
    assert.ok(imports[specifier], `Unexpected import: ${specifier}`)
    return `from "${imports[specifier]}"`
  })
const { BucketUsageOverview } = await import(moduleUrl(source))

async function render(
  entries: [string, number][],
  check: (document: Window["document"]) => void,
  options: { names?: string[]; unavailable?: boolean } = {},
) {
  const browser = new Window()
  try {
    browser.document.body.innerHTML = renderToStaticMarkup(
      React.createElement(BucketUsageOverview, {
        names: options.names ?? entries.map(([name]) => name),
        usage: new Map(entries.map(([name, sizeBytes]) => [name, { sizeBytes, objectsCount: 1 }])),
        unavailable: options.unavailable ?? false,
      }),
    )
    check(browser.document)
  } finally {
    await browser.happyDOM.close()
  }
}

test("bucket distribution gives every segment a matching legend, size and percentage", async () => {
  await render(
    [
      ["small", 1024],
      ["large", 3072],
    ],
    (document) => {
      const rows = [...document.querySelectorAll("li")]
      assert.deepEqual(
        rows.map((row) => row.textContent),
        ["large3.0 KiB75%", "small1.0 KiB25%"],
      )
      const segments = [...document.querySelectorAll("div[aria-hidden] > span")]
      assert.notEqual(segments[0].className, segments[1].className)
      assert.deepEqual(
        segments.map((segment) => segment.className),
        rows.map((row) => row.querySelector("span")!.className.split(" ").at(-1)),
      )
      assert.deepEqual(
        rows.map((row) => row.querySelector("a")!.getAttribute("href")),
        ["/browser?bucket=large", "/browser?bucket=small"],
      )
    },
  )
})

test("buckets beyond the first four have an explicit combined legend", async () => {
  await render(
    [
      ["a", 40],
      ["b", 20],
      ["c", 15],
      ["d", 10],
      ["e", 8],
      ["f", 7],
      ["empty", 0],
    ],
    (document) => {
      const rows = [...document.querySelectorAll("li")]
      assert.equal(rows.length, 5)
      assert.equal(rows[4].textContent, "Other buckets15.0 B15%")
      assert.equal(rows[4].querySelector("a"), null)
      assert.equal(document.querySelectorAll("div[aria-hidden] > span").length, 5)
    },
  )
})

test("tiny nonzero buckets are not rounded to zero or hidden behind a 100 percent label", async () => {
  await render(
    [
      ["datasets", 5000000],
      ["tiny", 46],
    ],
    (document) => {
      assert.deepEqual(
        [...document.querySelectorAll("li")].map((row) => row.textContent),
        ["datasets4.8 MiB>99.9%", "tiny46.0 B<0.1%"],
      )
    },
  )
})

test("a single nonempty bucket has an explicit 100 percent legend", async () => {
  await render(
    [
      ["only", 1024],
      ["empty", 0],
    ],
    (document) => {
      assert.deepEqual(
        [...document.querySelectorAll("li")].map((row) => row.textContent),
        ["only1.0 KiB100%"],
      )
    },
  )
})

test("distribution excludes buckets outside the visible account scope", async () => {
  await render(
    [
      ["visible", 20],
      ["hidden", 80],
    ],
    (document) => {
      assert.equal(document.querySelector("li")?.textContent, "visible20.0 B100%")
      assert.equal(document.body.textContent.includes("hidden"), false)
    },
    { names: ["visible"] },
  )
})

test("empty, missing and loading statistics do not fabricate a distribution", async () => {
  for (const options of [{ names: [] }, { names: ["empty"] }, { names: ["missing"] }, { unavailable: true }]) {
    await render(
      [["empty", 0]],
      (document) => {
        assert.equal(document.querySelector("ul"), null)
      },
      options,
    )
  }
})
