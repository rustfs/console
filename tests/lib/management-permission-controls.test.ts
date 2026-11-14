import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import * as React from "react"
import { createRoot } from "react-dom/client"
import { Window, type HTMLInputElement as TestInputElement } from "happy-dom"
import ts from "typescript"

type Context = { bucket?: string; objectKey?: string; keyId?: string }
type Check = { action: string; context?: Context }
type Props = {
  children?: React.ReactNode
  open?: boolean
  disabled?: boolean
  type?: "button" | "submit" | "reset"
  onClick?: () => void
  [key: string]: unknown
}
const mocksKey = Symbol.for("management-permission-controls")

function moduleUrl(path: string) {
  const base = new URL(`../../${path}`, import.meta.url)
  const source = ts.transpileModule(readFileSync(base, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const rewritten = source
    .replace(/import\s+\{([^}]+)\}\s+from "([^"]+)"/g, (match, bindings: string, specifier: string) => {
      let url: string
      if (
        specifier.startsWith("@/components/") ||
        specifier.startsWith("@/hooks/") ||
        specifier === "react-i18next" ||
        specifier === "@/lib/feedback/message" ||
        (specifier.startsWith(".") && specifier !== "./permission-context")
      ) {
        const names = bindings
          .split(",")
          .map((name) => name.trim().split(/\s+as\s+/)[0])
          .filter(Boolean)
        const exports = names
          .map(
            (name) =>
              `export function ${name}(...args) { return globalThis[Symbol.for("management-permission-controls")].invoke(${JSON.stringify(specifier)}, ${JSON.stringify(name)}, ...args) }`,
          )
          .join("\n")
        url = `data:text/javascript,${encodeURIComponent(exports)}`
      } else if (specifier.startsWith("@/")) {
        const stem = new URL(`../../${specifier.slice(2)}`, import.meta.url)
        url = [".ts", ".tsx", ".js"]
          .map((extension) => `${stem.href}${extension}`)
          .find((value) => existsSync(new URL(value)))!
      } else if (specifier.startsWith(".")) {
        url = new URL(`${specifier}.ts`, base).href
      } else {
        url = import.meta.resolve(specifier)
      }
      return match.replace(`"${specifier}"`, `"${url}"`)
    })
    .replace(/from "(react(?:\/jsx-runtime)?)"/g, (_, specifier) => `from "${import.meta.resolve(specifier)}"`)
  return `data:text/javascript,${encodeURIComponent(rewritten)}`
}

const { UserGroupNewForm } = await import(moduleUrl("components/user-group/new-form.tsx"))
const { TiersChangeKey } = await import(moduleUrl("components/tiers/change-key.tsx"))
const { TableDialog } = await import(moduleUrl("components/table-catalog/table-dialog.tsx"))
const { NamespaceDialog } = await import(moduleUrl("components/table-catalog/namespace-dialog.tsx"))
const { UserEditForm } = await import(moduleUrl("components/user/edit-form.tsx"))
const { default: SsePage } = await import(moduleUrl("app/(dashboard)/sse/page.tsx"))
const { TableCommitDialog } = await import(moduleUrl("components/table-catalog/table-commit-dialog.tsx"))
const { ViewDialog } = await import(moduleUrl("components/table-catalog/view-dialog.tsx"))
const { RekeyCard } = await import(moduleUrl("components/sse/rekey-card.tsx"))
const { default: ImportExportPage } = await import(moduleUrl("app/(dashboard)/import-export/page.tsx"))

