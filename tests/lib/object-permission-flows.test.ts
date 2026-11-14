import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import ts from "typescript"
import { capabilityCheckGroups, type ConsoleCapability } from "../../lib/permission-capabilities"
import type { PermissionResourceContext } from "../../lib/permission-resources"
import { getAttachmentContentDisposition } from "../../lib/content-disposition"

const mocksKey = Symbol.for("object-permission-flows")
type Props = {
  children?: React.ReactNode
  open?: boolean
  actions?: React.ReactNode
  onCheckedChange?: (checked: boolean) => void
} & React.HTMLAttributes<HTMLElement>
const passthrough = ({ children, actions }: Props) => React.createElement("div", null, actions, children)
const button = ({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => {
  const { variant, size, ...attributes } = props
  void variant
  void size
  return React.createElement("button", attributes, children)
}
type Context = PermissionResourceContext
type Check = { capability: string; context: Context }
type Version = { Key: string; VersionId: string; IsLatest: boolean }
type Column = { id?: string; cell?: (props: { row: { original: Version } }) => React.ReactNode }

async function importComponent(path: string) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const rewritten = source.replace(
    /import\s+([\s\S]*?)\s+from\s+"([^"]+)";/g,
    (statement, bindings: string, specifier: string) => {
      if (specifier === "react" || specifier === "react/jsx-runtime" || specifier.startsWith("@aws-sdk/client-")) {
        return `import ${bindings} from "${import.meta.resolve(specifier)}";`
      }
      if (specifier.startsWith("@/lib/") && !/feedback|functions|clipboard|export-file/.test(specifier)) {
        const path = /\.(js|ts)$/.test(specifier) ? specifier.slice(2) : `${specifier.slice(2)}.ts`
        return `import ${bindings} from "${new URL(`../../${path}`, import.meta.url).href}";`
      }
      if (/^\w+$/.test(bindings.trim())) {
        const name = bindings.trim()
        return statement.replace(
          specifier,
          `data:text/javascript,${encodeURIComponent(`export default function ${name}(...args) { return globalThis[Symbol.for("object-permission-flows")]["${name}"]?.(...args) ?? null }`)}`,
        )
      }
      const exports = bindings
        .replace(/[{}]/g, "")
        .split(",")
        .filter((binding: string) => binding.trim())
        .map((binding: string) => {
          const name = binding
            .trim()
            .split(/\s+as\s+/)
            .pop()!
          return `export function ${name}(...args) { return globalThis[Symbol.for("object-permission-flows")]["${name}"]?.(...args) ?? null }`
        })
        .join("\n")
      return statement.replace(specifier, `data:text/javascript,${encodeURIComponent(exports)}`)
    },
  )
  return import(`data:text/javascript,${encodeURIComponent(rewritten)}`)
}

const { ObjectVersions } = await importComponent("../../components/object/versions.tsx")
const { BucketNewForm } = await importComponent("../../components/buckets/new-form.tsx")
const { ObjectInfo } = await importComponent("../../components/object/info.tsx")
const { ObjectView } = await importComponent("../../components/object/view.tsx")
const { BrowserContent } = await importComponent("../../app/(dashboard)/browser/content.tsx")

