import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import ts from "typescript"
import type { LoginFormProps } from "../../components/auth/login-form"
import { buildSiteReplicationTlsPayload, isHttpsSiteReplicationEndpoint } from "../../lib/site-replication-tls"

const key = Symbol.for("console-login-interaction")
type Props = { children?: React.ReactNode; [name: string]: unknown }
type Mock = (...args: never[]) => unknown
const pass = ({ children }: Props) => React.createElement("div", null, children)

async function load(file: string) {
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const replaced = source.replace(
    /import (.*?) from "([^"]+)";/gs,
    (statement, bindings: string, specifier: string) => {
      if (specifier === "react" || specifier === "react/jsx-runtime") {
        return `import ${bindings} from "${import.meta.resolve(specifier)}";`
      }
      if (specifier === "@/lib/events-target-config")
        return `import ${bindings} from "${new URL("../../lib/events-target-config.ts", import.meta.url).href}";`
      if (specifier === "@/lib/mfa")
        return `import ${bindings} from "${new URL("../../lib/mfa.ts", import.meta.url).href}";`
      const names = bindings.startsWith("{")
        ? bindings
            .replace(/[{}\s]/g, "")
            .split(",")
            .filter(Boolean)
        : ["default"]
      const exports = names
        .map((name) => {
          if (name === "configManager")
            return 'export const configManager = { loadConfig: (...args) => globalThis[Symbol.for("console-login-interaction")].configManager.loadConfig(...args) };'
          const implementation = `(...args) => globalThis[Symbol.for("console-login-interaction")]["${name}"](...args)`
          return name === "default" ? `export default ${implementation};` : `export const ${name} = ${implementation};`
        })
        .join("\n")
      return statement.replace(specifier, `data:text/javascript,${encodeURIComponent(exports)}`)
    },
  )
  return import(`data:text/javascript,${encodeURIComponent(replaced)}`)
}

const { LoginForm } = await load("../../components/auth/login-form.tsx")
const { EventsTargetNewForm } = await load("../../components/events-target/new-form.tsx")
const { BucketNewForm } = await load("../../components/buckets/new-form.tsx")
const { SiteReplicationNewForm } = await load("../../components/site-replication/new-form.tsx")
const { ObjectUploadPicker } = await load("../../components/object/upload-picker.tsx")
const { default: LoginPage } = await load("../../app/(auth)/auth/login/page.tsx")

async function mount(t: TestContext, component: React.ReactElement, overrides: Record<string, unknown>) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const previous = Object.keys(globals).map(
    (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
  )
  for (const [name, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true })
  }
  const translate = (text: string) => text
  const mocks = new Proxy(
    {
      useTranslation: () => ({ t: translate }),
      getThemeManifest: () => ({ brand: { name: "RustFS" }, links: {} }),
      withUtm: (url: string) => url,
      default: ({ children }: Props) => React.createElement("a", null, children),
      ...overrides,
    },
    { get: (target, name) => Reflect.get(target, name) ?? pass },
  )
  Reflect.set(globalThis, key, mocks)
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  t.after(async () => {
    await React.act(async () => root.unmount())
    await browser.happyDOM.close()
    Reflect.deleteProperty(globalThis, key)
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else Reflect.deleteProperty(globalThis, name)
    }
  })
  await React.act(async () => root.render(component))
  return { container, browser }
}

const formDefaults: LoginFormProps = {
  method: "accessKeyAndSecretKey",
  setMethod: () => {},
  accessKeyAndSecretKey: { accessKeyId: "alice", secretAccessKey: "secret" },
  setAccessKeyAndSecretKey: () => {},
  sts: { accessKeyId: "", secretAccessKey: "", sessionToken: "" },
  setSts: () => {},
  handleLogin: () => {},
}