async function mount(
  t: TestContext,
  component: React.ComponentType<Record<string, unknown>>,
  props: Record<string, unknown>,
  options: {
    allowed?: (action: string, context?: Context) => boolean
    freshAllowed?: (action: string, context?: Context) => boolean | Promise<boolean>
    rekeyState?: "idle" | "running"
    importWait?: Promise<unknown>
  } = {},
) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const descriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const requests: { method: string; args: unknown[] }[] = []
  const checks: Check[] = []
  const inputs = new Map<string, (event: { target: { value: string } }) => void>()
  let selectUploadFile: ((file: File | null) => void) | undefined
  const errors: string[] = []
  const translate = (value: string) => value
  const feedback = { success: () => {}, warning: () => {}, error: (value: string) => errors.push(value) }
  const permissions = {
    canAction: (action: string, context?: Context) => options.allowed?.(action, context) ?? true,
    checkAction: async (action: string, context?: Context) => {
      checks.push({ action, context })
      return options.freshAllowed?.(action, context) ?? true
    },
  }
  const api = {
    isLoading: false,
    importIamConfig: async (...args: unknown[]) => {
      requests.push({ method: "importIamConfig", args })
      await options.importWait
    },
    exportIamConfig: async (...args: unknown[]) => {
      requests.push({ method: "exportIamConfig", args })
    },
    getRekeyStatus: async () => ({ state: options.rekeyState ?? "idle", scanned: 0, updated: 0 }),
    startRekey: async (...args: unknown[]) => {
      requests.push({ method: "startRekey", args })
      return { state: "completed" }
    },
    cancelRekey: async (...args: unknown[]) => {
      requests.push({ method: "cancelRekey", args })
      return { state: "cancelled" }
    },
    loadTable: async () => ({
      metadata: { "table-uuid": "fixture-uuid" },
      metadataLocation: "s3://warehouse/metadata/v1.json",
    }),
    commitTable: async (...args: unknown[]) => {
      requests.push({ method: "commitTable", args })
      return {}
    },
    createView: async (...args: unknown[]) => {
      requests.push({ method: "createView", args })
      return {}
    },
    getKMSStatus: async () => ({
      status: "Running",
      backend_type: "Local",
      healthy: true,
      config_summary: {
        backend_type: "Local",
        default_key_id: "default-key",
        backend_summary: { key_dir: "/fixture/keys", file_permissions: 384 },
      },
    }),
    getDetailedStatus: async () => ({
      backend_type: "Local",
      capabilities: { schedule_deletion: true, physical_delete: true },
    }),
    getKeyList: async () => ({ keys: [{ key_id: "key-1", state: "Enabled" }] }),
    deleteKey: async (...args: unknown[]) => {
      requests.push({ method: "deleteKey", args })
      return { success: true }
    },
    forceDeleteKey: async (...args: unknown[]) => {
      requests.push({ method: "forceDeleteKey", args })
      return { success: true }
    },
    cancelKeyDeletion: async (...args: unknown[]) => {
      requests.push({ method: "cancelKeyDeletion", args })
      return { success: true }
    },
    getUser: async (name: string) => ({ accessKey: name, memberOf: [], policyName: "", status: "enabled" }),
    listGroup: async () => [],
    listPolicies: async () => ({}),
    updateGroupMembers: async (...args: unknown[]) => {
      requests.push({ method: "updateGroupMembers", args })
    },
    updateTiers: async (...args: unknown[]) => {
      requests.push({ method: "updateTiers", args })
    },
    createTable: async (...args: unknown[]) => {
      requests.push({ method: "createTable", args })
    },
    createNamespace: async (...args: unknown[]) => {
      requests.push({ method: "createNamespace", args })
    },
    getNamespace: async () => ({ properties: {} }),
    updateNamespaceProperties: async (...args: unknown[]) => {
      requests.push({ method: "updateNamespaceProperties", args })
    },
  }
  const passthrough = ({ children }: Props) => React.createElement("div", null, children)
  const mocks = {
    invoke(specifier: string, name: string, ...args: unknown[]) {
      if (name === "usePermissions") return permissions
      if (name === "useActionChecks") return
      if (name === "useMessage") return feedback
      if (name === "useTranslation") return { t: translate }
      if (
        ["useGroups", "useTiers", "useTableCatalog", "useUsers", "usePolicies", "useSSE", "useImportExport"].includes(
          name,
        )
      )
        return api
      const value = (args[0] ?? {}) as Props
      if (name === "Button" || name === "AlertDialogAction" || name === "AlertDialogCancel")
        return React.createElement(
          "button",
          {
            type: value.type ?? "button",
            disabled: value.disabled,
            onClick: value.onClick,
            "aria-label": typeof value["aria-label"] === "string" ? value["aria-label"] : undefined,
          },
          value.children,
        )
      if (name === "Input" || name === "Textarea") {
        const { name: inputName, id, value: inputValue, disabled, onChange } = value
        inputs.set(String(id ?? inputName), onChange as (event: { target: { value: string } }) => void)
        return React.createElement(name === "Input" ? "input" : "textarea", {
          id: String(id),
          value: String(inputValue ?? ""),
          disabled,
          onChange: () => {},
        })
      }
      if (name === "Dialog") return value.open ? passthrough(value) : null
      if (name === "UploadZone") {
        selectUploadFile = value.onChange as (file: File | null) => void
        return React.createElement("div", { "data-upload-disabled": String(Boolean(value.disabled)) }, value.children)
      }
      if (name === "UserSelector") return null
      if (name === "UserEditSecretKey")
        return React.createElement("input", { "data-permission-field": "secret", disabled: value.disabled })
      if (name === "Switch")
        return React.createElement("input", { id: String(value.id), type: "checkbox", disabled: value.disabled })
      if (specifier.startsWith(".")) return null
      if (specifier.startsWith("@/components/")) return passthrough(value)
      throw new Error(`Unexpected mock ${specifier}:${name}`)
    },
  }
  Object.defineProperty(globalThis, mocksKey, { configurable: true, value: mocks })
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  await React.act(async () =>
    root.render(React.createElement(component, { open: true, onOpenChange: () => {}, onSuccess: () => {}, ...props })),
  )
  const button = (label: string) => {
    const result = Array.from(container.querySelectorAll("button")).find(
      (value) => value.textContent === label || value.getAttribute("aria-label") === label,
    )
    assert.ok(result, `expected button ${label}`)
    return result
  }
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
    requests,
    container,
    checks,
    errors,
    button,
    change: async (id: string, value: string) => {
      assert.ok(inputs.has(id))
      await React.act(async () => inputs.get(id)!({ target: { value } }))
    },
    chooseFile: async (file: File | null) => {
      assert.ok(selectUploadFile)
      await React.act(async () => selectUploadFile!(file))
    },
    click: async (label: string, twice = false) => {
      const target = button(label)
      await React.act(async () => {
        target.click()
        if (twice) target.click()
      })
    },
  }
}

