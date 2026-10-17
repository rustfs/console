import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import ts from "typescript"
import type { OidcForm as OidcFormComponent } from "../../components/oidc/form"
import type { OidcConfigProvider, OidcProviderFormValues, SaveOidcConfigPayload } from "../../types/oidc"

type FormProps = React.ComponentProps<typeof OidcFormComponent>
const mocksKey = Symbol.for("oidc-config-page")
const source = ts.transpileModule(
  readFileSync(new URL("../../app/(dashboard)/oidc/page.tsx", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } },
).outputText
const testSource = source.replace(/import (.*?) from "([^"]+)";/gs, (statement, bindings, specifier) => {
  if (!specifier.startsWith("@/") || specifier === "@/types/oidc") {
    const url = specifier.startsWith("@/")
      ? new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href
      : specifier === "react-i18next"
        ? null
        : import.meta.resolve(specifier)
    if (url) return `import ${bindings} from "${url}";`
  }
  const exports = bindings
    .replace(/[{}\s]/g, "")
    .split(",")
    .map((name: string) =>
      name === "CONSOLE_SCOPES"
        ? 'export const CONSOLE_SCOPES = { CONSOLE_ADMIN: "console:admin" };'
        : `export const ${name} = (...args) => globalThis[Symbol.for("oidc-config-page")]["${name}"](...args);`,
    )
    .join("\n")
  return statement.replace(specifier, `data:text/javascript,${encodeURIComponent(exports)}`)
})
const { default: OidcPage } = (await import(`data:text/javascript,${encodeURIComponent(testSource)}`)) as {
  default: React.ComponentType
}

const provider: OidcConfigProvider = {
  provider_id: "example",
  source: "persisted",
  editable: true,
  enabled: true,
  display_name: "Example",
  config_url: "https://idp.example.com/.well-known/openid-configuration",
  client_id: "console",
  client_secret_configured: true,
  scopes: ["openid", "profile", "email"],
  other_audiences: [],
  redirect_uri: null,
  redirect_uri_dynamic: true,
  claim_name: "groups",
  claim_prefix: "",
  role_policy: "",
  groups_claim: "groups",
  roles_claim: "",
  email_claim: "email",
  username_claim: "preferred_username",
}

