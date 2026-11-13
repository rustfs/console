import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"
import ts from "typescript"
import type { MrfNodeObservation, MrfObservation } from "../../types/recovery"

const sourceFiles = ["components/recovery/status.tsx", "components/recovery/list.tsx"]
const source = sourceFiles.map((file) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")).join("\n")
const translationKeys = [...source.matchAll(/\bt\(\s*"([^"]+)"/g)].map((match) => match[1])
const translations = Object.fromEntries(
  readdirSync(new URL("../../i18n/locales/", import.meta.url))
    .filter((file) => file.endsWith(".json"))
    .map((file) => [
      file.slice(0, -5),
      { translation: JSON.parse(readFileSync(new URL(`../../i18n/locales/${file}`, import.meta.url), "utf8")) },
    ]),
)
const i18n = createInstance()
await i18n.init({
  lng: "en-US",
  fallbackLng: false,
  resources: translations,
  interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  returnNull: false,
})

const dataUrl = (value: string) => `data:text/javascript,${encodeURIComponent(value)}`
const primitives = dataUrl(
  `import { createElement } from ${JSON.stringify(import.meta.resolve("react"))};\n` +
    ["Alert", "AlertDescription", "AlertTitle", "Badge", "Button"]
      .map((name) => `export const ${name} = ({children}) => createElement("span", null, children);`)
      .join("\n"),
)
const statusSource = ts.transpileModule(
  readFileSync(new URL("../../components/recovery/status.tsx", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } },
).outputText
const statusModule = statusSource.replace(/from "([^"]+)"/g, (_, specifier: string) => {
  const url = specifier.startsWith("@/components/ui/")
    ? primitives
    : specifier === "@/lib/functions"
      ? dataUrl("export const formatDateTime = (value) => String(value);")
      : specifier === "@/lib/export-file"
        ? dataUrl("export const exportFile = () => {};")
        : specifier.startsWith("@/")
          ? new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href
          : import.meta.resolve(specifier)
  return `from "${url}"`
})
const { ObservationCoverage } = (await import(
  dataUrl(statusModule)
)) as typeof import("../../components/recovery/status")

test("recovery interpolation uses actual component keys and real locale resources in every language", () => {
  const cases = [
    { prefix: "Nodes responding on this page:", values: { responding: 2, expected: 24 } },
    { prefix: "This page:", values: { known: 7, unknown: 11 } },
    { prefix: "View responsibility on ", values: { node: "rustfs-node-3:9000" } },
  ]
  for (const { prefix, values } of cases) {
    const keys = translationKeys.filter((key) => key.startsWith(prefix))
    assert.equal(keys.length, 1, prefix)
    const key = keys[0]
    for (const [locale, resources] of Object.entries(translations)) {
      assert.ok(resources.translation[key], `${locale}: ${key}`)
      const rendered = i18n.t(key, { lng: locale, ...values })
      assert.doesNotMatch(rendered, /[{}]/, `${locale}: ${rendered}`)
      for (const value of Object.values(values)) assert.ok(rendered.includes(String(value)), `${locale}: ${rendered}`)
    }
  }
})

test("integrity job mode uses recovery-specific translations without changing global replication labels", () => {
  const integritySource = readFileSync(new URL("../../components/recovery/integrity.tsx", import.meta.url), "utf8")
  assert.match(integritySource, /t\("Verification mode"\)/)
  assert.match(integritySource, /request\.mode === "audit" \? "Integrity audit" : "Protected migration"/)
  assert.doesNotMatch(integritySource, /t\("Mode"\)/)
  const expected = {
    "zh-CN": { mode: "核验方式", audit: "完整性核验", globalMode: "复制模式", globalAudit: "审计" },
    "zh-TW": { mode: "核驗方式", audit: "完整性核驗", globalMode: "複製模式", globalAudit: "稽核" },
  }
  for (const [locale, resources] of Object.entries(translations)) {
    const translated = expected[locale as keyof typeof expected]
    assert.equal(resources.translation["Verification mode"], translated?.mode ?? "Verification mode", locale)
    assert.equal(resources.translation["Integrity audit"], translated?.audit ?? "Integrity audit", locale)
    assert.equal(i18n.t("Verification mode", { lng: locale }), translated?.mode ?? "Verification mode", locale)
    assert.equal(i18n.t("Integrity audit", { lng: locale }), translated?.audit ?? "Integrity audit", locale)
    if (translated) {
      assert.equal(i18n.t("Mode", { lng: locale }), translated.globalMode, locale)
      assert.equal(i18n.t("Audit", { lng: locale }), translated.globalAudit, locale)
    }
  }
})

test("observation coverage renders response counts through real react-i18next including zero", async () => {
  for (const locale of ["en-US", "zh-CN"]) {
    await i18n.changeLanguage(locale)
    for (const responding of [0, 2]) {
      const data: MrfObservation = {
        contractVersion: 1,
        topologyFingerprint: "topology",
        observationStartedAtMs: 1,
        observationFinishedAtMs: 2,
        expectedNodes: 24,
        pageComplete: false,
        nextCursor: null,
        nodes: Array.from(
          { length: 2 },
          (_, index): MrfNodeObservation => ({
            nodeId: String(index + 1).repeat(64),
            host: `node-${index + 1}`,
            state: responding > index ? "ok" : "unavailable",
            reply:
              responding > index
                ? { result: "get", observation: { contractVersion: 1, observedAtMs: 2, responsibility: null } }
                : undefined,
          }),
        ),
      }
      const rendered = renderToStaticMarkup(
        createElement(I18nextProvider, { i18n }, createElement(ObservationCoverage, { data })),
      )
      const expected =
        locale === "en-US"
          ? `Nodes responding on this page: ${responding} / 24 expected`
          : `本页已响应节点：${responding} / 预期 24`
      assert.ok(rendered.includes(expected), rendered)
      assert.doesNotMatch(rendered, /\{(?:responding|expected)\}/)
    }
  }
})