test("query-only group permissions disable adding a group", async (t) => {
  const ui = await mount(t, UserGroupNewForm, {}, { allowed: (action) => action === "admin:GetGroup" })
  assert.equal(ui.button("Submit").disabled, true)
  await ui.click("Submit")
  assert.deepEqual(ui.requests, [])
})

test("group creation rechecks the membership endpoint action before mutation", async (t) => {
  const ui = await mount(t, UserGroupNewForm, {}, { freshAllowed: () => false })
  await ui.change("user-group-name", "restricted")
  await ui.click("Submit")
  assert.deepEqual(ui.checks, [{ action: "admin:AddUserToGroup", context: undefined }])
  assert.deepEqual(ui.requests, [])
})

test("revoked tier credentials write permission prevents the update request", async (t) => {
  const ui = await mount(t, TiersChangeKey, { tierName: "ARCHIVE" }, { freshAllowed: () => false })
  await ui.change("tier-change-access-key", "fixture-key")
  await ui.change("tier-change-secret-key", "fixture-secret")
  await ui.click("Submit")
  assert.deepEqual(ui.requests, [])
  assert.equal(ui.checks[0]?.action, "admin:SetTier")
})

test("a restricted table grant enables only the named table target", async (t) => {
  const context = { bucket: "warehouse", objectKey: "namespaces/sales/quarter/tables/allowed" }
  const ui = await mount(
    t,
    TableDialog,
    { bucket: "warehouse", namespace: ["sales", "quarter"], canCreate: true },
    {
      allowed: (action, target) => action === "admin:CreateTable" && target?.objectKey === context.objectKey,
    },
  )
  await ui.change("table-catalog-table-name", "denied")
  assert.equal(ui.button("Create table").disabled, true)
  await ui.change("table-catalog-table-name", "allowed")
  assert.equal(ui.button("Create table").disabled, false)
  await ui.click("Create table")
  assert.deepEqual(ui.checks[0], { action: "admin:CreateTable", context })
  assert.equal(ui.requests[0]?.method, "createTable")
})

test("a fresh table denial prevents an allowed cached create button from calling the API", async (t) => {
  const ui = await mount(
    t,
    TableDialog,
    { bucket: "warehouse", namespace: ["sales"], canCreate: true },
    { freshAllowed: () => false },
  )
  await ui.change("table-catalog-table-name", "allowed")
  await ui.click("Create table")
  assert.deepEqual(ui.requests, [])
  assert.equal(ui.errors[0], "Access Denied")
})