async function mount(
  t: TestContext,
  overrides: Partial<OidcConfigProvider> = {},
  saveError?: Error,
  initialReadError?: Error,
) {
  const browser = new Window()
  const globals = { window: browser, document: browser.document, IS_REACT_ACT_ENVIRONMENT: true }
  const descriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  let currentProvider = { ...provider, ...overrides }
  let form: FormProps | undefined
  let reads = 0
  let readError = initialReadError
  const saves: { providerId: string; payload: SaveOidcConfigPayload }[] = []
  const errors: string[] = []
  const successes: string[] = []
  const message = {
    error: (text: string) => errors.push(text),
    success: (text: string) => successes.push(text),
    warning: () => {},
  }
  const tKey = (key: string) => key
  const api = {
    getOidcConfig: async () => {
      reads += 1
      if (readError) throw readError
      return { providers: [currentProvider], restart_required: saves.length > 0 }
    },
    saveOidcConfig: async (providerId: string, payload: SaveOidcConfigPayload) => {
      saves.push({ providerId, payload })
      if (saveError) throw saveError
      currentProvider = { ...currentProvider, ...payload, redirect_uri: payload.redirect_uri || null }
      return { success: true, message: "OIDC provider saved", restart_required: true }
    },
  }
  const passthrough = ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children)
  const mocks = {
    useTranslation: () => ({ t: tKey }),
    useMessage: () => message,
    useDialog: () => ({}),
    usePermissions: () => ({ isAdmin: true }),
    useOidcConfig: () => api,
    Page: passthrough,
    Spinner: () => null,
    Button: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) =>
      React.createElement("button", { onClick }, children),
    PageHeader: passthrough,
    Alert: passthrough,
    AlertTitle: passthrough,
    AlertDescription: passthrough,
    ProviderList: () => null,
    OidcForm: (props: FormProps) => {
      form = props
      return null
    },
  }
  Object.defineProperty(globalThis, mocksKey, { configurable: true, value: mocks })
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  t.after(async () => {
    await React.act(async () => root.unmount())
    await browser.happyDOM.close()
    Reflect.deleteProperty(globalThis, mocksKey)
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  await React.act(async () => root.render(React.createElement(OidcPage)))
  const getForm = () => {
    assert.ok(form, "expected the provider form to render")
    return form
  }
  const change = async <K extends keyof OidcProviderFormValues>(field: K, value: OidcProviderFormValues[K]) => {
    await React.act(async () => getForm().onChange(field, value))
  }
  const save = async () => {
    await React.act(async () => {
      await getForm().onSave()
    })
  }
  return {
    getForm,
    change,
    save,
    saves,
    errors,
    successes,
    getReads: () => reads,
    hasForm: () => form !== undefined,
    text: () => container.textContent,
    setReadError: (error?: Error) => {
      readError = error
    },
    retry: async () => {
      await React.act(async () => container.querySelector("button")?.click())
    },
  }
}

test("a dynamic provider with a null redirect URI can be edited and saved again after reload", async (t) => {
  const ui = await mount(t)
  assert.equal(ui.getForm().values.redirect_uri, "")
  await ui.change("display_name", "Updated provider")
  await ui.save()
  assert.equal(ui.saves[0].providerId, "example")
  assert.equal(ui.saves[0].payload.display_name, "Updated provider")
  assert.equal(ui.saves[0].payload.redirect_uri, "")
  assert.equal(ui.saves[0].payload.client_secret, undefined)
  assert.equal(ui.getForm().values.redirect_uri, "")
  assert.equal(ui.getForm().restartRequired, true)
  await ui.change("display_name", "Updated again")
  await ui.save()
  assert.equal(ui.saves[1].payload.display_name, "Updated again")
  assert.equal(ui.getReads(), 3)
  assert.deepEqual(ui.errors, [])
  assert.equal(ui.successes.length, 2)
})

test("a dynamic provider with an empty string redirect URI can be saved", async (t) => {
  const ui = await mount(t, { redirect_uri: "" })
  await ui.change("display_name", "Updated provider")
  await ui.save()
  assert.equal(ui.saves.length, 1)
  assert.equal(ui.saves[0].payload.redirect_uri_dynamic, true)
  assert.deepEqual(ui.errors, [])
})

test("disabling dynamic redirects requires a redirect URI before saving", async (t) => {
  const ui = await mount(t)
  await ui.change("redirect_uri_dynamic", false)
  await ui.save()
  assert.equal(ui.saves.length, 0)
  assert.equal(ui.getForm().errors.redirect_uri, "Redirect URI is required when dynamic redirect is disabled")
  assert.deepEqual(ui.errors, ["Please fix the form errors before saving"])
  assert.equal(ui.getForm().isSaving, false)
})

test("a static provider preserves its callback URL when another field is changed", async (t) => {
  const redirectUri = "https://rustfs.example.com/rustfs/admin/v3/oidc/callback/example"
  const ui = await mount(t, { redirect_uri_dynamic: false, redirect_uri: redirectUri })
  await ui.change("display_name", "Updated provider")
  await ui.save()
  assert.equal(ui.saves[0].payload.redirect_uri, redirectUri)
  assert.equal(ui.saves[0].payload.redirect_uri_dynamic, false)
  assert.deepEqual(ui.errors, [])
})

test("unexpected validation errors are reported and leave saving available", async (t) => {
  const ui = await mount(t)
  await ui.change("config_url", null as unknown as string)
  await ui.save()
  assert.equal(ui.saves.length, 0)
  assert.match(ui.errors[0], /trim/)
  assert.equal(ui.getForm().isSaving, false)
})

test("unexpected payload errors are reported and reset the saving state", async (t) => {
  const ui = await mount(t)
  await ui.change("claim_prefix", null as unknown as string)
  await ui.save()
  assert.equal(ui.saves.length, 0)
  assert.match(ui.errors[0], /trim/)
  assert.equal(ui.getForm().isSaving, false)
})

test("a failed save reports the API error and preserves the edited fields", async (t) => {
  const ui = await mount(t, {}, new Error("Failed to save server config"))
  await ui.change("display_name", "Updated provider")
  await ui.save()
  assert.deepEqual(ui.errors, ["Failed to save server config"])
  assert.deepEqual(ui.successes, [])
  assert.equal(ui.getForm().values.display_name, "Updated provider")
  assert.equal(ui.getForm().isSaving, false)
  assert.equal(ui.getReads(), 1)
})

test("a failed provider read does not masquerade as a new provider and can be retried", async (t) => {
  const ui = await mount(t, {}, undefined, new Error("Unavailable"))
  assert.equal(ui.hasForm(), false)
  assert.match(ui.text(), /Failed to load OIDC providers/)
  ui.setReadError()
  await ui.retry()
  assert.equal(ui.getForm().values.provider_id, "example")
  assert.equal(ui.getForm().isReadOnly, false)
})

test("a failed reload preserves the selected provider and edited fields", async (t) => {
  const ui = await mount(t)
  await ui.change("display_name", "Updated provider")
  ui.setReadError(new Error("Unavailable"))
  await ui.save()
  assert.equal(ui.getForm().values.provider_id, "example")
  assert.equal(ui.getForm().values.display_name, "Updated provider")
  assert.equal(ui.getForm().isReadOnly, true)
  assert.match(ui.text(), /Retry/)
})
