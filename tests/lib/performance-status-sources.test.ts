import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"
import type { PerformanceStatusSources as PerformanceStatusSourcesComponent } from "../../app/(dashboard)/_components/performance-status-sources"
import type { ClusterDiagnostics } from "../../lib/performance-data"

const source = ts.transpileModule(
  readFileSync(new URL("../../app/(dashboard)/_components/performance-status-sources.tsx", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } },
).outputText
const testSource = source.replace(
  /import\s+([\s\S]*?)\s+from\s+"([^"]+)";/g,
  (statement, bindings: string, specifier: string) => {
    if (specifier.startsWith("@/components/ui/") || specifier === "@remixicon/react") {
      const stub = bindings
        .replace(/[{}\s]/g, "")
        .split(",")
        .map((name) => `export const ${name} = ({ children }) => children ?? null;`)
        .join("\n")
      return statement.replace(specifier, `data:text/javascript,${encodeURIComponent(stub)}`)
    }
    const url = specifier.startsWith("@/")
      ? new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href
      : import.meta.resolve(specifier)
    return statement.replace(specifier, url)
  },
)
const { PerformanceStatusSources } = (await import(`data:text/javascript,${encodeURIComponent(testSource)}`)) as {
  PerformanceStatusSources: typeof PerformanceStatusSourcesComponent
}

function renderUpdate(lastSuccessfulUpdate?: string) {
  const diagnostics: ClusterDiagnostics = {
    peerHealth: { state: "not_reported" },
    storageReadiness: { state: "not_reported" },
    usageFreshness: { state: "stale", lastSuccessfulUpdate },
    listingHealth: { state: "not_reported" },
    workloadAdmission: { state: "not_reported" },
    peers: [],
    membership: [],
    topologyDrives: [],
    pools: [],
  }
  return renderToStaticMarkup(
    createElement(PerformanceStatusSources, {
      diagnostics,
      t: (key) => (key === "Unknown" ? "未知" : key),
    }),
  )
}

test("diagnostic updates use the console's local 24-hour date format", () => {
  const localAfternoon = new Date(2026, 8, 24, 14, 24, 24)

  assert.match(renderUpdate(localAfternoon.toISOString()), /Last successful update: 2026-09-24 14:24:24/)
})

test("missing and invalid diagnostic update times use the translated unknown label", () => {
  for (const value of [undefined, "", " ", "invalid"]) {
    assert.match(renderUpdate(value), /Last successful update: 未知/)
  }
})
