import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
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