test("recovery codes retain every typed character, support deletion and stay separate from TOTP", async (t) => {
  const inputs = new Map<string, { value: string; onChange: Mock }>()
  const input = (props: Props) => {
    inputs.set(props.id as string, props as never)
    return null
  }
  function Form() {
    const [code, setCode] = React.useState("")
    return React.createElement(LoginForm, {
      ...formDefaults,
      secondFactor: {
        code,
        setCode,
        error: "",
        submitting: false,
        onSubmit: () => {},
        onCancel: () => {},
        accountName: "alice",
      },
    })
  }
  await mount(t, React.createElement(Form), { Input: input, InputOTP: input })
  const setRecovery = async (value: string) =>
    React.act(async () => {
      inputs.get("login-mfa-recovery")!.onChange({ target: { value } } as never)
    })
  for (const value of ["A", "AB", "ABC", "ABCD", "ABCD-", "ABCD-E", "ABCD-EFGH-JKLM-NPQR-STVW"]) {
    await setRecovery(value)
    assert.equal(inputs.get("login-mfa-recovery")!.value, value)
    assert.equal(inputs.get("login-mfa-code")!.value, "")
  }
  await setRecovery("ABCD-")
  assert.equal(inputs.get("login-mfa-recovery")!.value, "ABCD-")
  await React.act(async () => inputs.get("login-mfa-code")!.onChange("123456" as never))
  assert.equal(inputs.get("login-mfa-recovery")!.value, "")
  assert.equal(inputs.get("login-mfa-code")!.value, "123456")
  await setRecovery("WXYZ-1234-5678-90AB-CDEF")
  assert.equal(inputs.get("login-mfa-code")!.value, "")
})

async function loginPage(t: TestContext) {
  let props: LoginFormProps
  const deferred = Promise.withResolvers<{ status: "mfa-required"; challenge: string }>()
  const attempts: unknown[] = []
  const verifications: unknown[] = []
  const errors: unknown[] = []
  const router = { replace: () => {} }
  const params = new URLSearchParams()
  const api = {
    isAuthenticated: false,
    login: async (credentials: unknown) => {
      attempts.push(credentials)
      return deferred.promise
    },
    completeLoginWithSecondFactor: async (...args: unknown[]) => {
      verifications.push(args)
    },
  }
  const feedback = { error: (text: string) => errors.push(text), success: () => {}, warning: () => {} }
  await mount(t, React.createElement(LoginPage), {
    LoginForm: (value: LoginFormProps) => {
      props = value
      return null
    },
    useRouter: () => router,
    useSearchParams: () => params,
    useAuth: () => api,
    useMessage: () => feedback,
    configManager: { loadConfig: async () => ({ serverHost: "http://fixture.test" }) },
    fetchOidcProviders: async () => [],
  })
  return {
    get props() {
      return props!
    },
    deferred,
    attempts,
    verifications,
    errors,
  }
}

const submitEvent = { preventDefault() {} } as React.FormEvent

test("login blocks duplicate submissions and binds MFA to the credentials accepted by the first request", async (t) => {
  const ui = await loginPage(t)
  await React.act(async () =>
    ui.props.setAccessKeyAndSecretKey({ accessKeyId: "alice", secretAccessKey: "first-secret" }),
  )
  await React.act(async () => {
    void ui.props.handleLogin(submitEvent)
    void ui.props.handleLogin(submitEvent)
  })
  assert.equal(ui.attempts.length, 1)
  assert.equal(ui.props.submitting, true)
  // Even a programmatic state change cannot replace the credentials bound to the challenge.
  await React.act(async () =>
    ui.props.setAccessKeyAndSecretKey({ accessKeyId: "bob", secretAccessKey: "second-secret" }),
  )
  await React.act(async () => ui.deferred.resolve({ status: "mfa-required", challenge: "challenge-1" }))
  assert.equal(ui.props.secondFactor?.accountName, "alice")
  await React.act(async () => ui.props.secondFactor!.setCode("123456"))
  await React.act(async () => ui.props.secondFactor!.onSubmit(submitEvent))
  assert.deepEqual(ui.verifications[0], [
    { accessKeyId: "alice", secretAccessKey: "first-secret" },
    { code: "123456", challenge: "challenge-1" },
    { serverHost: "http://fixture.test" },
  ])
})

test("a failed login restores the submit action and reports the failure", async (t) => {
  const ui = await loginPage(t)
  await React.act(async () => {
    void ui.props.handleLogin(submitEvent)
  })
  await React.act(async () => ui.deferred.reject(new Error("Unavailable")))
  assert.equal(ui.props.submitting, false)
  assert.deepEqual(ui.errors, ["Login Failed"])
})

