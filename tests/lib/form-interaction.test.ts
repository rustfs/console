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
const { BucketNewForm } = await load("../../components/buckets/new-form.tsx")
const { SiteReplicationNewForm } = await load("../../components/site-replication/new-form.tsx")
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
  return { container }
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
