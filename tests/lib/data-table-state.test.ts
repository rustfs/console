import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import ts from "typescript"
import type { DataTable as DataTableComponent } from "../../components/data-table/data-table"

const source = ts.transpileModule(
  readFileSync(new URL("../../components/data-table/data-table.tsx", import.meta.url), "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  },
).outputText
const dom = `import { createElement as h } from "${import.meta.resolve("react")}";`
const tags = {
  Table: "table",
  TableHeader: "thead",
  TableBody: "tbody",
  TableRow: "tr",
  TableHead: "th",
  TableCell: "td",
}
const mocks: Record<string, string> = {
  "react-i18next": "export const useTranslation = () => ({ t: (key) => key });",
  "@remixicon/react":
    "export const RiArrowUpDownLine = () => null, RiArrowUpSLine = () => null, RiArrowDownSLine = () => null;",
  "@/components/ui/table":
    dom +
    Object.entries(tags)
      .map(([name, tag]) => `export const ${name} = (props) => h("${tag}", props);`)
      .join("\n"),
  "@/components/ui/button": dom + 'export const Button = ({variant, ...props}) => h("button", props);',
  "@/components/ui/spinner": dom + 'export const Spinner = () => h("span", {"aria-hidden": true});',
  "@/components/ui/scroll-area": dom + 'export const ScrollArea = (props) => h("div", props);',
  "@/components/empty-state":
    dom +
    'export const EmptyState = ({title, description, children}) => h("div", null, h("h2", null, title), h("p", null, description), children);',
  "@/lib/utils": 'export const cn = (...values) => values.filter(Boolean).join(" ");',
}
const rewritten = source.replace(
  /from "([^"]+)"/g,
  (_, specifier: string) =>
    `from "${mocks[specifier] ? `data:text/javascript,${encodeURIComponent(mocks[specifier])}` : import.meta.resolve(specifier)}"`,
)
const { DataTable } = (await import(`data:text/javascript,${encodeURIComponent(rewritten)}`)) as {
  DataTable: typeof DataTableComponent
}
type Row = { version: string }
type Options = Omit<React.ComponentProps<typeof DataTableComponent<Row>>, "table"> & { data?: Row[] }
const columns: ColumnDef<Row>[] = [
  { accessorKey: "version", header: "Version" },
  { id: "actions", header: "Actions", cell: () => React.createElement("button", null, "Delete") },
]
function Table({ data = [{ version: "A-version-id" }], ...props }: Options) {
  // eslint-disable-next-line react-hooks/incompatible-library -- this test runs the actual table API without React Compiler
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })
  return React.createElement(DataTable<Row>, { table, emptyTitle: "No versions", ...props })
}
const render = (props: Options) => renderToStaticMarkup(React.createElement(Table, props))

test("collection tools remain outside the horizontal table and available during loading", () => {
  const html = render({ isLoading: true, toolbar: React.createElement("input", { "aria-label": "Search versions" }) })
  assert.match(html, /aria-label="Search versions"/)
  assert.match(html, /role="status"/)
  assert.ok(html.indexOf('aria-label="Search versions"') < html.indexOf('role="status"'))
})

test("collection tools precede the data table when rows are loaded", () => {
  const html = render({ toolbar: React.createElement("button", null, "Filter") })
  assert.ok(html.indexOf(">Filter<") < html.indexOf("<table"))
  assert.match(html, /A-version-id/)
})

test("loading a different object does not expose previous versions or their delete actions by default", () => {
  const html = render({ isLoading: true })
  assert.doesNotMatch(html, /A-version-id|>Delete</)
  assert.match(html, /role="status"/)
})

test("a refresh may explicitly retain rows from the same data scope", () => {
  const html = render({ isLoading: true, keepPreviousData: true })
  assert.match(html, /A-version-id/)
  assert.match(html, /aria-busy="true"/)
  assert.match(html, /Loading…/)
})

test("request failures hide rows by default and offer retry outside the horizontal table", () => {
  const html = render({ errorTitle: "Request failed", onRetry: () => {} })
  assert.doesNotMatch(html, /A-version-id|>Delete</)
  assert.match(html, /role="alert"/)
  assert.match(html, />Retry</)
  assert.ok(html.indexOf("</table>") < html.indexOf('role="alert"'))
})

