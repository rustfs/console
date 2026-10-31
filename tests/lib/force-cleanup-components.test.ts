import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { createRoot } from "react-dom/client"
import { Window, type Element as HappyElement } from "happy-dom"
import ts from "typescript"
import { isForceCleanupTarget } from "../../lib/permission-capabilities"
import type { ObjectList as ObjectListComponent } from "../../components/object/list"
import type { TaskItem as TaskItemComponent } from "../../components/tasks/item"
import type { AnyTask } from "../../contexts/task-context"

type ObjectListProps = React.ComponentProps<typeof ObjectListComponent>
type UiProps = {
  children?: React.ReactNode
  render?: React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>
  open?: boolean
  onOpenChange?: (open: boolean) => void
  actions?: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>
type ObjectRow = { Key: string; type: "object" | "prefix" }
type MockTable = {
  data: ObjectRow[]
  columns: { id: string; cell?: (props: { row: { id: string; original: ObjectRow } }) => React.ReactNode }[]
  getColumn: () => { setFilterValue: () => void }
  resetRowSelection: () => void
}

const mocksKey = Symbol.for("force-cleanup-components")
const dialogContext = React.createContext<(open: boolean) => void>(() => {})
const menuContext = React.createContext({
  open: false,
  setOpen: (open: boolean) => {
    void open
  },
})
const passthrough = ({ children }: UiProps) => React.createElement("div", null, children)
const button = ({ children, render, actions, open, onOpenChange, ...props }: UiProps) => {
  void render
  void actions
  void open
  void onOpenChange
  const { variant, size, ...domProps } = props as typeof props & { variant?: string; size?: string }
  void variant
  void size
  return React.createElement("button", domProps, children)
}
const mocks: Record<string, unknown> = {
  Button: button,
  Link: ({ children }: UiProps) => React.createElement("a", null, children),
  AlertDialog: ({ open, children, onOpenChange }: UiProps) =>
    open
      ? React.createElement(
          dialogContext.Provider,
          { value: onOpenChange ?? (() => {}) },
          React.createElement("div", { role: "alertdialog" }, children),
        )
      : null,
  AlertDialogAction: button,
  AlertDialogCancel: function Cancel(props: UiProps) {
    const setOpen = React.useContext(dialogContext)
    return button({ ...props, onClick: () => setOpen(false) })
  },
  AlertDialogTitle: ({ children }: UiProps) => React.createElement("h2", null, children),
  Dialog: ({ open, children }: UiProps) => (open ? passthrough({ children }) : null),
  DropdownMenu: function Menu({ children }: UiProps) {
    const [open, setOpen] = React.useState(false)
    return React.createElement(menuContext.Provider, { value: { open, setOpen } }, children)
  },
  DropdownMenuTrigger: function Trigger({ render }: UiProps) {
    const { setOpen } = React.useContext(menuContext)
    return render ? React.cloneElement(render, { onClick: () => setOpen(true) }) : null
  },
  DropdownMenuContent: function Content({ children }: UiProps) {
    const { open } = React.useContext(menuContext)
    return open ? React.createElement("div", { role: "menu" }, children) : null
  },
  DropdownMenuItem: function Item(props: UiProps) {
    const { setOpen } = React.useContext(menuContext)
    return button({
      ...props,
      role: "menuitem",
      onClick: (event) => {
        props.onClick?.(event)
        setOpen(false)
      },
    })
  },
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked: boolean
    onCheckedChange: (v: boolean) => void
    id: string
  }) =>
    React.createElement("input", { type: "checkbox", checked, id, onChange: (e) => onCheckedChange(e.target.checked) }),
  PageHeader: ({ children, actions }: UiProps) => React.createElement("header", null, actions, children),
  DataTable: ({ table }: { table: MockTable }) =>
    React.createElement(
      "section",
      null,
      table.data.map((row) =>
        React.createElement(
          "div",
          { key: row.Key, "data-object-key": row.Key },
          table.columns.map((column) =>
            React.createElement("div", { key: column.id }, column.cell?.({ row: { original: row, id: row.Key } })),
          ),
        ),
      ),
    ),
  useDataTable: (table: MockTable) => ({
    table: { ...table, getColumn: () => ({ setFilterValue() {} }), resetRowSelection() {} },
    selectedRowIds: [],
  }),
  useLocalStorage: (_key: string, initial: boolean) => React.useState(initial),
  useObjectListPagination() {},
  formatBytes: (bytes: number) => String(bytes),
  formatDateTime: (date: string) => date,
}
for (const name of [
  "AlertDialogContent",
  "AlertDialogDescription",
  "AlertDialogFooter",
  "AlertDialogHeader",
  "DialogContent",
  "DialogDescription",
  "DialogFooter",
  "DialogHeader",
  "DialogTitle",
]) {
  mocks[name] = passthrough
}
Reflect.set(globalThis, mocksKey, mocks)

