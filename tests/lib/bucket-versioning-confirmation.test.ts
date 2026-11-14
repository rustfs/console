import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { act, createContext, createElement, useContext, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import { createInstance } from "i18next"
import ts from "typescript"

const mocksKey = Symbol.for("bucket-versioning-confirmation")
const mockExports: Record<string, string[]> = {
  "@/components/section-navigation": ["SectionNavigation"],
  "react-i18next": ["useTranslation"],
  "@remixicon/react": ["RiAddLine", "RiArrowRightSLine", "RiCloseLine", "RiEdit2Line"],
  "@/hooks/use-bucket": ["useBucket"],
  "@/hooks/use-permissions": ["usePermissions"],
  "@/hooks/use-sse": ["useSSE"],
  "@/components/buckets/settings-layout": ["BucketSettingRow", "BucketSettingsSection"],
  "@/components/on-demand-migration/settings-row": ["OnDemandMigrationSettingsRow"],
  "@/components/ui/button": ["Button"],
  "@/components/ui/alert": ["Alert", "AlertDescription", "AlertTitle"],
  "@/components/ui/switch": ["Switch"],
  "@/components/ui/spinner": ["Spinner"],
  "@/components/ui/input": ["Input"],
  "@/components/ui/textarea": ["Textarea"],
  "@/components/ui/field": ["Field", "FieldContent", "FieldDescription", "FieldError", "FieldLabel"],
  "@/components/ui/radio-group": ["RadioGroup", "RadioGroupItem"],
  "@/components/ui/select": ["Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue"],
  "@/components/dialog": [
    "Dialog",
    "DialogBody",
    "DialogContent",
    "DialogFooter",
    "DialogHeader",
    "DialogTitle",
    "AlertDialog",
    "AlertDialogAction",
    "AlertDialogCancel",
    "AlertDialogContent",
    "AlertDialogDescription",
    "AlertDialogFooter",
    "AlertDialogHeader",
    "AlertDialogTitle",
  ],
  "@/lib/feedback/message": ["useMessage"],
}

const source = ts.transpileModule(readFileSync(new URL("../../components/buckets/info.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const rewritten = source.replace(/from "([^"]+)"/g, (_, specifier: string) => {
  let url: string
  if (mockExports[specifier]) {
    const stub = mockExports[specifier]
      .map(
        (name) =>
          `export function ${name}(...args) { return globalThis[Symbol.for("bucket-versioning-confirmation")].${name}(...args) }`,
      )
      .join("\n")
    url = `data:text/javascript,${encodeURIComponent(stub)}`
  } else if (specifier === "next/link") {
    url = `data:text/javascript,${encodeURIComponent("export default function Link() { return null }")}`
  } else if (specifier.startsWith("@/")) {
    url = new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href
  } else {
    url = import.meta.resolve(specifier)
  }
  return `from "${url}"`
})
const { BucketInfo } = (await import(
  `data:text/javascript,${encodeURIComponent(rewritten)}`
)) as typeof import("../../components/buckets/info")

type ButtonProps = {
  children?: ReactNode
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  "aria-label"?: string
}
type DialogProps = {
  children?: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}
const DialogContext = createContext<(open: boolean) => void>(() => {})
const i18n = createInstance()
await i18n.init({
  lng: "en-US",
  fallbackLng: "en-US",
  resources: {
    "en-US": {
      translation: JSON.parse(readFileSync(new URL("../../i18n/locales/en-US.json", import.meta.url), "utf8")),
    },
  },
  interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  returnNull: false,
})
const translate = i18n.t.bind(i18n)

async function mountBucket(
  t: TestContext,
  options: {
    status?: "Enabled" | "Suspended"
    objectLock?: boolean
    canEdit?: boolean
    readError?: "versioning" | "objectLock"
    pendingRead?: Promise<unknown>
  } = {},
) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previousDescriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }

  let canEdit = options.canEdit ?? true
  let bucketName = "test-bucket"
  const writes: { bucket: string; status: string; result: ReturnType<typeof Promise.withResolvers<void>> }[] = []
  const api = {
    getBucketPolicy: async () => null,
    getBucketEncryption: async () => null,
    getBucketCors: async () => null,
    getBucketTagging: async () => ({ TagSet: [] }),
    getObjectLockConfiguration: async () => {
      if (options.readError === "objectLock") throw new Error("AccessDenied")
      return { ObjectLockConfiguration: { ObjectLockEnabled: options.objectLock ? "Enabled" : undefined } }
    },
    getBucketVersioning: async () => {
      if (options.readError === "versioning") throw new Error("AccessDenied")
      if (options.pendingRead) await options.pendingRead
      return { Status: options.status }
    },
    getBucketQuota: async () => null,
    putBucketVersioning: (bucket: string, status: string) => {
      const result = Promise.withResolvers<void>()
      writes.push({ bucket, status, result })
      return result.promise
    },
  }
  const message = { success: t.mock.fn(), error: t.mock.fn() }
  const getKeyList = async () => []
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  const Wrapper = ({ children }: { children?: ReactNode }) => createElement("div", null, children)
  const Button = ({ children, onClick, disabled, "aria-label": label }: ButtonProps) =>
    createElement("button", { onClick, disabled, "aria-label": label }, children)
  const Dialog = ({ children, open, onOpenChange }: DialogProps) =>
    open ? createElement(DialogContext.Provider, { value: onOpenChange }, children) : null

  Reflect.set(globalThis, mocksKey, {
    ...Object.fromEntries(
      Object.values(mockExports)
        .flat()
        .map((name) => [name, Wrapper]),
    ),
    useTranslation: () => ({ t: translate }),
    useMessage: () => message,
    useBucket: () => api,
    useSSE: () => ({ getKeyList }),
    usePermissions: () => ({
      canCapability: (capability: string) => capability === "bucket.versioning.edit" && canEdit,
      checkCapability: async (capability: string) => capability === "bucket.versioning.edit" && canEdit,
    }),
    SectionNavigation: () => null,
    OnDemandMigrationSettingsRow: () => null,
    Button,
    Switch: ({
      checked,
      onCheckedChange,
      disabled,
      "aria-label": label,
    }: ButtonProps & {
      checked: boolean
      onCheckedChange: (checked: boolean) => void
    }) =>
      createElement("button", {
        role: "switch",
        "aria-label": label,
        "aria-checked": checked,
        disabled,
        onClick: () => onCheckedChange(!checked),
      }),
    BucketSettingRow: ({
      title,
      status,
      action,
      children,
      error,
    }: {
      title: string
      status: string
      action: ReactNode
      children?: ReactNode
      error?: ReactNode
    }) => createElement("section", { "data-setting": title }, title, status, action, children, error),
    Dialog,
    AlertDialog: Dialog,
    AlertDialogContent: ({ children }: { children?: ReactNode }) =>
      createElement("div", { role: "alertdialog" }, children),
    AlertDialogTitle: ({ children }: { children?: ReactNode }) => createElement("h2", null, children),
    AlertDialogAction: Button,
    AlertDialogCancel: function Cancel(props: ButtonProps) {
      const onOpenChange = useContext(DialogContext)
      return createElement(Button, { ...props, onClick: () => onOpenChange(false) })
    },
  })

  let unmounted = false
  const render = async (changes: { canEdit?: boolean; bucketName?: string } = {}) => {
    canEdit = changes.canEdit ?? canEdit
    bucketName = changes.bucketName ?? bucketName
    await act(async () => root.render(createElement(BucketInfo, { bucketName, key: bucketName })))
  }
  const unmount = async () => {
    await act(async () => root.unmount())
    unmounted = true
  }
  t.after(async () => {
    if (!unmounted) await unmount()
    await browser.happyDOM.close()
    Reflect.deleteProperty(globalThis, mocksKey)
    for (const [key, descriptor] of previousDescriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  await render()

  const dialog = () => container.querySelector('[role="alertdialog"]')
  const versionSwitch = () =>
    container.querySelector('[role="switch"][aria-label="Versioning"]') as unknown as HTMLButtonElement | null
  const button = (label: string) => {
    const match = [...container.querySelectorAll("button")].find((item) => item.textContent === label)
    assert.ok(match, `missing button: ${label}`)
    return match
  }
  const click = async (element: { click: () => void } | null) => {
    assert.ok(element, "missing click target")
    await act(async () => element.click())
  }
  return { container, dialog, versionSwitch, button, click, render, unmount, writes, message }
}

test("versioning only opens confirmation, and cancelling leaves an unconfigured bucket untouched", async (t) => {
  const view = await mountBucket(t)
  await view.click(view.versionSwitch())

  assert.equal(view.writes.length, 0)
  assert.equal(view.versionSwitch()?.getAttribute("aria-checked"), "false")
  assert.match(view.dialog()?.textContent ?? "", /Enable versioning for bucket test-bucket\?/)
  assert.doesNotMatch(view.dialog()?.textContent ?? "", /\{+bucket\}+/)
  assert.match(view.dialog()?.textContent ?? "", /cannot.*(?:unconfigured|not configured|original)/i)

  await view.click(view.button("Cancel"))
  assert.equal(view.dialog(), null)
  assert.equal(view.writes.length, 0)
})

test("confirmation sends one enable request and blocks duplicate submits and cancellation while pending", async (t) => {
  const view = await mountBucket(t)
  await view.click(view.versionSwitch())
  const confirm = view.button("Enable Versioning")
  await act(async () => {
    confirm.click()
    confirm.click()
  })

  assert.equal(view.writes.length, 1)
  assert.equal(view.writes[0].bucket, "test-bucket")
  assert.equal(view.writes[0].status, "Enabled")
  assert.equal(view.versionSwitch()?.getAttribute("aria-checked"), "false")
  assert.equal(view.button("Cancel").disabled, true)
  assert.equal(confirm.disabled, true)
  await view.click(view.button("Cancel"))
  assert.ok(view.dialog())

  await act(async () => view.writes[0].result.resolve())
  assert.equal(view.dialog(), null)
  assert.equal(view.versionSwitch()?.getAttribute("aria-checked"), "true")
})

test("failed versioning writes keep the prior state and confirmation available for retry", async (t) => {
  const view = await mountBucket(t)
  await view.click(view.versionSwitch())
  await view.click(view.button("Enable Versioning"))
  await act(async () => view.writes[0].result.reject(new Error("AccessDenied")))

  assert.ok(view.dialog())
  assert.equal(view.versionSwitch()?.getAttribute("aria-checked"), "false")
  assert.match(view.dialog()?.querySelector('[role="alert"]')?.textContent ?? "", /AccessDenied/)
  assert.equal(view.message.success.mock.callCount(), 0)

  await view.click(view.button("Enable Versioning"))
  assert.equal(view.writes.length, 2)
  await act(async () => view.writes[1].result.resolve())
  assert.equal(view.dialog(), null)
  assert.equal(view.versionSwitch()?.getAttribute("aria-checked"), "true")
})

test("suspending versioning requires confirmation and retains a distinct Suspended status", async (t) => {
  const view = await mountBucket(t, { status: "Enabled" })
  await view.click(view.versionSwitch())
  assert.equal(view.writes.length, 0)
  assert.match(view.dialog()?.textContent ?? "", /Suspend versioning for bucket test-bucket\?/)
  assert.doesNotMatch(view.dialog()?.textContent ?? "", /\{+bucket\}+/)
  assert.match(view.dialog()?.textContent ?? "", /existing version/i)
  await view.click(view.button("Suspend Versioning"))
  assert.equal(view.writes[0].status, "Suspended")
  await act(async () => view.writes[0].result.resolve())
  assert.match(view.container.querySelector('[data-setting="Versioning"]')?.textContent ?? "", /Suspended/)
})

test("a suspended bucket can only resume versioning after confirmation", async (t) => {
  const view = await mountBucket(t, { status: "Suspended" })
  assert.match(view.container.querySelector('[data-setting="Versioning"]')?.textContent ?? "", /Suspended/)
  await view.click(view.versionSwitch())
  assert.equal(view.writes.length, 0)
  await view.click(view.button("Enable Versioning"))
  assert.equal(view.writes[0].status, "Enabled")
  await act(async () => view.writes[0].result.resolve())
})

test("revoking versioning permission while confirmation is open prevents a write", async (t) => {
  const view = await mountBucket(t)
  await view.click(view.versionSwitch())
  await view.render({ canEdit: false })
  await view.click(view.button("Enable Versioning"))
  assert.equal(view.writes.length, 0)
})

test("Object Lock and failed versioning or lock reads block the versioning control", async (t) => {
  for (const options of [
    { status: "Enabled" as const, objectLock: true },
    { readError: "versioning" as const },
    { readError: "objectLock" as const },
    { canEdit: false },
  ]) {
    await t.test(JSON.stringify(options), async (scenario) => {
      const view = await mountBucket(scenario, options)
      const control = view.versionSwitch()
      assert.ok(!control || control.disabled)
      if (control) await view.click(control)
      assert.equal(view.dialog(), null)
      assert.equal(view.writes.length, 0)
    })
  }
})

test("loading does not offer versioning changes before a trusted response arrives", async (t) => {
  const response = Promise.withResolvers<void>()
  const view = await mountBucket(t, { pendingRead: response.promise })
  assert.equal(view.versionSwitch(), null)
  assert.equal(view.writes.length, 0)
  await act(async () => response.resolve())
  assert.ok(view.versionSwitch())
})

test("changing bucket or unmounting discards the previous confirmation without a write", async (t) => {
  const view = await mountBucket(t)
  await view.click(view.versionSwitch())
  assert.ok(view.dialog())
  await view.render({ bucketName: "other-bucket" })
  assert.equal(view.dialog(), null)
  await view.click(view.versionSwitch())
  assert.match(view.dialog()?.textContent ?? "", /Enable versioning for bucket other-bucket\?/)
  assert.doesNotMatch(view.dialog()?.textContent ?? "", /\{+bucket\}+/)
  await view.unmount()
  assert.equal(view.dialog(), null)
  assert.equal(view.writes.length, 0)
})