test("namespace creation checks its hierarchical catalog resource", async (t) => {
  const ui = await mount(t, NamespaceDialog, { bucket: "warehouse", canCreate: true })
  await ui.change("table-catalog-namespace", "sales.quarter")
  await ui.click("Create namespace")
  assert.deepEqual(ui.checks[0], {
    action: "admin:SetTableNamespace",
    context: { bucket: "warehouse", objectKey: "namespaces/sales/quarter" },
  })
  assert.equal(ui.requests[0]?.method, "createNamespace")
})

test("user activation permission enables status but leaves credential editing read-only", async (t) => {
  const ui = await mount(
    t,
    UserEditForm,
    { row: { accessKey: "alice", status: "enabled" } },
    {
      allowed: (action) => ["admin:GetUser", "admin:EnableUser"].includes(action),
    },
  )
  const secret = ui.container.querySelector<TestInputElement>('[data-permission-field="secret"]')
  const status = ui.container.querySelector<TestInputElement>("#edit-user-status")
  assert.ok(secret)
  assert.ok(status)
  assert.equal(secret.disabled, true)
  assert.equal(status.disabled, false)
})

test("KMS key deletion is disabled when the selected key has an explicit denial", async (t) => {
  const ui = await mount(
    t,
    SsePage,
    {},
    { allowed: (action, context) => action !== "kms:DeleteKey" || context?.keyId !== "key-1" },
  )
  assert.equal(ui.button("Schedule Deletion").disabled, true)
  assert.deepEqual(ui.requests, [])
})

test("KMS deletion confirmation rechecks the real key ID before mutation", async (t) => {
  const ui = await mount(t, SsePage, {}, { freshAllowed: (action) => action !== "kms:DeleteKey" })
  assert.equal(ui.button("Schedule Deletion").disabled, false)
  await ui.click("Schedule Deletion")
  await ui.click("Schedule Key Deletion")
  assert.deepEqual(
    ui.checks.find(({ action }) => action === "kms:DeleteKey"),
    { action: "kms:DeleteKey", context: { keyId: "key-1" } },
  )
  assert.equal(
    ui.requests.some(({ method }) => method === "deleteKey"),
    false,
  )
})

test("table commits recheck the actual namespace and table before changing metadata", async (t) => {
  const identifier = { namespace: ["sales", "quarter"], name: "orders" }
  const ui = await mount(
    t,
    TableCommitDialog,
    { bucket: "warehouse", identifier, canCommit: true },
    { freshAllowed: () => false },
  )
  await ui.click("Commit table")
  assert.deepEqual(ui.checks[0], {
    action: "admin:CommitTable",
    context: { bucket: "warehouse", objectKey: "namespaces/sales/quarter/tables/orders" },
  })
  assert.equal(
    ui.requests.some(({ method }) => method === "commitTable"),
    false,
  )
})

test("view creation checks the view catalog resource instead of a table resource", async (t) => {
  const ui = await mount(
    t,
    ViewDialog,
    { bucket: "warehouse", namespace: ["sales"], mode: "create", canSubmit: true },
    { freshAllowed: () => false },
  )
  await ui.change("table-catalog-view-name", "revenue")
  await ui.click("Create view")
  assert.deepEqual(ui.checks[0], {
    action: "admin:CreateTable",
    context: { bucket: "warehouse", objectKey: "namespaces/sales/views/revenue" },
  })
  assert.equal(
    ui.requests.some(({ method }) => method === "createView"),
    false,
  )
})

test("a denied rekey action disables the sweep entry", async (t) => {
  const ui = await mount(t, RekeyCard, { rewrapSupported: true }, { allowed: (action) => action !== "kms:Rekey" })
  assert.equal(ui.button("Start Rekey Sweep").disabled, true)
})

test("rekey confirmation rechecks permission before starting the sweep", async (t) => {
  const ui = await mount(t, RekeyCard, { rewrapSupported: true }, { freshAllowed: (action) => action !== "kms:Rekey" })
  const buttons = Array.from(ui.container.querySelectorAll("button")).filter(
    (button) => button.textContent === "Start Rekey Sweep",
  )
  await React.act(async () => buttons.at(-1)!.click())
  assert.equal(ui.checks[0]?.action, "kms:Rekey")
  assert.equal(
    ui.requests.some(({ method }) => method === "startRekey"),
    false,
  )
})

