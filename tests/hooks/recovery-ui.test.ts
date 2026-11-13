import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { Window } from "happy-dom"
import ts from "typescript"
import { RecoveryError, type RecoveryClient } from "../../lib/recovery"
import type { IntegrityJob, MrfAction, MrfObservation, MrfResponsibility } from "../../types/recovery"

const nodeId = "a".repeat(64)
const id = "11111111-1111-1111-1111-111111111111"
const incarnation = "22222222-2222-2222-2222-222222222222"
const changedIncarnation = "33333333-3333-3333-3333-333333333333"
const dataUrl = (source: string) => `data:text/javascript,${encodeURIComponent(source)}`
const reactUrl = import.meta.resolve("react")
const uiKey = Symbol.for("recovery-ui-test")
const state = {
  observation: {
    data: null as MrfObservation | null,
    error: null as RecoveryError | null,
    loading: false,
    stale: false,
    refresh: async () => {},
  },
}
Reflect.set(globalThis, uiKey, state)
const modulePrelude = `import { createElement as h } from ${JSON.stringify(reactUrl)};`
const primitives = (entries: Record<string, string>) =>
  dataUrl(
    modulePrelude +
      Object.entries(entries)
        .map(
          ([name, tag]) =>
            `export const ${name} = ({children,variant,orientation,showCloseButton,open,onOpenChange,...props}) => h(${JSON.stringify(tag)},props,children);`,
        )
        .join("\n"),
  )
const overrides: Record<string, string> = {
  "react-i18next": dataUrl('export const useTranslation = () => ({t: (key) => key, i18n: {resolvedLanguage:"en"}});'),
  "@remixicon/react": primitives({
    RiArrowRightLine: "span",
    RiDownloadLine: "span",
    RiListCheck: "span",
    RiRefreshLine: "span",
    RiSearchLine: "span",
  }),
  "@/components/dialog": primitives({
    Dialog: "div",
    DialogBody: "div",
    DialogContent: "div",
    DialogDescription: "p",
    DialogFooter: "div",
    DialogHeader: "div",
    DialogTitle: "h2",
  }),
  "@/components/ui/alert": primitives({ Alert: "div", AlertDescription: "div", AlertTitle: "h3" }),
  "@/components/ui/badge": primitives({ Badge: "span" }),
  "@/components/ui/button": primitives({ Button: "button" }),
  "@/components/ui/field": primitives({
    Field: "div",
    FieldDescription: "p",
    FieldGroup: "div",
    FieldLabel: "label",
    FieldLegend: "legend",
    FieldSet: "fieldset",
  }),
  "@/components/ui/input": dataUrl(
    modulePrelude + 'export const Input = ({onChange,...props}) => h("input",{...props,onChange,onInput:onChange});',
  ),
  "@/components/ui/textarea": dataUrl(
    modulePrelude +
      'export const Textarea = ({onChange,...props}) => h("textarea",{...props,onChange,onInput:onChange});',
  ),
  "@/components/ui/checkbox": dataUrl(
    modulePrelude +
      'export const Checkbox = ({onCheckedChange,...props}) => h("input",{...props,type:"checkbox",onChange:(event)=>onCheckedChange(event.target.checked)});',
  ),
  "@/components/ui/spinner": primitives({ Spinner: "span" }),
  "@/hooks/use-recovery": dataUrl(
    'export const useRecoveryRead = () => globalThis[Symbol.for("recovery-ui-test")].observation;',
  ),
  "@/lib/feedback/message": dataUrl("export const useMessage = () => ({info:()=>{}});"),
  "@/lib/functions": dataUrl(
    'export const formatDateTime = (value, fallback="Unknown") => value == null ? fallback : String(value); export const niceBytes = (value) => value;',
  ),
  "@/lib/export-file": dataUrl("export const exportFile = () => {};"),
}

function moduleUrl(path: string) {
  const source = ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  return dataUrl(
    source.replace(
      /from "([^"]+)"/g,
      (_, specifier: string) =>
        `from "${overrides[specifier] ?? (specifier.startsWith("react") ? import.meta.resolve(specifier) : specifier)}"`,
    ),
  )
}

overrides["./status"] = moduleUrl("components/recovery/status.tsx")
const { RecoveryDetails } = (await import(
  moduleUrl("components/recovery/details.tsx")
)) as typeof import("../../components/recovery/details")

