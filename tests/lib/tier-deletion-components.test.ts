import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import ts from "typescript"
import { ApiClient } from "../../lib/api-client"
import type { TierDeletionDialog as DialogComponent } from "../../components/tiers/deletion-dialog"

type DialogProps = React.ComponentProps<typeof DialogComponent>
type UiProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode
  ref?: React.Ref<HTMLButtonElement>
  open?: boolean
  disabled?: boolean
  onClick?: () => void
  actions?: React.ReactNode
}
const mocksKey = Symbol.for("tier-deletion-components")
const passthrough = ({ children }: UiProps) => React.createElement("div", null, children)
const mockExports: Record<string, string[]> = {
  "@/contexts/api-context": ["useApi"],
  "react-i18next": ["useTranslation"],
  "@/lib/feedback/message": ["useMessage"],
  "@/lib/feedback/dialog": ["useDialog"],
  "@/components/ui/button": ["Button"],
  "@/components/ui/alert": ["Alert", "AlertDescription", "AlertTitle"],
  "@/components/dialog": [
    "Dialog",
    "DialogBody",
    "DialogContent",
    "DialogDescription",
    "DialogFooter",
    "DialogHeader",
    "DialogTitle",
  ],
  "@/components/page": ["Page"],
  "@/components/page-header": ["PageHeader"],
  "@/components/data-table/data-table": ["DataTable"],
  "@/hooks/use-data-table": ["useDataTable"],
  "@/components/tiers/new-form": ["TiersNewForm"],
  "@/components/tiers/change-key": ["TiersChangeKey"],
  "@/components/tiers/transition-job": ["TiersTransitionJob"],
}
function moduleUrl(path: string, overrides: Record<string, string> = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  return `data:text/javascript,${encodeURIComponent(
    source.replace(/from "([^"]+)"/g, (_, specifier: string) => {
      let url = overrides[specifier]
      if (!url && mockExports[specifier]) {
        const exports = mockExports[specifier]
          .map(
            (name) =>
              `export function ${name}(...args) { return globalThis[Symbol.for("tier-deletion-components")].${name}(...args) }`,
          )
          .join("\n")
        url = `data:text/javascript,${encodeURIComponent(exports)}`
      }
      return `from "${url ?? (specifier.startsWith("@/") ? new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href : import.meta.resolve(specifier))}"`
    }),
  )}`
}
const hookUrl = moduleUrl("hooks/use-tiers.ts")
const dialogUrl = moduleUrl("components/tiers/deletion-dialog.tsx", { "@/hooks/use-tiers": hookUrl })
const { TierDeletionDialog } = (await import(dialogUrl)) as { TierDeletionDialog: typeof DialogComponent }
const { default: TiersPage } = (await import(
  moduleUrl("app/(dashboard)/tiers/page.tsx", {
    "@/hooks/use-tiers": hookUrl,
    "@/components/tiers/deletion-dialog": dialogUrl,
  })
)) as { default: React.ComponentType }

const clear = {
  tierName: "ARCHIVE",
  proofComplete: true,
  scanStatus: "complete",
  reasons: [],
  remote: { state: "not_checked" },
}
const blocked = (kind = "CLEANUP_PENDING") => ({
  ...clear,
  proofComplete: false,
  scanStatus: "stopped_after_blocker",
  reasons: [{ kind }],
})
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