test("object lock and versioning change together, and a pending bucket creation cannot be dismissed", async (t) => {
  const switches = new Map<string, { checked: boolean; onCheckedChange: (value: boolean) => void }>()
  let nameInput: { onChange: (event: { target: { value: string } }) => void }
  let createButton: { onClick: () => void; disabled: boolean }
  let cancelButton: { disabled: boolean }
  let modal: { onOpenChange: (open: boolean) => void }
  const request = Promise.withResolvers<void>()
  const closed: boolean[] = []
  const creates: unknown[] = []
  const versions: unknown[] = []
  const api = {
    createBucket: async (payload: unknown) => {
      creates.push(payload)
      await request.promise
    },
    putBucketVersioning: async (...args: unknown[]) => {
      versions.push(args)
    },
  }
  await mount(
    t,
    React.createElement(BucketNewForm, { show: true, onShowChange: (open: boolean) => closed.push(open) }),
    {
      useBucket: () => api,
      usePermissions: () => ({ canCapability: () => true }),
      useMessage: () => ({ error: () => {}, success: () => {} }),
      getOptionalBucketNameError: () => null,
      cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
      Input: (props: Props) => {
        if (props.id === "bucket-name") nameInput = props as unknown as typeof nameInput
        return null
      },
      Switch: (props: Props) => {
        switches.set(props.id as string, props as never)
        return null
      },
      Dialog: (props: Props) => {
        modal = props as unknown as typeof modal
        return pass(props)
      },
      Button: (props: Props) => {
        if (props.variant === "default") createButton = props as unknown as typeof createButton
        else cancelButton = props as unknown as typeof cancelButton
        return pass(props)
      },
    },
  )
  await React.act(async () => switches.get("bucket-new-object-lock")!.onCheckedChange(true))
  assert.equal(switches.get("bucket-new-object-lock")!.checked, true)
  assert.equal(switches.get("bucket-new-version")!.checked, true)
  await React.act(async () => switches.get("bucket-new-version")!.onCheckedChange(false))
  assert.equal(switches.get("bucket-new-object-lock")!.checked, false)
  await React.act(async () => switches.get("bucket-new-object-lock")!.onCheckedChange(true))
  await React.act(async () => nameInput!.onChange({ target: { value: "research-archive" } }))
  await React.act(async () => {
    void createButton!.onClick()
  })
  await React.act(async () => modal!.onOpenChange(false))
  assert.equal(cancelButton!.disabled, true)
  assert.deepEqual(closed, [])
  await React.act(async () => request.resolve())
  assert.deepEqual(creates, [{ Bucket: "research-archive", ObjectLockEnabledForBucket: true }])
  assert.deepEqual(versions, [["research-archive", "Enabled"]])
  assert.deepEqual(closed, [false])
})

test("enabling bucket retention explains lifecycle expiration limits", async (t) => {
  const switches = new Map<string, { onCheckedChange: (value: boolean) => void }>()
  const { container } = await mount(t, React.createElement(BucketNewForm, { show: true, onShowChange: () => {} }), {
    useBucket: () => ({}),
    usePermissions: () => ({ canCapability: () => true }),
    useMessage: () => ({ error: () => {}, success: () => {} }),
    getOptionalBucketNameError: () => null,
    cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
    Input: () => null,
    Switch: (props: Props) => {
      switches.set(props.id as string, props as never)
      return null
    },
  })
  const warning = "lifecycle expiration cannot delete protected versions early"
  await React.act(async () => switches.get("bucket-new-object-lock")!.onCheckedChange(true))
  assert.equal(container.textContent?.includes(warning), false)
  await React.act(async () => switches.get("bucket-new-retention")!.onCheckedChange(true))
  assert.equal(container.textContent?.includes(warning), true)
})