overrides["@/contexts/api-context"] = dataUrl("export const useApiReady = () => ({api:null,isReady:false});")
overrides["@/hooks/use-recovery"] = moduleUrl("hooks/use-recovery.ts")
overrides["@/hooks/use-data-table"] = dataUrl(
  "export const useDataTable = ({data,columns}) => ({table:{data,columns}});",
)
overrides["@/components/data-table/data-table"] = dataUrl(
  modulePrelude +
    `import { TableCell } from ${JSON.stringify(moduleUrl("components/ui/table.tsx"))};
    export const DataTable = ({table,caption}) => h("table",{"aria-label":caption},
      h("tbody",null,table.data.map((original,index) => h("tr",{key:index},
        table.columns.map((column) => h(TableCell,{key:column.id ?? column.accessorKey,"data-column":column.id ?? column.accessorKey},
          typeof column.cell === "function" ? h(column.cell,{row:{original}}) : null))))));`,
)
overrides["@/components/ui/separator"] = primitives({ Separator: "hr" })
const { RecoveryIntegrity } = (await import(
  moduleUrl("components/recovery/integrity.tsx")
)) as typeof import("../../components/recovery/integrity")

overrides["@/hooks/use-recovery"] = dataUrl(`
  const read = () => ({...globalThis[Symbol.for("recovery-ui-test")].observation,load:async()=>{}});
  export const useMrfList = read;
  export const useMrfSummary = read;`)
overrides["@/components/empty-state"] = dataUrl("export const EmptyState = () => null;")
overrides["@/components/ui/skeleton"] = primitives({ Skeleton: "span" })
const { RecoveryList } = (await import(
  moduleUrl("components/recovery/list.tsx")
)) as typeof import("../../components/recovery/list")
const { RecoverySummary } = (await import(
  moduleUrl("components/recovery/summary.tsx")
)) as typeof import("../../components/recovery/summary")

function row(overrides: Partial<MrfResponsibility> = {}): MrfResponsibility {
  return {
    responsibilityId: id,
    bucket: "bucket",
    object: "key",
    sourceBucketIncarnationId: null,
    bucketIncarnationId: incarnation,
    versionId: null,
    poolIndex: 0,
    setIndex: 0,
    enqueuedAtMs: 1,
    status: "legacy_generation_unknown",
    heldSinceMs: 2,
    accepted: null,
    ...overrides,
  }
}

function observe(current: MrfResponsibility | null): MrfObservation {
  return {
    contractVersion: 1,
    topologyFingerprint: "topology",
    observationStartedAtMs: 1,
    observationFinishedAtMs: 2,
    expectedNodes: 1,
    pageComplete: true,
    nextCursor: null,
    nodes: [
      {
        nodeId,
        host: "node",
        state: "ok",
        reply: { result: "get", observation: { contractVersion: 1, observedAtMs: 2, responsibility: current } },
      },
    ],
  }
}