test("rekey cancellation rechecks the cluster rekey action before mutation", async (t) => {
  const ui = await mount(
    t,
    RekeyCard,
    { rewrapSupported: true },
    { rekeyState: "running", freshAllowed: (action) => action !== "kms:Rekey" },
  )
  await ui.click("Cancel Sweep")
  assert.equal(ui.checks[0]?.action, "kms:Rekey")
  assert.equal(
    ui.requests.some(({ method }) => method === "cancelRekey"),
    false,
  )
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

test("IAM import synchronously locks permission checks and freezes the selected file", async (t) => {
  const permission = deferred<boolean>()
  const ui = await mount(t, ImportExportPage, {}, { freshAllowed: () => permission.promise })
  const original = new File(["original"], "first.zip")
  const replacement = new File(["replacement"], "replacement.zip")
  await ui.chooseFile(original)
  await ui.click("Import Now", true)
  assert.equal(ui.checks.length, 1)
  assert.equal(ui.button("Importing…").disabled, true)
  assert.equal(ui.button("Remove").disabled, true)
  assert.equal(ui.container.querySelector('[data-upload-disabled="true"]') !== null, true)
  await ui.chooseFile(replacement)
  assert.ok(ui.container.textContent.includes("first.zip"))
  assert.equal(ui.container.textContent.includes("replacement.zip"), false)
  await React.act(async () => permission.resolve(true))
  const imports = ui.requests.filter(({ method }) => method === "importIamConfig")
  assert.equal(imports.length, 1)
  assert.equal(imports[0]?.args[0], original)
  assert.equal(ui.button("Import Now").disabled, true)
})

test("denied import authorization releases the lock and preserves the file for retry", async (t) => {
  const permission = deferred<boolean>()
  let attempts = 0
  const ui = await mount(t, ImportExportPage, {}, { freshAllowed: () => (attempts++ ? true : permission.promise) })
  const file = new File(["fixture"], "retry.zip")
  await ui.chooseFile(file)
  await ui.click("Import Now", true)
  await React.act(async () => permission.resolve(false))
  assert.equal(
    ui.requests.some(({ method }) => method === "importIamConfig"),
    false,
  )
  assert.equal(ui.button("Import Now").disabled, false)
  assert.ok(ui.container.textContent.includes("retry.zip"))
  await ui.click("Import Now")
  assert.equal(ui.requests.filter(({ method }) => method === "importIamConfig").length, 1)
  assert.equal(ui.checks.length, 2)
})

test("a failed IAM import releases the pending state without losing the selected file", async (t) => {
  const imported = deferred<unknown>()
  const ui = await mount(t, ImportExportPage, {}, { importWait: imported.promise })
  const original = new File(["fixture"], "failed.zip")
  await ui.chooseFile(original)
  await ui.click("Import Now", true)
  assert.equal(ui.requests.filter(({ method }) => method === "importIamConfig").length, 1)
  assert.equal(ui.button("Importing…").disabled, true)
  await React.act(async () => imported.reject(new Error("import failed")))
  assert.equal(ui.button("Import Now").disabled, false)
  assert.ok(ui.container.textContent.includes("failed.zip"))
  assert.equal(ui.button("Remove").disabled, false)
})

test("namespace whitespace normalization is identical for preview authorization and the actual write", async (t) => {
  const expected = { bucket: "warehouse", objectKey: "namespaces/sales/quarter" }
  const ui = await mount(
    t,
    NamespaceDialog,
    { bucket: "warehouse", canCreate: true },
    {
      allowed: (action, context) => action === "admin:SetTableNamespace" && context?.objectKey === expected.objectKey,
    },
  )
  await ui.change("table-catalog-namespace", " sales. quarter ")
  assert.equal(ui.button("Create namespace").disabled, false)
  await ui.click("Create namespace")
  assert.deepEqual(ui.checks[0], { action: "admin:SetTableNamespace", context: expected })
  assert.deepEqual(ui.requests.find(({ method }) => method === "createNamespace")?.args.slice(0, 2), [
    "warehouse",
    ["sales", "quarter"],
  ])
})