test("site creation rejects every dismissal while saving and preserves values after failure", async (t) => {
  const inputs = new Map<string, { value: string; onChange: (event: { target: { value: string } }) => void }>()
  let modal: { onOpenChange: (open: boolean, details: { reason: string }) => void }
  let save: { onClick: () => Promise<void>; disabled: boolean }
  const request = Promise.withResolvers<{ success: boolean }>()
  const closed: boolean[] = []
  const submissions: unknown[] = []
  await mount(
    t,
    React.createElement(SiteReplicationNewForm, { open: true, onOpenChange: (open: boolean) => closed.push(open) }),
    {
      buildSiteReplicationTlsPayload,
      isHttpsSiteReplicationEndpoint,
      useMessage: () => ({ error: () => {}, success: () => {} }),
      useSiteReplication: () => ({
        addSiteReplication: async (sites: unknown) => {
          submissions.push(sites)
          return request.promise
        },
      }),
      Input: (props: Props) => {
        inputs.set(props.id as string, props as never)
        return null
      },
      Dialog: (props: Props) => {
        modal = props as never
        return pass(props)
      },
      Button: (props: Props) => {
        if (props.children === "Save" || props.children === "Saving…") save = props as never
        return pass(props)
      },
    },
  )
  for (const [id, value] of [
    ["site-endpoint-0", "https://east.example.test"],
    ["site-access-0", "site-access"],
    ["site-secret-0", "site-secret"],
  ]) {
    await React.act(async () => inputs.get(id)!.onChange({ target: { value } }))
  }
  let saving!: Promise<void>
  await React.act(async () => {
    saving = save!.onClick()
  })
  for (const reason of ["escape-key", "close-press", "outside-press"]) {
    await React.act(async () => modal!.onOpenChange(false, { reason }))
  }
  assert.deepEqual(closed, [])
  assert.equal(save!.disabled, true)
  assert.equal(submissions.length, 1)
  await React.act(async () => {
    request.reject(new Error("Unavailable"))
    await saving
  })
  assert.equal(inputs.get("site-endpoint-0")!.value, "https://east.example.test")
  assert.equal(save!.disabled, false)
  await React.act(async () => modal!.onOpenChange(false, { reason: "close-press" }))
  assert.deepEqual(closed, [false])
})

const uploadMocks = {
  RiInformationLine: () => React.createElement("svg"),
  Button: (props: Props) =>
    React.createElement(
      "button",
      {
        onClick: props.onClick as React.MouseEventHandler<HTMLButtonElement>,
        disabled: props.disabled as boolean,
        "aria-label": props["aria-label"] as string,
        ref: props.ref as React.Ref<HTMLButtonElement>,
      },
      props.children,
    ),
  Input: (props: Props) => React.createElement("input", props),
  useAddUploadFiles: () => () => {},
  useTaskPanelOpen: () => ({ setTaskPanelOpen: () => {} }),
  useMessage: () => ({ error: () => {}, warning: () => {} }),
  formatInteger: String,
  formatBytes: (size: number) => `${size} B`,
  normalizeUploadPrefix: (prefix: string) => prefix.replace(/^\/+|\/+$/g, ""),
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, size: 56, start: index * 56 })),
    getTotalSize: () => count * 56,
  }),
}

const uploadProps = {
  show: true,
  onShowChange: () => {},
  bucketName: "datasets",
  prefix: "activity-monitor/previews/",
  canUpload: true,
}

test("an empty upload offers both pickers and keeps upload disabled without a cleanup action", async (t) => {
  const { container } = await mount(t, React.createElement(ObjectUploadPicker, uploadProps), uploadMocks)
  const actions = [...container.querySelectorAll("button")].map((button) => ({
    name: button.getAttribute("aria-label") || button.textContent,
    disabled: button.disabled,
  }))

  assert.deepEqual(actions, [
    { name: "Select File", disabled: false },
    { name: "Select Folder", disabled: false },
    { name: "Cancel", disabled: false },
    { name: "Start Upload", disabled: true },
  ])
})