test("same-scope refresh failures retain data with a persistent recovery action", () => {
  const html = render({ errorTitle: "Request failed", keepPreviousData: true, onRetry: () => {} })
  assert.match(html, /A-version-id/)
  assert.match(html, /Request failed/)
  assert.match(html, />Retry</)
  assert.doesNotMatch(html, /No versions/)
})

test("empty successful results remain distinct from loading and errors", () => {
  const html = render({ data: [] })
  assert.match(html, /No versions/)
  assert.doesNotMatch(html, /role="alert"|Loading…|>Retry</)
  assert.ok(html.indexOf("</table>") < html.indexOf("No versions"))
})

const largeData = Array.from({ length: 1000 }, (_, index) => ({ version: `version-${index}` }))

async function mountVirtualTable(t: TestContext, initialProps: Options = {}) {
  const browser = new Window({ innerHeight: 800 })
  Object.defineProperty(browser.HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 40 })
  browser.HTMLElement.prototype.getBoundingClientRect = function () {
    return new browser.DOMRect(0, this.tagName === "TBODY" ? 200 - browser.scrollY : 0, 800, 40)
  }
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previousDescriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }

  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  t.after(async () => {
    await React.act(async () => root.unmount())
    await browser.happyDOM.close()
    for (const [key, descriptor] of previousDescriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })

  let props: Options = { data: largeData, virtualizeRows: true, ...initialProps }
  const update = async (changes: Partial<Options> = {}) => {
    props = { ...props, ...changes }
    await React.act(async () => root.render(React.createElement(Table, props)))
  }
  const scrollTo = async (top: number) => {
    await React.act(async () => {
      browser.scrollTo({ top })
      browser.dispatchEvent(new browser.Event("scroll"))
    })
  }
  await update()
  return { container, update, scrollTo }
}

test("window virtualization limits mounted rows while announcing the complete loaded row count", async (t) => {
  const { container } = await mountVirtualTable(t)
  const rows = container.querySelectorAll("tbody tr[data-index]")
  assert.ok(rows.length > 0 && rows.length < 50)
  assert.equal(container.querySelector("table")?.getAttribute("aria-rowcount"), "1001")
  assert.equal(rows[0].getAttribute("aria-rowindex"), "2")
  const paddingHeight = Array.from(container.querySelectorAll("tbody tr[aria-hidden] td")).reduce(
    (total, cell) => total + Number.parseFloat((cell as unknown as HTMLTableCellElement).style.height),
    0,
  )
  assert.equal(rows.length * 40 + paddingHeight, largeData.length * 40)
})

test("scrolling a virtual table replaces mounted rows and preserves their absolute positions", async (t) => {
  const { container, scrollTo } = await mountVirtualTable(t)
  await scrollTo(20200)
  const first = container.querySelector("tbody tr[data-index]")
  const index = Number(first?.getAttribute("data-index"))
  assert.ok(index > 400)
  assert.equal(first?.getAttribute("aria-rowindex"), String(index + 2))
  assert.ok(first?.textContent?.includes(`version-${index}`))
  assert.equal(container.querySelector("tbody tr[aria-hidden] td")?.getAttribute("style"), `height: ${index * 40}px;`)
  await scrollTo(0)
  assert.ok(container.querySelector("tbody tr[data-index]")?.textContent?.includes("version-0"))
})

test("virtualized tables update total rows after appending and discard rows during a scope reload", async (t) => {
  const { container, update, scrollTo } = await mountVirtualTable(t)
  await scrollTo(20200)
  await update({ data: [...largeData, { version: "appended-version" }] })
  assert.equal(container.querySelector("table")?.getAttribute("aria-rowcount"), "1002")
  await update({ isLoading: true })
  assert.equal(container.querySelectorAll("tbody tr[data-index]").length, 0)
  assert.ok(container.querySelector('[role="status"]'))
  await scrollTo(0)
  await update({ data: [], isLoading: false })
  assert.ok(container.textContent?.includes("No versions"))
})

test("tables retain all rows unless window virtualization is explicitly enabled", () => {
  const html = render({ data: largeData })
  assert.equal((html.match(/>Delete</g) ?? []).length, largeData.length)
  assert.doesNotMatch(html, /aria-rowcount|data-index/)
})
