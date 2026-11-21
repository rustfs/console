import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"

const moduleUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`
const imports: Record<string, string> = {
  "react/jsx-runtime": import.meta.resolve("react/jsx-runtime"),
  "react-i18next": moduleUrl(
    `import { createInstance } from "${import.meta.resolve("i18next")}"; const instance = createInstance(); await instance.init({lng:"en", resources:{en:{translation:${readFileSync(new URL("../../i18n/locales/en-US.json", import.meta.url), "utf8")}}}, interpolation:{escapeValue:false,prefix:"{",suffix:"}"}}); export const useTranslation = () => ({t:instance.t.bind(instance)});`,
  ),
  "@/components/ui/spinner": moduleUrl(
    `import React from "${import.meta.resolve("react")}"; export const Spinner = () => React.createElement("span", {role: "status", "aria-label": "Loading"});`,
  ),
  "@/lib/functions": new URL("../../lib/functions.ts", import.meta.url).href,
}
const source = ts
  .transpileModule(readFileSync(new URL("../../components/buckets/usage-value.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  })
  .outputText.replace(/from "([^"]+)"/g, (_, specifier: string) => {
    assert.ok(imports[specifier], `Unexpected import: ${specifier}`)
    return `from "${imports[specifier]}"`
  })
const { BucketUsageValue, BucketUsageStatus, BucketScanNotice } = await import(moduleUrl(source))
const progress = {
  stage: "scanning",
  updatedAt: 1800000000000,
  objectsCount: 7,
  sizeBytes: 71,
  sourcesObserved: 1,
  sourcesTotal: 2,
}
const render = (props: Record<string, unknown>) =>
  renderToStaticMarkup(
    React.createElement(
      "div",
      null,
      React.createElement(BucketUsageValue, { kind: "objects", loading: false, ...props }),
      React.createElement(BucketUsageStatus, { bucketName: props.bucketName ?? "bucket", status: props.status }),
      React.createElement(BucketScanNotice, { statuses: new Map(props.status ? [["bucket", props.status]] : []) }),
    ),
  )

test("first scan shows observed counts with an explicit incomplete-total explanation", () => {
  const html = render({ status: { progress } })
  assert.match(html, /7 scanned/)
  assert.match(html, /Scan in progress/)
  assert.match(html, /Scanned usage is not the bucket total/)
  assert.match(html, /Checkpoint:/)
})

test("rescan keeps the complete total and shows progress independently", () => {
  const html = render({ value: 90, status: { updatedAt: 1700000000000, progress } })
  assert.match(html, />90<\/span>/)
  assert.match(html, /Last complete scan:/)
  assert.match(html, /7 scanned/)
  assert.doesNotMatch(html, />97<\/span>/)
})

test("enumeration cannot render an empty bucket and waiting sources remain explicit", () => {
  const html = render({
    status: { progress: { ...progress, stage: "enumerating", objectsCount: undefined, sizeBytes: undefined } },
  })
  assert.match(html, /Enumerating objects/)
  assert.doesNotMatch(html, /0 scanned/)
  assert.match(
    render({ status: { progress: { ...progress, stage: "awaiting_sources" } } }),
    /Waiting for scanner sources/,
  )
})

test("loading, missing measurement, failed coverage and confirmed empty usage stay distinct", () => {
  assert.match(render({ loading: true }), /role="status"/)
  assert.match(render({ unmeasured: true }), /Not measured/)
  assert.match(render({}), /Unavailable/)
  assert.match(render({ value: 0 }), />0<\/span>/)
})

test("capacity and completed traversal stay diagnostic and announce each bucket once", () => {
  const status = { progress: { ...progress, stage: "completed", sizeBytes: 1024, sourcesObserved: 2 } }
  const size = render({ bucketName: "bucket", kind: "size", status })
  assert.match(size, /1.0 KiB scanned/)
  assert.match(size, /Traversal complete/)
  assert.match(size, /Scanned usage is not the bucket total/)
  assert.equal(size.match(/aria-live/g)?.length, 1)
  const count = render({ bucketName: "bucket", status })
  assert.match(count, /aria-live="polite"/)
  assert.match(count, /class="sr-only">Scan progress for bucket: /)
  assert.doesNotMatch(count, /aria-label/)
})

test("complete measurement and checkpoint retain their separate date values", () => {
  const html = render({ value: 90, status: { updatedAt: 1700000000000, progress } })
  assert.match(html, /Last complete scan: [^<]*2023/)
  assert.match(html, /Checkpoint: [^<]*2027/)
})
