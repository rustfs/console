import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { Window, type HTMLButtonElement as HappyButton } from "happy-dom"
import ts from "typescript"
import type { ObjectPathLinks as ObjectPathLinksComponent } from "../../components/object/path-links"

const source = ts.transpileModule(
  readFileSync(new URL("../../components/object/path-links.tsx", import.meta.url), "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  },
).outputText
const reactUrl = import.meta.resolve("react")
const stubs: Record<string, string> = {
  "react-i18next": "export function useTranslation() { return { t: (key) => key } }",
  "@/components/ui/button": `import { createElement } from ${JSON.stringify(reactUrl)};
    export function Button({ variant, size, children, ...props }) { return createElement("button", props, children) }`,
  "@remixicon/react": "export const RiFileCopyLine = () => null; export const RiCheckLine = () => null;",
}
const testSource = source.replace(/from "([^"]+)"/g, (statement, specifier: string) => {
  const stub = stubs[specifier]
  const url = stub
    ? `data:text/javascript,${encodeURIComponent(stub)}`
    : specifier.startsWith("@/")
      ? new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href
      : import.meta.resolve(specifier)
  return `from "${url}"`
})
const { ObjectPathLinks } = (await import(`data:text/javascript,${encodeURIComponent(testSource)}`)) as {
  ObjectPathLinks: typeof ObjectPathLinksComponent
}
const segments = ["parent", "repeat", "中文%2F+space ", "repeat", "middle", "nested", "deep", "child"]
const objectKey = `${segments.join("/")}/`

async function mountPath(t: TestContext, key = objectKey, bucketName?: string) {
  const browser = new Window()
  const copiedPaths: string[] = []
  const visitedPaths: string[] = []
  t.mock.timers.enable({ apis: ["setTimeout"] })
  const globals = {
    window: browser,
    document: browser.document,
    navigator: {
      clipboard: {
        writeText: async (value: string) => {
          copiedPaths.push(value)
        },
      },
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const descriptors = Object.keys(globals).map(
    (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
  )
  for (const [name, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
  }
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  t.after(async () => {
    await act(async () => root.unmount())
    await browser.happyDOM.close()
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else Reflect.deleteProperty(globalThis, name)
    }
  })
  await act(async () =>
    root.render(
      createElement(ObjectPathLinks, {
        objectKey: key,
        bucketName,
        onClick: (path) => visitedPaths.push(path),
      }),
    ),
  )
  const click = async (button: HappyButton | null) => {
    assert.ok(button, "expected a path button")
    await act(async () => button.click())
  }
  return { container, copiedPaths, visitedPaths, click }
}

test("long object paths expose every segment without hiding their middle", async (t) => {
  const ui = await mountPath(t)
  const links = Array.from(ui.container.querySelectorAll("button")).filter((button) => button.title !== "Copy Path")
  assert.deepEqual(
    links.map((button) => button.textContent),
    segments,
  )
})

test("every deep segment navigates to its complete cumulative object prefix", async (t) => {
  const ui = await mountPath(t)
  const links = Array.from(ui.container.querySelectorAll("button")).filter((button) => button.title !== "Copy Path")
  for (const link of links) await ui.click(link)
  assert.deepEqual(
    ui.visitedPaths,
    segments.map((_, index) => segments.slice(0, index + 1).join("/")),
  )
})

test("copying a path preserves the bucket, full key, literal characters, and trailing slash", async (t) => {
  const ui = await mountPath(t, objectKey, "test-bucket")
  await ui.click(ui.container.querySelector('button[title="Copy Path"]'))
  assert.deepEqual(ui.copiedPaths, [`test-bucket/${objectKey}`])
})

test("copying without a bucket preserves the full object key", async (t) => {
  const ui = await mountPath(t)
  await ui.click(ui.container.querySelector('button[title="Copy Path"]'))
  assert.deepEqual(ui.copiedPaths, [objectKey])
})

test("the bucket root has no path-copy action", async (t) => {
  const ui = await mountPath(t, "", "test-bucket")
  assert.equal(ui.container.querySelector('button[title="Copy Path"]'), null)
})