async function importComponent(relativePath: string) {
  const source = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const testSource = source.replace(
    /import\s+([\s\S]*?)\s+from\s+"([^"]+)";/g,
    (statement, bindings: string, specifier: string) => {
      const realImport =
        specifier === "react" ||
        specifier === "react/jsx-runtime" ||
        (specifier.startsWith("@/lib/") && !specifier.includes("feedback"))
      if (realImport && specifier !== "@/lib/functions") {
        const url = specifier.startsWith("@/")
          ? new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href
          : import.meta.resolve(specifier)
        return `import ${bindings} from "${url}";`
      }
      if (specifier === "@/components/danger-button") return 'const DANGER_BUTTON_CLASS = "danger";'
      const names = bindings
        .replace(/[{}\s]/g, "")
        .split(",")
        .filter(Boolean)
      const exports = names
        .map((name) => {
          if (specifier === "@remixicon/react") return `export const ${name} = () => null;`
          const defaultExport = specifier === "next/link"
          const lookup = defaultExport ? "Link" : name
          const noop = lookup.startsWith("use") ? "undefined" : "null"
          return `const ${name} = (...args) => globalThis[Symbol.for("force-cleanup-components")]["${lookup}"]?.(...args) ?? ${noop}; export ${defaultExport ? `default ${name}` : `{ ${name} }`};`
        })
        .join("\n")
      return statement.replace(specifier, `data:text/javascript,${encodeURIComponent(exports)}`)
    },
  )
  return import(`data:text/javascript,${encodeURIComponent(testSource)}`)
}
const { ObjectList } = (await importComponent("../../components/object/list.tsx")) as {
  ObjectList: typeof ObjectListComponent
}
const { TaskItem } = (await importComponent("../../components/tasks/item.tsx")) as {
  TaskItem: typeof TaskItemComponent
}
const bucket = "test-bucket"
const fullKey = "parent/中文%2F+space /child/"
const consequences =
  "Permanently delete all objects, versions, delete markers, and residual files in this folder. This cannot be undone."