async function mount(
  t: TestContext,
  options: {
    page?: boolean
    tierName?: string
    check?: unknown
    checkStatus?: number
    deleteStatus?: number
    deleteCode?: string
  } = {},
) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const descriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const calls: { path: string; method: string; body: unknown; suppress403Redirect: unknown }[] = []
  let check: unknown = options.check ?? blocked()
  let checkStatus = options.checkStatus ?? 200
  let retry: unknown = {
    tierName: "ARCHIVE",
    status: "accepted",
    scanned: 0,
    enqueued: 0,
    failed: 0,
    scanTruncated: false,
  }
  let retryStatus = 202
  let deleteStatus = options.deleteStatus ?? 409
  let deleteWait: Promise<unknown> | undefined
  const successes: string[] = [],
    errors: string[] = []
  let closes = 0,
    deleted = 0,
    lists = 0
  let confirm: { onPositiveClick: () => Promise<void> } | undefined
  const api = new ApiClient({
    fetch: async (input, init) => {
      const path = String(input),
        method = init?.method ?? "GET"
      calls.push({
        path,
        method,
        body: init?.body,
        suppress403Redirect: (init as Record<string, unknown>)?.suppress403Redirect,
      })
      let data: unknown = {},
        status = 200
      if (path.endsWith("/deletion-check")) {
        data = await check
        status = checkStatus
      } else if (path.endsWith("/cleanup-retry")) {
        data = await retry
        status = retryStatus
      } else if (method === "DELETE") {
        await deleteWait
        status = deleteStatus
        data = { Code: options.deleteCode ?? "XMinioAdminTierBackendInUse", Message: "original deletion error" }
      } else {
        lists++
        data = deleteStatus === 204 ? [] : [{ type: "s3", s3: { name: "ARCHIVE" } }]
      }
      return new Response(status === 204 ? null : JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    },
  })
  const feedback = { success: (value: string) => successes.push(value), error: (value: string) => errors.push(value) }
  const translate = (value: string) => value
  const mocks = {
    useApi: () => api,
    useTranslation: () => ({ t: translate }),
    useMessage: () => feedback,
    useDialog: () => ({
      error: (options: typeof confirm) => {
        confirm = options
      },
    }),
    Button: ({ children, disabled, onClick, ref }: UiProps) =>
      React.createElement("button", { disabled, onClick, ref }, children),
    Alert: ({ children, role }: UiProps) => React.createElement("div", { role }, children),
    AlertDescription: passthrough,
    AlertTitle: passthrough,
    Dialog: ({ open, children }: UiProps) => (open ? React.createElement("div", { role: "dialog" }, children) : null),
    DialogBody: passthrough,
    DialogContent: passthrough,
    DialogDescription: passthrough,
    DialogFooter: passthrough,
    DialogHeader: passthrough,
    DialogTitle: passthrough,
    Page: passthrough,
    PageHeader: ({ children, actions }: UiProps) => React.createElement("header", null, children, actions),
    useDataTable: (props: unknown) => ({ table: props }),
    DataTable: ({
      table,
    }: {
      table: { data: { s3: { name: string } }[]; columns: { id: string; cell: (props: unknown) => React.ReactNode }[] }
    }) =>
      React.createElement(
        "div",
        null,
        table.data.map((row, i) =>
          React.createElement(
            "div",
            { key: i },
            row.s3.name,
            table.columns.find((c) => c.id === "actions")?.cell({ row: { original: row } }),
          ),
        ),
      ),
    TiersNewForm: () => null,
    TiersChangeKey: () => null,
    TiersTransitionJob: () => null,
  }
  Object.defineProperty(globalThis, mocksKey, { configurable: true, value: mocks })
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  let props: DialogProps = {
    tierName: options.tierName ?? "ARCHIVE",
    originalError: "original deletion error",
    onClose: () => {
      closes++
    },
    onDeleted: () => {
      deleted++
    },
  }
  let unmounted = false
  const render = async (changes: Partial<DialogProps> = {}) => {
    props = { ...props, ...changes }
    await React.act(async () =>
      root.render(options.page ? React.createElement(TiersPage) : React.createElement(TierDeletionDialog, props)),
    )
  }
  const click = async (label: string, twice = false) => {
    const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === label)
    assert.ok(button, `expected button ${label}`)
    await React.act(async () => {
      button.click()
      if (twice) button.click()
    })
  }
  const unmount = async () => {
    await React.act(async () => root.unmount())
    unmounted = true
  }
  t.after(async () => {
    if (!unmounted) await unmount()
    await browser.happyDOM.close()
    Reflect.deleteProperty(globalThis, mocksKey)
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  await render()
  return {
    container,
    calls,
    successes,
    errors,
    render,
    click,
    unmount,
    text: () => container.textContent,
    hasButton: (label: string) => Array.from(container.querySelectorAll("button")).some((b) => b.textContent === label),
    isDisabled: (label: string) =>
      Array.from(container.querySelectorAll("button")).find((b) => b.textContent === label)?.disabled,
    counts: () => ({ closes, deleted, lists }),
    setCheck: (value: unknown, status = 200) => {
      check = value
      checkStatus = status
    },
    setRetry: (value: unknown, status = 202) => {
      retry = value
      retryStatus = status
    },
    setDeleteWait: (value: Promise<unknown>) => {
      deleteWait = value
    },
    setDeleteStatus: (value: number) => {
      deleteStatus = value
    },
    confirmDelete: async () => {
      assert.ok(confirm)
      await React.act(async () => confirm?.onPositiveClick())
    },
  }
}

test("diagnostic and cleanup requests encode the tier, suppress forbidden redirects and use a null POST body", async (t) => {
  const name = "A /?#层"
  const ui = await mount(t, { tierName: name, check: { ...blocked(), tierName: name } })
  ui.setRetry({ tierName: name, status: "accepted", enqueued: 0 })
  await ui.click("Retry object cleanup")
  assert.deepEqual(
    ui.calls.map(({ path, method, body, suppress403Redirect }) => ({ path, method, body, suppress403Redirect })),
    [
      {
        path: `/tier/${encodeURIComponent(name)}/deletion-check`,
        method: "GET",
        body: undefined,
        suppress403Redirect: true,
      },
      {
        path: `/tier/${encodeURIComponent(name)}/cleanup-retry`,
        method: "POST",
        body: null,
        suppress403Redirect: true,
      },
    ],
  )
  assert.deepEqual(ui.successes, [])
  assert.equal(ui.counts().deleted, 0)
})

for (const kind of [
  "LIFECYCLE_REFERENCE",
  "LIVE_TRANSITIONED_VERSION",
  "CLEANUP_PENDING",
  "TRANSITION_PENDING",
  "PROOF_INCOMPLETE",
  "FUTURE_REASON",
  "__proto__",
]) {
  test(`dialog explains ${kind} and limits cleanup to observed cleanup blockers`, async (t) => {
    const ui = await mount(t, { check: blocked(kind) })
    assert.ok(ui.text().includes("original deletion error"))
    assert.equal(ui.hasButton("Retry object cleanup"), kind === "CLEANUP_PENDING")
    assert.equal(ui.hasButton("Retry deletion"), false)
    if (["FUTURE_REASON", "__proto__"].includes(kind)) assert.match(ui.text(), /unrecognized blocker/)
    else assert.doesNotMatch(ui.text(), /unrecognized blocker/)
    assert.match(ui.text(), /Other blockers may remain/)
    assert.match(ui.text(), /reachability was not checked/)
  })
}
for (const status of [404, 405, 501]) {
  test(`old server HTTP ${status} preserves the original error and supports recheck`, async (t) => {
    const ui = await mount(t, { check: { Code: "NotImplemented" }, checkStatus: status })
    assert.match(ui.text(), /original deletion error/)
    assert.match(ui.text(), /does not support tier deletion diagnostics/)
    assert.equal(ui.hasButton("Retry deletion"), false)
    ui.setCheck(clear)
    await ui.click("Recheck")
    assert.equal(ui.hasButton("Retry deletion"), true)
  })
}

test("malformed diagnosis remains unknown rather than a deletion success", async (t) => {
  const ui = await mount(t, { check: { future: true } })
  assert.match(ui.text(), /unrecognized diagnosis/)
  assert.match(ui.text(), /original deletion error/)
  assert.equal(ui.hasButton("Retry deletion"), false)
})

for (const status of ["accepted", "busy", "future", "already_running"]) {
  test(`cleanup ${status} never reports deletion success or removes a tier`, async (t) => {
    const ui = await mount(t)
    ui.setRetry({ tierName: "ARCHIVE", status, enqueued: 0, scanTruncated: true })
    await ui.click("Retry object cleanup")
    assert.deepEqual(ui.successes, [])
    assert.equal(ui.counts().deleted, 0)
    assert.equal(ui.counts().closes, 0)
    assert.equal(ui.hasButton("Retry deletion"), false)
    assert.match(
      ui.text(),
      status === "accepted" ? /pass was accepted/ : status === "busy" ? /was deferred/ : /unknown cleanup retry status/,
    )
    if (status === "accepted") assert.match(ui.text(), /scan reached a limit/)
  })
}

test("cleanup failures remain visible and allow retry without a deletion success", async (t) => {
  const ui = await mount(t)
  ui.setRetry({ Code: "AccessDenied", Message: "cleanup denied" }, 403)
  await ui.click("Retry object cleanup")
  assert.match(ui.text(), /cleanup denied/)
  assert.deepEqual(ui.successes, [])
  assert.equal(ui.isDisabled("Retry object cleanup"), false)
})

test("successful advisory recheck still requires an authoritative DELETE with force=false", async (t) => {
  const ui = await mount(t)
  ui.setCheck(clear)
  await ui.click("Recheck")
  await ui.click("Retry deletion")
  assert.deepEqual(ui.successes, [])
  assert.equal(ui.counts().deleted, 0)
  assert.equal(ui.hasButton("Retry deletion"), false)
  assert.match(ui.text(), /original deletion error/)
  ui.setDeleteStatus(204)
  await ui.click("Recheck")
  await ui.click("Retry deletion")
  assert.equal(
    ui.calls.filter((c) => c.method === "DELETE").every((c) => c.path === "/tier/ARCHIVE?force=false"),
    true,
  )
  assert.deepEqual(ui.successes, ["Delete Success"])
  assert.equal(ui.counts().deleted, 1)
  assert.equal(ui.counts().closes, 1)
})

test("pending cleanup prevents duplicate requests, deletion and closing", async (t) => {
  const ui = await mount(t)
  const pending = deferred<unknown>()
  ui.setRetry(pending.promise)
  await ui.click("Retry object cleanup", true)
  assert.equal(ui.calls.filter((c) => c.method === "POST").length, 1)
  assert.equal(ui.isDisabled("Close"), true)
  assert.equal(ui.isDisabled("Recheck"), true)
  assert.match(ui.text(), /Checking or submitting/)
  await React.act(async () => pending.resolve({ tierName: "ARCHIVE", status: "accepted" }))
  assert.equal(ui.isDisabled("Close"), false)
})

test("late diagnosis after switching tiers cannot enable deletion of the next tier", async (t) => {
  const pending = deferred<unknown>()
  const ui = await mount(t, { check: pending.promise })
  ui.setCheck({ ...blocked("LIFECYCLE_REFERENCE"), tierName: "OTHER" })
  await ui.render({ tierName: "OTHER" })
  await React.act(async () => pending.resolve(clear))
  assert.match(ui.text(), /Lifecycle rules still reference/)
  assert.equal(ui.hasButton("Retry deletion"), false)
})

test("late cleanup response after switching tiers cannot leak accepted feedback", async (t) => {
  const ui = await mount(t)
  const pending = deferred<unknown>()
  ui.setRetry(pending.promise)
  await ui.click("Retry object cleanup")
  ui.setCheck({ ...blocked("LIFECYCLE_REFERENCE"), tierName: "OTHER" })
  await ui.render({ tierName: "OTHER" })
  await React.act(async () => pending.resolve({ tierName: "ARCHIVE", status: "accepted" }))
  assert.doesNotMatch(ui.text(), /pass was accepted/)
  assert.equal(ui.hasButton("Retry object cleanup"), false)
})

test("late diagnosis after unmount does not notify, close or reload", async (t) => {
  const pending = deferred<unknown>()
  const ui = await mount(t, { check: pending.promise })
  await ui.unmount()
  await React.act(async () => pending.resolve(clear))
  assert.deepEqual(ui.successes, [])
  assert.deepEqual(ui.counts(), { closes: 0, deleted: 0, lists: 0 })
})

for (const code of ["XMinioAdminTierBackendInUse", "AccessDenied", "TierRemoveFailed"]) {
  test(`list deletion failure ${code} keeps the item and diagnoses only blocked codes`, async (t) => {
    const ui = await mount(t, { page: true, deleteCode: code })
    await ui.click("Delete")
    await ui.confirmDelete()
    assert.match(ui.text(), /ARCHIVE/)
    assert.equal(ui.counts().lists, 1)
    assert.equal(ui.container.querySelector('[role="dialog"]') !== null, code === "XMinioAdminTierBackendInUse")
    assert.deepEqual(ui.successes, [])
    assert.deepEqual(ui.errors, ["original deletion error"])
  })
}

test("accepted cleanup in the actual page does not reload or remove the failed tier", async (t) => {
  const ui = await mount(t, { page: true })
  await ui.click("Delete")
  await ui.confirmDelete()
  await ui.click("Retry object cleanup")
  assert.equal(ui.counts().lists, 1)
  assert.match(ui.text(), /ARCHIVE/)
  assert.deepEqual(ui.successes, [])
  ui.setCheck(clear)
  ui.setDeleteStatus(204)
  await ui.click("Recheck")
  await ui.click("Retry deletion")
  assert.deepEqual(ui.successes, ["Delete Success"])
  assert.equal(ui.counts().lists, 2)
  assert.equal(ui.container.querySelector('[role="dialog"]'), null)
})

test("late successful DELETE after unmount does not emit success or reload", async (t) => {
  const ui = await mount(t, { check: clear, deleteStatus: 204 })
  const pending = deferred<unknown>()
  ui.setDeleteWait(pending.promise)
  await ui.click("Retry deletion", true)
  assert.equal(ui.calls.filter((c) => c.method === "DELETE").length, 1)
  await ui.unmount()
  await React.act(async () => pending.resolve(null))
  assert.deepEqual(ui.successes, [])
  assert.deepEqual(ui.counts(), { closes: 0, deleted: 0, lists: 0 })
})

test("a failed diagnostic read can be retried and retains the original deletion error", async (t) => {
  const ui = await mount(t, { check: { Code: "InternalError", Message: "diagnostic unavailable" }, checkStatus: 500 })
  assert.match(ui.text(), /diagnostic unavailable/)
  assert.match(ui.text(), /original deletion error/)
  ui.setCheck(blocked("TRANSITION_PENDING"))
  await ui.click("Recheck")
  assert.match(ui.text(), /transition is still pending/)
  assert.doesNotMatch(ui.text(), /diagnostic unavailable/)
})

test("NotImplemented code keeps the old server deletion error even on an unexpected HTTP status", async (t) => {
  const ui = await mount(t, { check: { Code: "NotImplemented", Message: "unsupported" }, checkStatus: 400 })
  assert.match(ui.text(), /does not support tier deletion diagnostics/)
  assert.match(ui.text(), /original deletion error/)
})

test("closing the diagnostic returns focus to the current row deletion button", async (t) => {
  const ui = await mount(t, { page: true })
  await ui.click("Delete")
  await ui.confirmDelete()
  await ui.click("Close")
  const button = Array.from(ui.container.querySelectorAll("button")).find((element) => element.textContent === "Delete")
  assert.ok(button)
  assert.equal(ui.container.ownerDocument.activeElement, button)
})