test("upload file removal names its target and clearing selection preserves the destination", async (t) => {
  const { container, browser } = await mount(t, React.createElement(ObjectUploadPicker, uploadProps), uploadMocks)
  const input = container.querySelector('input[name="upload-files"]')!
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [new File(["report"], "report.csv"), new File(["notes"], "notes.txt")],
  })
  await React.act(async () => input.dispatchEvent(new browser.Event("change", { bubbles: true })))
  await React.act(async () =>
    [...container.querySelectorAll("button")]
      .find((button) => button.getAttribute("aria-label") === "Delete report.csv")!
      .click(),
  )
  assert.equal(container.querySelector('[title="report.csv"]'), null)
  assert.ok(container.querySelector('[title="notes.txt"]'))
  assert.equal(browser.document.activeElement?.textContent, "Select File")

  await React.act(async () =>
    [...container.querySelectorAll("button")]
      .find((button) => button.getAttribute("aria-label") === "Clear All")!
      .click(),
  )
  assert.equal(container.querySelector('[title="notes.txt"]'), null)
  assert.equal(container.querySelector('button[aria-label="Clear All"]'), null)
  assert.equal(
    [...container.querySelectorAll("input")].find((input) => input.name === "upload-prefix")!.value,
    uploadProps.prefix,
  )
  assert.equal(browser.document.activeElement?.textContent, "Select File")
})

test("creating an event target preserves large numeric input exactly", async (t) => {
  const inputs = new Map<string, { value: string; onChange: (event: { target: { value: string } }) => void }>()
  let save: { onClick: () => Promise<void> }
  const calls: unknown[][] = []
  const ui = await mount(t, React.createElement(EventsTargetNewForm, { open: true, onOpenChange: () => {} }), {
    Input: (props: Props) => {
      inputs.set(
        props.name as string,
        props as unknown as { value: string; onChange: (event: { target: { value: string } }) => void },
      )
      return null
    },
    Button: (props: Props) => {
      if (props.children === "Save") save = props as unknown as typeof save
      return null
    },
    useEventTarget: () => ({
      updateEventTarget: async (...args: unknown[]) => {
        calls.push(args)
      },
      updateEventTargetInstance: async (...args: unknown[]) => {
        calls.push(args)
      },
    }),
    useMessage: () => ({ success: () => {}, error: () => {} }),
    buildRoute: (path: string) => path,
  })
  const nats = Array.from(ui.container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("NATS"),
  )!
  await React.act(async () => nats.click())
  await React.act(async () => inputs.get("target-name")!.onChange({ target: { value: "primary" } }))
  await React.act(async () => inputs.get("config-address")!.onChange({ target: { value: "nats://localhost:4222" } }))
  const large = "9007199254740993"
  await React.act(async () => inputs.get("config-queue_limit")!.onChange({ target: { value: large } }))
  assert.equal(inputs.get("config-queue_limit")!.value, large)
  await React.act(async () => save!.onClick())
  const createBody = calls[0][2] as { key_values: Array<{ key: string; value: string }> }
  assert.equal(createBody.key_values.find((entry) => entry.key === "queue_limit")?.value, large)
})

test("editing an event target preserves a cleared numeric field", async (t) => {
  const inputs = new Map<string, { value: string; onChange: (event: { target: { value: string } }) => void }>()
  let save: { onClick: () => Promise<void> }
  const calls: unknown[][] = []
  const config = { address: "nats://localhost:4222", queue_limit: "9007199254740993" }
  await mount(
    t,
    React.createElement(EventsTargetNewForm, {
      open: true,
      onOpenChange: () => {},
      edit: { type: "NATS", name: "primary", config, revision: "rev" },
    }),
    {
      Input: (props: Props) => {
        inputs.set(
          props.name as string,
          props as unknown as { value: string; onChange: (event: { target: { value: string } }) => void },
        )
        return null
      },
      Button: (props: Props) => {
        if (props.children === "Save") save = props as unknown as typeof save
        return null
      },
      useEventTarget: () => ({
        updateEventTarget: async (...args: unknown[]) => {
          calls.push(args)
        },
        updateEventTargetInstance: async (...args: unknown[]) => {
          calls.push(args)
        },
      }),
      useMessage: () => ({ success: () => {}, error: () => {} }),
      buildRoute: (path: string) => path,
    },
  )
  assert.equal(inputs.get("config-queue_limit")!.value, "9007199254740993")
  await React.act(async () => inputs.get("config-queue_limit")!.onChange({ target: { value: "" } }))
  assert.equal(inputs.get("config-queue_limit")!.value, "")
  await React.act(async () => save!.onClick())
  assert.equal((calls[0][2] as Record<string, string>).queue_limit, "")
  assert.equal((calls[0][3] as Record<string, string>).queue_limit, "9007199254740993")
})