async function mount(
  t: TestContext,
  initialProps: ObjectListProps,
  versioning: string = "Suspended",
  calculatePrefixSummary?: (key: string, signal: AbortSignal) => Promise<{ size: number; lastModified?: Date }>,
) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const descriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const folders = [fullKey, "other/", "/", "///"]
  const folderTasks: unknown[][] = []
  const objectTasks: unknown[][] = []
  const errors: string[] = []
  let forceAllowed = true
  const canCapability = (capability: string, target: { bucket?: string; objectKey?: string }) =>
    capability === "objects.forceCleanup"
      ? forceAllowed && isForceCleanupTarget(target)
      : capability === "objects.delete"
  const objectApi = {
    listObject: async () => ({
      CommonPrefixes: folders.map((Prefix) => ({ Prefix })),
      Contents: [{ Key: "file.txt" }, { Key: "literal-object/" }],
    }),
    calculatePrefixSummary,
    getSignedUrl: async () => "",
    renameObject: async () => {},
  }
  const versioningApi = {
    getBucketVersioning: versioning === "unknown" ? () => new Promise(() => {}) : async () => ({ Status: versioning }),
  }
  const translate = (key: string) => key
  const tasks: never[] = []
  const feedback = { error: (error: string) => errors.push(error), success() {}, warning() {} }
  Object.assign(mocks, {
    useTranslation: () => ({ t: translate }),
    useMessage: () => feedback,
    useApi: () => ({}),
    useObject: () => objectApi,
    useBucket: () => versioningApi,
    usePermissions: () => ({ canCapability }),
    useAddDeleteKeys:
      () =>
      (...args: unknown[]) =>
        objectTasks.push(args),
    useAddDeleteFolder:
      () =>
      (...args: unknown[]) =>
        folderTasks.push(args),
    useTasks: () => tasks,
    useTaskManager: () => ({ cancelTask() {}, removeFinishedTask() {} }),
  })
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  let props = initialProps
  const render = async (changes: Partial<ObjectListProps> = {}) => {
    props = { ...props, ...changes }
    await React.act(async () => root.render(React.createElement(ObjectList, props)))
  }
  const click = async (element: HappyElement | null) => {
    assert.ok(element, "expected an interactive element")
    await React.act(async () => (element as unknown as HTMLButtonElement).click())
  }
  const findButton = (label: string, scope: HappyElement = container) =>
    Array.from(scope.querySelectorAll("button")).find((element) => element.textContent === label) ?? null
  const openMenu = async (key: string) => {
    const row = Array.from(container.querySelectorAll("[data-object-key]")).find(
      (element) => element.getAttribute("data-object-key") === key,
    )
    assert.ok(row, `expected row ${key}`)
    await click(row.querySelector('button[aria-label^="Actions:"]'))
    return row
  }
  t.after(async () => {
    await React.act(async () => root.unmount())
    await browser.happyDOM.close()
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  await render()
  return {
    container,
    root,
    render,
    click,
    findButton,
    openMenu,
    folderTasks,
    objectTasks,
    errors,
    async denyForceCleanup() {
      forceAllowed = false
      await render()
    },
  }
}
const props: ObjectListProps = { bucket, path: "", onOpenInfo() {}, onUploadClick() {}, onPreview() {} }

test("object refresh is available in the header and works without opening a menu", async (t) => {
  let refreshes = 0
  const ui = await mount(t, {
    ...props,
    onRefresh: () => {
      refreshes += 1
    },
  })
  const header = ui.container.querySelector("header")!
  await ui.click(ui.findButton("Refresh", header))
  assert.equal(refreshes, 1)
  assert.equal(header.querySelector('[aria-label="More actions"]'), null)
})

test("folder force cleanup confirms the exact bucket and prefix with irreversible consequences", async (t) => {
  const ui = await mount(t, props)
  const row = await ui.openMenu(fullKey)
  await ui.click(ui.findButton("Force Cleanup Folder", row))
  const dialog = ui.container.querySelector('[role="alertdialog"]')
  assert.ok(dialog)
  assert.equal(dialog.querySelector("bdi")?.textContent, `${bucket}/${fullKey}`)
  assert.ok(dialog.textContent?.includes(consequences))
  assert.equal(dialog.querySelector('input[type="checkbox"]'), null)
  await ui.click(ui.findButton("Force Cleanup Folder", dialog))
  assert.deepEqual(ui.folderTasks, [[fullKey, bucket, { forceDelete: true }]])
  assert.deepEqual(ui.objectTasks, [])
  assert.equal(ui.container.querySelector('[role="alertdialog"]'), null)
})

test("canceling folder force cleanup creates no delete task", async (t) => {
  const ui = await mount(t, props)
  const row = await ui.openMenu(fullKey)
  await ui.click(ui.findButton("Force Cleanup Folder", row))
  const dialog = ui.container.querySelector('[role="alertdialog"]')
  assert.ok(dialog)
  await ui.click(ui.findButton("Cancel", dialog))
  assert.deepEqual(ui.folderTasks, [])
  assert.equal(ui.container.querySelector('[role="alertdialog"]'), null)
})

test("files and bucket-root prefixes offer no force cleanup action", async (t) => {
  const ui = await mount(t, props)
  for (const key of ["file.txt", "literal-object/", "/", "///"]) {
    const row = await ui.openMenu(key)
    assert.equal(ui.findButton("Force Cleanup Folder", row), null, key)
  }
})

test("an account without force cleanup permission retains ordinary deletion only", async (t) => {
  const ui = await mount(t, props)
  await ui.denyForceCleanup()
  const row = await ui.openMenu(fullKey)
  assert.equal(ui.findButton("Force Cleanup Folder", row), null)
  assert.ok(ui.findButton("Delete", row))
})

test("ordinary folder deletion does not opt into force cleanup", async (t) => {
  const ui = await mount(t, props)
  const row = await ui.openMenu(fullKey)
  await ui.click(ui.findButton("Delete", row))
  const dialog = ui.container.querySelector('[role="alertdialog"]')
  assert.ok(dialog)
  await ui.click(ui.findButton("Delete", dialog))
  assert.deepEqual(ui.folderTasks, [[fullKey, bucket]])
})

for (const versioning of ["unknown", "Enabled", "Suspended"]) {
  test(`force cleanup remains independent when versioning is ${versioning}`, async (t) => {
    const ui = await mount(t, props, versioning)
    const row = await ui.openMenu(fullKey)
    const menuItem = ui.findButton("Force Cleanup Folder", row)
    assert.ok(menuItem)
    assert.equal((menuItem as unknown as HTMLButtonElement).disabled, false)
    await ui.click(menuItem)
    const dialog = ui.container.querySelector('[role="alertdialog"]')
    assert.ok(dialog)
    const confirm = ui.findButton("Force Cleanup Folder", dialog)
    assert.ok(confirm)
    assert.equal((confirm as unknown as HTMLButtonElement).disabled, false)
    await ui.click(confirm)
    assert.deepEqual(ui.folderTasks, [[fullKey, bucket, { forceDelete: true }]])
  })
}

for (const change of ["permission", "bucket"] as const) {
  test(`an open force cleanup dialog cannot submit after its ${change} changes`, async (t) => {
    const ui = await mount(t, props)
    const row = await ui.openMenu(fullKey)
    await ui.click(ui.findButton("Force Cleanup Folder", row))
    if (change === "permission") await ui.denyForceCleanup()
    else await ui.render({ bucket: "different-bucket" })
    const dialog = ui.container.querySelector('[role="alertdialog"]')
    assert.ok(dialog)
    assert.equal(dialog.querySelector("bdi")?.textContent, `${bucket}/${fullKey}`)
    const confirm = ui.findButton("Force Cleanup Folder", dialog)
    assert.ok(confirm)
    assert.equal((confirm as unknown as HTMLButtonElement).disabled, true)
    await ui.click(confirm)
    assert.deepEqual(ui.folderTasks, [])
  })
}

test("failed cleanup tasks retain the backend failure in a visible alert", async (t) => {
  const ui = await mount(t, props)
  const error = "InvalidRequest: Object Lock is configured for this bucket"
  const task: AnyTask = {
    kind: "delete-folder",
    id: "cleanup-1",
    prefix: fullKey,
    bucketName: bucket,
    forceDelete: true,
    status: "failed",
    progress: 0,
    displayName: fullKey,
    actionLabel: "Force Cleanup Folder",
    subInfo: "",
    error,
  }
  await React.act(async () => ui.root.render(React.createElement(TaskItem, { task })))
  assert.equal(ui.container.querySelector('[role="alert"]')?.textContent, error)
  assert.ok(ui.container.textContent.includes("Force Cleanup Folder · failed"))
})

test("successful tasks do not display stale backend errors", async (t) => {
  const ui = await mount(t, props)
  const task: AnyTask = {
    kind: "delete-folder",
    id: "cleanup-1",
    prefix: fullKey,
    bucketName: bucket,
    forceDelete: true,
    status: "completed",
    progress: 100,
    displayName: fullKey,
    actionLabel: "Force Cleanup Folder",
    subInfo: "",
    error: "old failure",
  }
  await React.act(async () => ui.root.render(React.createElement(TaskItem, { task })))
  assert.equal(ui.container.querySelector('[role="alert"]'), null)
})

test("folder statistics do not land in a new bucket after a scope change", async (t) => {
  const response = Promise.withResolvers<{ size: number; lastModified?: Date }>()
  let usedSignal: AbortSignal | undefined
  const ui = await mount(t, props, "Suspended", async (_key, signal) => {
    usedSignal = signal
    return response.promise
  })
  await ui.click(ui.findButton("Calculate folder statistics"))
  assert.equal(usedSignal?.aborted, false)
  await ui.render({ bucket: "other-bucket" })
  assert.equal(usedSignal?.aborted, true)
  await React.act(async () => response.resolve({ size: 731, lastModified: new Date("2026-01-01") }))
  assert.equal(ui.container.textContent?.includes("731"), false)
})

test("refresh cancels folder statistics and ignores a late result", async (t) => {
  const response = Promise.withResolvers<{ size: number; lastModified?: Date }>()
  let usedSignal: AbortSignal | undefined
  const ui = await mount(t, props, "Suspended", async (_key, signal) => {
    usedSignal = signal
    return response.promise
  })
  await ui.click(ui.findButton("Calculate folder statistics"))
  await ui.render({ refreshTrigger: 1 })
  assert.equal(usedSignal?.aborted, true)
  await React.act(async () => response.resolve({ size: 731 }))
  assert.equal(ui.container.textContent?.includes("731"), false)
})

test("folder statistics update only the requested row and clear on refresh", async (t) => {
  const ui = await mount(t, props, "Suspended", async () => ({ size: 731 }))
  await ui.click(ui.findButton("Calculate folder statistics"))
  const rows = Array.from(ui.container.querySelectorAll("[data-object-key]"))
  assert.ok(rows.find((row) => row.getAttribute("data-object-key") === fullKey)?.textContent?.includes("731"))
  assert.equal(
    rows.find((row) => row.getAttribute("data-object-key") === "other/")?.textContent?.includes("731"),
    false,
  )
  await ui.render({ refreshTrigger: 1 })
  assert.equal(ui.container.textContent?.includes("731"), false)
})
