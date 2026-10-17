import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import * as React from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import ts from "typescript"

const source = ts.transpileModule(readFileSync("components/section-navigation.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
}).outputText
const mocks: Record<string, string> = {
  "react-i18next": "export const useTranslation = () => ({ t: (key) => key });",
  "@/lib/utils": "export const cn = (...values) => values.filter(Boolean).join(' ');",
}
const rewritten = source.replace(
  /from "([^"]+)"/g,
  (_, name: string) =>
    `from "${mocks[name] ? `data:text/javascript,${encodeURIComponent(mocks[name])}` : import.meta.resolve(name)}"`,
)
const { SectionNavigation } = await import(`data:text/javascript,${encodeURIComponent(rewritten)}`)

test("section navigation follows the reading position and cleans up pending scroll work", async (t) => {
  const browser = new Window({ url: "https://console.example.test/sse/" })
  const frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 0
  const globals = {
    window: browser,
    document: browser.document,
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback)
      return nextFrame
    },
    cancelAnimationFrame: (id: number) => {
      frames.delete(id)
    },
  }
  const previous = Object.keys(globals).map(
    (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
  )
  for (const [name, value] of Object.entries(globals))
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true })
  const positions = [200, 450]
  for (const [index, id] of ["overview", "configuration"].entries()) {
    const section = browser.document.createElement("section")
    section.id = id
    section.getBoundingClientRect = () => new browser.DOMRect(0, positions[index], 10, 10)
    browser.document.body.appendChild(section)
  }
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  let unmounted = false
  t.after(async () => {
    if (!unmounted) await React.act(async () => root.unmount())
    await browser.happyDOM.close()
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else Reflect.deleteProperty(globalThis, name)
    }
  })
  await React.act(async () =>
    root.render(
      React.createElement(SectionNavigation, {
        items: [
          { href: "#overview", label: "Overview" },
          { href: "#configuration", label: "Configuration" },
        ],
      }),
    ),
  )
  const current = () => container.querySelector('[aria-current="location"]')?.getAttribute("href")
  assert.equal(current(), "#overview", "a second visible section does not steal the initial selection")
  const guardState = { __kmsDirtyGuard: true }
  browser.history.replaceState(guardState, "")
  const historyLength = browser.history.length
  let scrolledTo = ""
  const configuration = browser.document.getElementById("configuration")!
  configuration.scrollIntoView = () => {
    scrolledTo = configuration.id
  }
  const link = container.querySelectorAll("a")[1]!
  await React.act(async () => link.click())
  assert.equal(scrolledTo, "configuration")
  assert.equal(browser.document.activeElement, configuration, "keyboard activation moves focus into the section")
  assert.equal(browser.location.hash, "#configuration")
  assert.deepEqual(browser.history.state, guardState, "section links preserve the unsaved-change guard")
  assert.equal(browser.history.length, historyLength, "section links do not add history navigation")
  const modifiedClick = new browser.MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true })
  link.dispatchEvent(modifiedClick)
  assert.equal(modifiedClick.defaultPrevented, false, "modified clicks keep native link behavior")
  positions[0] = -200
  positions[1] = 120
  browser.dispatchEvent(new browser.Event("scroll"))
  browser.dispatchEvent(new browser.Event("scroll"))
  assert.equal(frames.size, 1, "scroll events share one animation frame")
  await React.act(async () => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((callback) => callback(0))
  })
  assert.equal(current(), "#configuration")
  positions[1] = 320
  Object.defineProperty(browser, "scrollY", { value: 600, configurable: true })
  Object.defineProperty(browser, "innerHeight", { value: 1000, configurable: true })
  Object.defineProperty(browser.document.documentElement, "scrollHeight", { value: 1600, configurable: true })
  browser.dispatchEvent(new browser.Event("scroll"))
  await React.act(async () => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((callback) => callback(0))
  })
  assert.equal(current(), "#configuration", "the last short section stays selected at the end of the page")
  browser.dispatchEvent(new browser.Event("scroll"))
  await React.act(async () => root.unmount())
  unmounted = true
  browser.dispatchEvent(new browser.Event("scroll"))
  assert.equal(frames.size, 0, "unmount removes the listener and its queued frame")
})