async function mount(
  t: TestContext,
  component: typeof ObjectVersions,
  props: Record<string, unknown>,
  permits: (capability: string, context: Context) => boolean,
  options: {
    potential?: (capability: string, context: Context) => boolean
    tags?: { Key: string; Value: string }[]
    legalHold?: "ON" | "OFF"
    retentionDate?: string
    infoReadFailure?: boolean
    previewData?: Record<string, unknown>
  } = {},
) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const descriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const checks: Check[] = []
  const mutations: unknown[] = []
  const downloads: unknown[] = []
  const urlRequests: unknown[] = []
  const errors: string[] = []
  let submitAllowed = true
  const tKey = (key: string) => key
  const versions: Version[] = [{ Key: "file.txt", VersionId: "old-version", IsLatest: false }]
  const api = {
    listObjectVersions: async () => ({ Versions: versions }),
    deleteObject: async (...args: unknown[]) => mutations.push(args),
    restoreObjectVersion: async (...args: unknown[]) => mutations.push(args),
    createBucket: async (...args: unknown[]) => mutations.push(args),
    headBucket: async () => ({}),
    getSignedUrl: async (...args: unknown[]) => {
      urlRequests.push(args)
      return "https://example.test/download"
    },
    getObjectInfo: async (key: string) => {
      if (options.infoReadFailure) throw new Error("Metadata unavailable")
      return { Key: key, ContentLength: 1, ObjectLockLegalHoldStatus: options.legalHold ?? "ON" }
    },
    getObjectTags: async () => options.tags ?? [],
    getObjectRetention: async () => ({ Mode: "GOVERNANCE", RetainUntilDate: options.retentionDate }),
    getObjectLegalHold: async () => ({ Status: options.legalHold ?? "ON" }),
    putObjectTags: async (...args: unknown[]) => mutations.push({ operation: "tags", args }),
    setLegalHold: async (...args: unknown[]) => mutations.push({ operation: "legalHold", args }),
    putObjectRetention: async (...args: unknown[]) => mutations.push({ operation: "retention", args }),
  }
  const feedback = { error: (error: string) => errors.push(error), success() {}, warning() {} }
  let confirmation: (() => unknown) | undefined
  const dialog = {
    warning: ({ onPositiveClick }: { onPositiveClick: () => unknown }) => {
      confirmation = onPositiveClick
    },
  }
  const permissions = {
    canCapability: permits,
    mayCapability: options.potential ?? permits,
    checkCapability: async (capability: string, context: Context = {}) => {
      checks.push({ capability, context })
      return submitAllowed && permits(capability, context)
    },
  }
  const controls = [
    "DialogBody",
    "DialogContent",
    "DialogFooter",
    "DialogHeader",
    "DialogTitle",
    "DialogDescription",
    "DialogSection",
    "Badge",
    "Spinner",
    "Field",
    "FieldContent",
    "FieldDescription",
    "FieldLabel",
    "Select",
    "SelectContent",
    "SelectItem",
    "SelectTrigger",
    "SelectValue",
    "RadioGroup",
    "RadioGroupItem",
    "Label",
    "DrawerContent",
    "DrawerHeader",
    "DrawerTitle",
    "DrawerDescription",
    "ItemContent",
    "Tabs",
    "TabsList",
    "TabsTrigger",
    "TabsContent",
    "Item",
    "ItemHeader",
    "ItemTitle",
    "Page",
    "PageHeader",
  ]
  const mocks = {
    ...Object.fromEntries(controls.map((name) => [name, passthrough])),
    Button: button,
    Dialog: ({ open, children }: Props) => (open ? passthrough({ children }) : null),
    Drawer: ({ open, children }: Props) => (open ? passthrough({ children }) : null),
    Input: (attributes: React.InputHTMLAttributes<HTMLInputElement>) =>
      React.createElement("input", {
        ...attributes,
        onInput: (event) => attributes.onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>),
      }),
    Switch: ({ onCheckedChange, ...attributes }: Props & React.InputHTMLAttributes<HTMLInputElement>) =>
      React.createElement("input", {
        ...attributes,
        type: "checkbox",
        onChange: (event) => onCheckedChange?.(event.target.checked),
      }),
    DateTimePicker: ({
      value,
      disabled,
      onChange,
    }: {
      value: string
      disabled?: boolean
      onChange: (value: string) => void
    }) =>
      React.createElement("input", {
        name: "retention-date",
        value,
        disabled,
        onChange() {},
        onInput: (event) => onChange(event.currentTarget.value),
      }),
    useTranslation: () => ({ t: tKey }),
    useMessage: () => feedback,
    useDialog: () => dialog,
    usePermissions: () => permissions,
    useCapabilityChecks() {},
    useObject: () => api,
    useBucket: () => api,
    useS3: () => ({}),
    useRouter: () => ({ push() {} }),
    useSearchParams: () => new URLSearchParams(),
    useTasks: () => [],
    BucketNavigation: () => null,
    ObjectPathLinks: () => null,
    ObjectInfo: () => null,
    ObjectUploadPicker: () => null,
    ObjectList: ({ onPreview }: { onPreview: (value: unknown) => Promise<void> }) =>
      React.createElement(
        "button",
        { onClick: () => onPreview({ key: "file.txt", data: options.previewData }) },
        "Open preview",
      ),
    ObjectPreviewModal: ({ show, onDownload }: { show?: boolean; onDownload?: () => unknown }) =>
      show && onDownload ? React.createElement("button", { onClick: onDownload }, "Preview download") : null,
    getSignedUrl: async () => "https://example.test/download",
    downloadUrl: (...args: unknown[]) => downloads.push(args),
    useDataTable: (table: { data: Version[]; columns: Column[] }) => ({ table }),
    DataTable: ({ table }: { table: { data: Version[]; columns: Column[] } }) =>
      React.createElement(
        "section",
        null,
        table.data.map((row) =>
          React.createElement(
            "div",
            { key: row.VersionId, "data-version-id": row.VersionId },
            table.columns.map((column, index) =>
              React.createElement("div", { key: column.id ?? index }, column.cell?.({ row: { original: row } })),
            ),
          ),
        ),
      ),
    formatBytes: (value: unknown) => String(value),
    formatDateTime: (value: unknown) => String(value),
    formatDateTimeWithOffset: (value: unknown) => String(value),
  }
  Reflect.set(globalThis, mocksKey, mocks)
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  await React.act(async () => root.render(React.createElement(component, props)))
  t.after(async () => {
    await React.act(async () => root.unmount())
    await browser.happyDOM.close()
    Reflect.deleteProperty(globalThis, mocksKey)
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  return {
    container,
    checks,
    mutations,
    downloads,
    urlRequests,
    errors,
    denySubmission() {
      submitAllowed = false
    },
    findButton(label: string) {
      return Array.from(container.querySelectorAll("button")).find((element) => element.textContent === label)
    },
    async click(element: { click(): void } | undefined) {
      assert.ok(element)
      await React.act(async () => element.click())
    },
    async clickSelector(selector: string) {
      const element = container.querySelector(selector)
      assert.ok(element)
      await React.act(async () => (element as unknown as HTMLElement).click())
    },
    async confirm() {
      assert.ok(confirmation)
      await React.act(async () => {
        await confirmation!()
      })
    },
    async input(value: string, selector = "input") {
      const input = container.querySelector(selector)!
      const setter = Object.getOwnPropertyDescriptor(browser.HTMLInputElement.prototype, "value")!.set!
      await React.act(async () => {
        setter.call(input, value)
        input.dispatchEvent(new browser.Event("input", { bubbles: true }))
      })
    },
  }
}

const versionProps = {
  bucketName: "bucket",
  objectKey: "file.txt",
  visible: true,
  onClose() {},
  onPreview() {},
  onRefreshParent() {},
}

const infoProps = { bucketName: "bucket", objectKey: "file.txt", open: true, onOpenChange() {}, onPreview() {} }

function readPermissions(authTypes: string[]) {
  return (capability: string, context: Context) =>
    capabilityCheckGroups(capability as ConsoleCapability, context).every(({ checks }) =>
      checks.every(
        (check) =>
          check.action === "s3:ListBucketVersions" ||
          ((check.action === "s3:GetObject" || check.action === "s3:GetObjectVersion") &&
            authTypes.includes(check.context?.authType ?? "REST-HEADER")),
      ),
    )
}

test("query-only object access can download and share when the metadata HEAD fails", async (t) => {
  const ui = await mount(t, ObjectInfo, infoProps, readPermissions(["REST-QUERY-STRING"]), { infoReadFailure: true })
  assert.equal(ui.findButton("Preview"), undefined)
  await ui.click(ui.findButton("Download"))
  await ui.click(ui.findButton("Generate URL"))
  assert.deepEqual(ui.urlRequests, [
    ["file.txt", 3600, getAttachmentContentDisposition("file.txt")],
    ["file.txt", 7200],
  ])
  assert.equal(ui.downloads.length, 1)
  assert.deepEqual(
    ui.checks.map(({ capability }) => capability),
    ["objects.download", "objects.share"],
  )
})

test("header-only object access exposes no signed download, share or preview control", async (t) => {
  const ui = await mount(t, ObjectInfo, infoProps, readPermissions(["REST-HEADER"]))
  assert.equal(ui.findButton("Download"), undefined)
  assert.equal(ui.findButton("Preview"), undefined)
  assert.equal(ui.findButton("Generate URL")?.disabled, true)
  await ui.click(ui.findButton("Generate URL"))
  assert.deepEqual(ui.urlRequests, [])
})

test("the object details page offers a signed download independently of metadata access", async (t) => {
  const ui = await mount(
    t,
    ObjectView,
    { bucketName: "bucket", objectKey: "file.txt" },
    readPermissions(["REST-QUERY-STRING"]),
    { infoReadFailure: true },
  )
  await ui.click(ui.findButton("Download"))
  assert.equal(ui.urlRequests.length, 1)
  assert.deepEqual(ui.checks.at(-1), {
    capability: "objects.download",
    context: { bucket: "bucket", objectKey: "file.txt" },
  })
  ui.denySubmission()
  await ui.click(ui.findButton("Download"))
  assert.equal(ui.urlRequests.length, 1)
  assert.deepEqual(ui.errors, ["Access Denied"])
})

test("a version preview rechecks both read types and its download retains the selected version", async (t) => {
  const ui = await mount(
    t,
    BrowserContent,
    { bucketName: "bucket" },
    readPermissions(["REST-HEADER", "REST-QUERY-STRING"]),
    { previewData: { Key: "file.txt", SelectedVersionId: "old-version", SignedUrl: "https://example.test/preview" } },
  )
  await ui.click(ui.findButton("Open preview"))
  assert.deepEqual(ui.checks.at(-1), {
    capability: "objects.version.preview",
    context: { bucket: "bucket", objectKey: "file.txt", versionId: "old-version" },
  })
  await ui.click(ui.findButton("Preview download"))
  assert.deepEqual(ui.urlRequests.at(-1), [
    "file.txt",
    3600,
    getAttachmentContentDisposition("file.txt"),
    "old-version",
  ])
  assert.deepEqual(ui.checks.at(-1), {
    capability: "objects.version.download",
    context: { bucket: "bucket", objectKey: "file.txt", versionId: "old-version" },
  })
  ui.denySubmission()
  await ui.click(ui.findButton("Preview download"))
  assert.equal(ui.urlRequests.length, 1)
})

test("query-only access cannot open a preview requiring a metadata HEAD", async (t) => {
  const ui = await mount(t, BrowserContent, { bucketName: "bucket" }, readPermissions(["REST-QUERY-STRING"]))
  await ui.click(ui.findButton("Open preview"))
  assert.equal(ui.findButton("Preview download"), undefined)
  assert.deepEqual(ui.errors, ["Access Denied"])
})

test("conditional legal-hold permission uses the same requested status as the actual write", async (t) => {
  const ui = await mount(
    t,
    ObjectInfo,
    infoProps,
    (capability, context) => capability === "objects.legalHold.edit" && context.legalHoldStatus === "ON",
    {
      potential: (capability) => capability === "objects.legalHold.edit",
      legalHold: "OFF",
    },
  )
  const hold = ui.container.querySelector('input[type="checkbox"]')!
  assert.equal((hold as unknown as HTMLInputElement).disabled, false)
  await ui.clickSelector('input[type="checkbox"]')
  assert.deepEqual(ui.checks.at(-1), {
    capability: "objects.legalHold.edit",
    context: { bucket: "bucket", objectKey: "file.txt", legalHoldStatus: "ON" },
  })
  assert.deepEqual(ui.mutations, [{ operation: "legalHold", args: ["file.txt", true] }])
})

test("legal-hold writes use the selected object key even when reading its metadata is denied", async (t) => {
  const ui = await mount(
    t,
    ObjectInfo,
    infoProps,
    (capability, context) => capability === "objects.legalHold.edit" && context.legalHoldStatus === "ON",
    {
      potential: (capability) => capability === "objects.legalHold.edit",
      legalHold: "OFF",
      infoReadFailure: true,
    },
  )
  await ui.clickSelector('input[type="checkbox"]')
  assert.deepEqual(ui.mutations, [{ operation: "legalHold", args: ["file.txt", true] }])
})

test("conditional tag editing evaluates the exact sanitized tag set sent to the object API", async (t) => {
  const ui = await mount(
    t,
    ObjectInfo,
    infoProps,
    (capability, context) =>
      capability === "objects.tag.view" ||
      (capability === "objects.tag.edit" && context.requestTags?.kind === "public"),
    {
      potential: (capability) => capability === "objects.tag.edit",
      tags: [
        { Key: "existing", Value: "kept" },
        { Key: "empty", Value: "" },
      ],
    },
  )
  await ui.click(ui.findButton("Set Tags"))
  await ui.input("kind", '[name="object-tag-key"]')
  await ui.input("public", '[name="object-tag-value"]')
  await ui.click(ui.findButton("Add"))
  assert.deepEqual(ui.checks.at(-1), {
    capability: "objects.tag.edit",
    context: { bucket: "bucket", objectKey: "file.txt", requestTags: { existing: "kept", kind: "public" } },
  })
  assert.deepEqual(ui.mutations, [
    {
      operation: "tags",
      args: [
        "file.txt",
        [
          { Key: "existing", Value: "kept" },
          { Key: "kind", Value: "public" },
        ],
      ],
    },
  ])
})

test("clearing the last tag sends an explicit empty tag map and an empty SDK tag set", async (t) => {
  const ui = await mount(
    t,
    ObjectInfo,
    infoProps,
    (capability, context) =>
      capability === "objects.tag.view" || (capability === "objects.tag.edit" && context.requestTags !== undefined),
    {
      potential: (capability) => capability === "objects.tag.edit",
      tags: [{ Key: "last", Value: "value" }],
    },
  )
  await ui.click(ui.findButton("Set Tags"))
  await ui.clickSelector('[aria-label="Delete Tag"]')
  await ui.confirm()
  assert.deepEqual(ui.checks.at(-1)?.context.requestTags, {})
  assert.deepEqual(ui.mutations, [{ operation: "tags", args: ["file.txt", []] }])
})

test("retention works with legal hold off and uses one identical date and mode for checking and writing", async (t) => {
  const date = "2099-01-02T03:04:05.000Z"
  const ui = await mount(
    t,
    ObjectInfo,
    infoProps,
    (capability, context) =>
      capability === "objects.retention.edit" &&
      context.retentionMode === "GOVERNANCE" &&
      context.retainUntilDate === date,
    {
      potential: (capability) => capability === "objects.retention.edit",
      legalHold: "OFF",
      retentionDate: date,
    },
  )
  assert.equal((ui.container.querySelector('input[type="checkbox"]') as unknown as HTMLInputElement).checked, false)
  await ui.click(ui.findButton("Retention"))
  await ui.input(date, '[name="retention-date"]')
  await ui.click(ui.findButton("Confirm"))
  assert.deepEqual(ui.checks.at(-1), {
    capability: "objects.retention.edit",
    context: { bucket: "bucket", objectKey: "file.txt", retentionMode: "GOVERNANCE", retainUntilDate: date },
  })
  assert.deepEqual(ui.mutations, [
    { operation: "retention", args: ["file.txt", { Mode: "GOVERNANCE", RetainUntilDate: date }] },
  ])
})

test("resetting retention checks explicit absence of a date instead of the existing retention date", async (t) => {
  const ui = await mount(
    t,
    ObjectInfo,
    infoProps,
    (capability, context) =>
      capability === "objects.retention.edit" &&
      context.retentionMode === "GOVERNANCE" &&
      context.retainUntilDate === undefined,
    {
      potential: (capability) => capability === "objects.retention.edit",
      legalHold: "OFF",
      retentionDate: "2099-01-02T03:04:05.000Z",
    },
  )
  await ui.click(ui.findButton("Retention"))
  await ui.click(ui.findButton("Reset"))
  assert.deepEqual(ui.checks.at(-1), {
    capability: "objects.retention.edit",
    context: { bucket: "bucket", objectKey: "file.txt", retentionMode: "GOVERNANCE" },
  })
  assert.deepEqual(ui.mutations, [{ operation: "retention", args: ["file.txt", { Mode: "GOVERNANCE" }] }])
})

test("a possible conditional grant cannot write when the completed legal-hold facts are denied", async (t) => {
  const ui = await mount(t, ObjectInfo, infoProps, () => false, {
    potential: (capability) => capability === "objects.legalHold.edit",
    legalHold: "OFF",
  })
  await ui.clickSelector('input[type="checkbox"]')
  assert.deepEqual(ui.mutations, [])
  assert.deepEqual(ui.errors, ["Access Denied"])
})

test("objects without retention permission offer no retention control even when legal hold is on", async (t) => {
  const ui = await mount(t, ObjectInfo, infoProps, () => false, { legalHold: "ON" })
  assert.equal(ui.findButton("Retention"), undefined)
})

test("historical version buttons use version permissions without requiring ordinary object grants", async (t) => {
  const ui = await mount(t, ObjectVersions, versionProps, (capability) =>
    ["objects.version.list", "objects.version.download", "objects.version.delete", "objects.version.preview"].includes(
      capability,
    ),
  )
  assert.ok(ui.findButton("Download"))
  assert.ok(ui.findButton("Delete"))
  assert.ok(ui.findButton("Preview"))
  assert.equal(ui.findButton("Restore"), undefined)
  await ui.click(ui.findButton("Download"))
  assert.deepEqual(ui.checks.at(-1), {
    capability: "objects.version.download",
    context: { bucket: "bucket", objectKey: "file.txt", versionId: "old-version" },
  })
  assert.equal(ui.downloads.length, 1)
})

test("ordinary object permissions do not expose historical version mutation or download controls", async (t) => {
  const ui = await mount(t, ObjectVersions, versionProps, (capability) =>
    ["objects.version.list", "objects.download", "objects.delete", "objects.preview"].includes(capability),
  )
  assert.equal(ui.findButton("Download"), undefined)
  assert.equal(ui.findButton("Delete"), undefined)
  assert.equal(ui.findButton("Preview"), undefined)
})

test("version deletion rechecks permission before mutating after a dialog has been shown", async (t) => {
  const ui = await mount(t, ObjectVersions, versionProps, (capability) =>
    ["objects.version.list", "objects.version.delete"].includes(capability),
  )
  ui.denySubmission()
  await ui.click(ui.findButton("Delete"))
  assert.deepEqual(ui.mutations, [])
  assert.deepEqual(ui.errors, ["Access Denied"])
})

test("a scoped bucket-creation grant checks the typed bucket name and rechecks before creation", async (t) => {
  const ui = await mount(
    t,
    BucketNewForm,
    { show: true, onShowChange() {}, onSuccess() {} },
    (capability, context) => capability === "bucket.create" && context.bucket === "alice-data",
  )
  await ui.input("alice-data")
  const create = ui.findButton("Create")!
  assert.equal(create.disabled, false)
  ui.denySubmission()
  await ui.click(create)
  assert.deepEqual(ui.checks.at(-1), { capability: "bucket.create", context: { bucket: "alice-data" } })
  assert.deepEqual(ui.mutations, [])
})