async function mount(t: TestContext, initial = row(), mutation?: (action: MrfAction) => Promise<MrfObservation>) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previous = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  const calls: MrfAction[] = []
  const client = {
    endpoint: "https://server.test",
    mrfAction: async (action: MrfAction) => {
      calls.push(action)
      return mutation ? mutation(action) : observe(initial)
    },
  } as unknown as RecoveryClient
  let enabled = true
  state.observation = { data: observe(initial), error: null, loading: false, stale: false, refresh: async () => {} }
  const render = () =>
    act(async () =>
      root.render(
        createElement(RecoveryDetails, {
          client,
          target: { nodeId, host: "node", responsibility: initial, observedAtMs: 1 },
          enabled,
          onClose: () => {},
          onChanged: () => {},
        }),
      ),
    )
  t.after(async () => {
    await act(async () => root.unmount())
    await browser.happyDOM.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  await render()
  const button = (label: string) =>
    [...container.querySelectorAll("button")].find((button) => button.textContent === label)!
  return {
    container,
    calls,
    button,
    click: (label: string) => act(async () => button(label).click()),
    input: (id: string, value: string) =>
      act(async () => {
        const input = container.querySelector(`#${id}`) as unknown as HTMLInputElement
        input.value = value
        input.dispatchEvent(new browser.Event("input", { bubbles: true }) as unknown as Event)
      }),
    check: (id: string) => act(async () => (container.querySelector(`#${id}`) as unknown as HTMLInputElement).click()),
    submit: () =>
      act(async () =>
        container
          .querySelector("#recovery-risk-form")!
          .dispatchEvent(new browser.Event("submit", { bubbles: true, cancelable: true })),
      ),
    observe: async (value: MrfResponsibility | null) => {
      state.observation = { ...state.observation, data: observe(value) }
      await render()
    },
    stale: async () => {
      state.observation = { ...state.observation, stale: true, error: new RecoveryError("network") }
      await render()
    },
    permission: async (value: boolean) => {
      enabled = value
      await render()
    },
  }
}

async function completeRiskForm(view: Awaited<ReturnType<typeof mount>>) {
  await view.click("Accept unverified risk")
  await view.input("recovery-reason", "Incident decision")
  await view.input("recovery-reference", "INC-1")
  await view.check("recovery-risk")
  await view.check("recovery-unknown-source")
}

test("entering risk acceptance focuses the reason without stealing focus on subsequent updates", async (t) => {
  const view = await mount(t)
  view.button("Accept unverified risk").focus()
  await view.click("Accept unverified risk")
  assert.equal(view.container.ownerDocument.activeElement?.id, "recovery-reason")

  const reference = view.container.querySelector("#recovery-reference") as unknown as HTMLInputElement
  reference.focus()
  await view.input("recovery-reference", "INC-1")
  await view.observe(row())
  assert.equal(view.container.ownerDocument.activeElement?.id, "recovery-reference")
})

test("leaving risk acceptance restores its initiating action and preserves entered values", async (t) => {
  const view = await mount(t)
  await completeRiskForm(view)
  view.button("Back").focus()
  await view.click("Back")
  assert.equal(view.container.ownerDocument.activeElement?.textContent, "Accept unverified risk")
  assert.equal(view.calls.length, 0)

  await view.click("Accept unverified risk")
  assert.equal(view.container.ownerDocument.activeElement?.id, "recovery-reason")
  assert.equal(
    (view.container.querySelector("#recovery-reason") as unknown as HTMLTextAreaElement).value,
    "Incident decision",
  )
  assert.equal((view.container.querySelector("#recovery-reference") as unknown as HTMLInputElement).value, "INC-1")
})

test("a changed bucket incarnation invalidates existing risk acknowledgments before submission", async (t) => {
  const view = await mount(t)
  await completeRiskForm(view)
  await view.observe(row({ bucketIncarnationId: changedIncarnation }))
  await view.submit()
  assert.equal(view.calls.length, 0)
  assert.equal(view.button("Record risk acceptance").disabled, true)
})

test("unknown-source acceptance requires its extra acknowledgment and rejects excess UTF-8 bytes", async (t) => {
  const view = await mount(t)
  await view.click("Accept unverified risk")
  await view.input("recovery-reason", "Incident decision")
  await view.input("recovery-reference", "INC-1")
  await view.check("recovery-risk")
  await view.submit()
  assert.equal(view.calls.length, 0)
  assert.equal(view.container.querySelector("#recovery-unknown-source")?.getAttribute("aria-invalid"), "true")
  await view.check("recovery-unknown-source")
  await view.input("recovery-reason", "中".repeat(400))
  await view.submit()
  assert.equal(view.calls.length, 0)
  assert.equal(view.container.querySelector("#recovery-reason")?.getAttribute("aria-invalid"), "true")
})

test("not-observed, stale, and permission-disabled details cannot submit mutations", async (t) => {
  const view = await mount(t, row({ sourceBucketIncarnationId: incarnation, status: "held_unverified_legacy" }))
  await view.observe(null)
  assert.equal(view.button("Submit recheck").disabled, true)
  assert.equal(view.container.textContent.includes("This does not confirm retirement or data integrity"), true)
  await view.observe(row({ sourceBucketIncarnationId: incarnation, status: "held_unverified_legacy" }))
  await view.stale()
  assert.equal(view.button("Accept unverified risk").disabled, true)
  await view.permission(false)
  assert.equal(view.button("Refresh identity").disabled, true)
  assert.equal(view.calls.length, 0)
})

test("an uncertain action exposes reconciliation and locks further mutations without retry", async (t) => {
  const view = await mount(t, row(), async () => {
    throw new RecoveryError("timeout", true)
  })
  await completeRiskForm(view)
  await view.submit()
  assert.equal(view.calls.length, 1)
  assert.equal(view.container.textContent.includes("Action result unconfirmed"), true)
  assert.equal(view.button("Record risk acceptance").disabled, true)
  await view.submit()
  assert.equal(view.calls.length, 1)
  assert.equal(view.button("Export reconciliation details").disabled, false)
})

async function mountIntegrity(t: TestContext) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previous = Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const)
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  const calls: Array<{ bucket: string; id: string }> = []
  const job: IntegrityJob = {
    format_version: 1,
    id,
    bucket: "valid-bucket",
    bucket_incarnation: incarnation,
    request: {
      mode: "audit",
      items: [{ key: "source", version_id: "null", expected_sha256: null, target_key: null }],
      bytes_per_second: 1024,
      max_object_bytes: 1024,
    },
    state: "paused",
    revision: 1,
    results: [
      {
        state: "pending",
        source_fingerprint: null,
        expected_sha256: null,
        evidence_source: null,
        source_size: null,
        target_version_id: null,
        detail: null,
      },
    ],
    last_error: null,
  }
  const client = {
    endpoint: "https://server.test",
    integrityJob: async (bucket: string, id: string) => {
      calls.push({ bucket, id })
      return job
    },
  } as unknown as RecoveryClient
  t.after(async () => {
    await act(async () => root.unmount())
    await browser.happyDOM.close()
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  await act(async () =>
    root.render(createElement(RecoveryIntegrity, { client, canReadJobs: true, canReadReadiness: false })),
  )
  const input = (id: string) => container.querySelector(`#${id}`) as unknown as HTMLInputElement
  return {
    container,
    browser,
    calls,
    job,
    input,
    set: (id: string, value: string) =>
      act(async () => {
        input(id).value = value
        input(id).dispatchEvent(new browser.Event("input", { bubbles: true }) as unknown as Event)
      }),
    submit: () =>
      act(async () => container.querySelector("form")!.dispatchEvent(new browser.Event("submit", { bubbles: true }))),
    file: (file: File) =>
      act(async () => {
        Object.defineProperty(input("recovery-receipt"), "files", { configurable: true, value: [file] })
        input("recovery-receipt").dispatchEvent(new browser.Event("change", { bubbles: true }) as unknown as Event)
      }),
  }
}

test("invalid job selectors mark and describe only the affected field without clearing values", async (t) => {
  const view = await mountIntegrity(t)
  await view.set("recovery-job-bucket", "valid-bucket")
  await view.set("recovery-job-id", "not-a-uuid")
  await view.submit()
  assert.notEqual(view.input("recovery-job-bucket").getAttribute("aria-invalid"), "true")
  assert.equal(view.input("recovery-job-id").getAttribute("aria-invalid"), "true")
  assert.equal(view.input("recovery-job-id").getAttribute("aria-describedby"), "recovery-input-error")
  assert.equal(view.browser.document.activeElement?.id, "recovery-job-id")
  assert.equal(view.input("recovery-job-bucket").value, "valid-bucket")
  assert.equal(view.input("recovery-job-id").value, "not-a-uuid")
  assert.equal(view.calls.length, 0)

  await view.set("recovery-job-id", id)
  await view.set("recovery-job-bucket", "invalid/bucket")
  await view.submit()
  assert.equal(view.input("recovery-job-bucket").getAttribute("aria-invalid"), "true")
  assert.notEqual(view.input("recovery-job-id").getAttribute("aria-invalid"), "true")
  assert.equal(view.input("recovery-job-bucket").getAttribute("aria-describedby"), "recovery-input-error")
  assert.equal(view.browser.document.activeElement?.id, "recovery-job-bucket")
  assert.equal(view.calls.length, 0)
})

test("bad receipt files own their error while valid selectors and an existing result remain intact", async (t) => {
  const view = await mountIntegrity(t)
  await view.set("recovery-job-bucket", "valid-bucket")
  await view.set("recovery-job-id", id)
  await view.submit()
  assert.equal(view.calls.length, 1)
  assert.ok(view.container.querySelector("#recovery-result-title"))
  const files = [
    { size: 8 * 1024 * 1024 + 1, text: async () => "{}" },
    { size: 1, text: async () => "{" },
    { size: 2, text: async () => "{}" },
  ]
  for (const file of files) {
    await view.file(file as File)
    assert.equal(view.input("recovery-receipt").getAttribute("aria-invalid"), "true")
    assert.equal(
      view.input("recovery-receipt").getAttribute("aria-describedby"),
      "recovery-receipt-help recovery-input-error",
    )
    assert.notEqual(view.input("recovery-job-bucket").getAttribute("aria-invalid"), "true")
    assert.notEqual(view.input("recovery-job-id").getAttribute("aria-invalid"), "true")
    assert.equal(view.input("recovery-job-bucket").value, "valid-bucket")
    assert.equal(view.input("recovery-job-id").value, id)
    assert.ok(view.container.querySelector("#recovery-result-title"))
    assert.equal(view.calls.length, 1)
  }
})

test("receipt read errors focus the file input after importing has finished", async (t) => {
  const view = await mountIntegrity(t)
  let finishRead!: (value: string) => void
  const content = new Promise<string>((resolve) => {
    finishRead = resolve
  })
  await view.file({ size: 1, text: () => content } as File)
  assert.equal(view.input("recovery-receipt").disabled, true)

  await act(async () => finishRead("{"))
  assert.equal(view.input("recovery-receipt").disabled, false)
  assert.equal(view.browser.document.activeElement?.id, "recovery-receipt")
  assert.equal(view.calls.length, 0)
})

function renderRecoveryTable(t: TestContext, element: ReturnType<typeof createElement>) {
  const browser = new Window()
  const container = browser.document.createElement("div")
  container.innerHTML = renderToStaticMarkup(element)
  t.after(() => browser.happyDOM.close())
  return container
}

function assertTableTextWraps(
  container: Awaited<ReturnType<typeof mount>>["container"],
  column: string,
  value: string,
) {
  const cells = [...container.querySelectorAll(`td[data-column="${column}"]`)]
  const cell = cells.find((entry) => entry.textContent.includes(value))
  assert.ok(cell, `the ${column} cell retains the full value`)
  assert.equal(cell.classList.contains("whitespace-nowrap"), true, "the shared table cell still defaults to nowrap")
  const text = [...cell.querySelectorAll("span,p,dd")].find((entry) => entry.textContent.includes(value))
  assert.ok(text)
  const wrapping = text.closest(".whitespace-normal")
  assert.ok(wrapping && cell.contains(wrapping), `${column} content overrides inherited nowrap within its cell`)
  assert.ok(text.closest(".break-all"), `${column} content can wrap unbroken identifiers`)
}

test("responsibility table cells wrap complete long object keys and node names within their own columns", (t) => {
  const object = `archives/历史记录/${"object-key-".repeat(20)}.log`
  const host = `${"long-storage-node.".repeat(10)}example.test:9000`
  state.observation = {
    ...state.observation,
    data: {
      ...observe(null),
      nodes: [
        {
          nodeId,
          host,
          state: "ok",
          reply: {
            result: "list",
            observedAtMs: 2,
            snapshot: {
              contractVersion: 2,
              nodeLocal: true,
              checkpointOwner: nodeId,
              checkpointSequence: 1,
              heldCount: 0,
              legacyGenerationUnknownCount: 1,
              bucketIncarnationChangedCount: 0,
              operatorAcceptedCount: 0,
              responsibilities: [row({ object })],
            },
          },
        },
      ],
    },
    error: null,
    loading: false,
    stale: false,
  }
  const container = renderRecoveryTable(t, createElement(RecoveryList, { enabled: true, onInspect: () => {} }))
  assertTableTextWraps(container, "object", object)
  assertTableTextWraps(container, "responsibilities", host)
})

test("node observation cells wrap long hosts and diagnostic codes without changing shared table defaults", (t) => {
  const host = `${"long-storage-node.".repeat(10)}example.test:9000`
  const code = "diagnostic_".repeat(30)
  state.observation = {
    ...state.observation,
    data: { ...observe(null), nodes: [{ nodeId, host, state: "error", reply: { result: "error", code } }] },
    error: null,
    loading: false,
    stale: false,
  }
  const container = renderRecoveryTable(t, createElement(RecoverySummary, { enabled: true }))
  assertTableTextWraps(container, "host", host)
  assertTableTextWraps(container, "reason", code)
})

test("integrity table cells wrap long source and target keys, result details, and fingerprints", async (t) => {
  const view = await mountIntegrity(t)
  const key = `archives/历史记录/${"source-".repeat(30)}.log`
  const target = `verified/${"target-".repeat(30)}.log`
  const detail = "unavailable_".repeat(30)
  const fingerprint = "f".repeat(64)
  view.job.request.items[0] = { ...view.job.request.items[0], key, target_key: target }
  view.job.results[0] = { ...view.job.results[0], detail, source_fingerprint: fingerprint }
  await view.set("recovery-job-bucket", "valid-bucket")
  await view.set("recovery-job-id", id)
  await view.submit()
  assertTableTextWraps(view.container, "object", key)
  assertTableTextWraps(view.container, "object", target)
  assertTableTextWraps(view.container, "result", detail)
  assertTableTextWraps(view.container, "result", fingerprint)
})
