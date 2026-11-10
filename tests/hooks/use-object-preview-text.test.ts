import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import { useObjectPreviewText } from "../../hooks/use-object-preview-text"

type Options = Parameters<typeof useObjectPreviewText>[0]

async function mountPreview(t: TestContext, fetcher: typeof fetch, initial: Partial<Options> = {}) {
  const browser = new Window()
  const globals = {
    window: browser,
    document: browser.document,
    fetch: fetcher,
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const descriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }
  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  let props: Options = { show: true, mode: "detect-text", url: "/fred", ...initial }
  let result: ReturnType<typeof useObjectPreviewText>
  function Preview(options: Options) {
    result = useObjectPreviewText(options)
    return null
  }
  t.after(async () => {
    await act(async () => root.unmount())
    await browser.happyDOM.close()
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  const render = async (changes: Partial<Options> = {}) => {
    props = { ...props, ...changes }
    await act(async () => root.render(createElement(Preview, props)))
  }
  await render()
  return { render, result: () => result }
}

test("extensionless text becomes ready for the text renderer", async (t) => {
  const preview = await mountPreview(t, async () => new Response("this is a text file\n"))
  assert.deepEqual(preview.result(), { status: "ready", content: "this is a text file\n" })
})

test("binary content becomes unsupported rather than an iframe or an error", async (t) => {
  const preview = await mountPreview(t, async () => new Response(Uint8Array.of(0, 1, 2)))
  assert.deepEqual(preview.result(), { status: "unsupported", content: "" })
})

test("HTTP and network failures become visible errors", async (t) => {
  const preview = await mountPreview(t, async () => new Response("Access denied", { status: 403 }))
  assert.deepEqual(preview.result(), { status: "error", content: "" })
})

test("a rejected fetch is not classified as unsupported content", async (t) => {
  const preview = await mountPreview(t, async () => {
    throw new TypeError("Failed to fetch")
  })
  assert.deepEqual(preview.result(), { status: "error", content: "" })
})

test("pending content shows loading until the request resolves", async (t) => {
  const response = Promise.withResolvers<Response>()
  const preview = await mountPreview(t, () => response.promise)
  assert.equal(preview.result().status, "loading")
  await act(async () => response.resolve(new Response("fred")))
  assert.equal(preview.result().status, "ready")
})

test("closing the modal aborts the request and clears preview content", async (t) => {
  const response = Promise.withResolvers<Response>()
  let signal: AbortSignal | null | undefined
  const preview = await mountPreview(t, (_url, options) => {
    signal = options?.signal
    return response.promise
  })
  await preview.render({ show: false })
  assert.equal(signal?.aborted, true)
  await act(async () => response.resolve(new Response("stale content")))
  assert.deepEqual(preview.result(), { status: "idle", content: "" })
})

test("late responses from a previous object cannot replace the current preview", async (t) => {
  const previous = Promise.withResolvers<Response>()
  const current = Promise.withResolvers<Response>()
  const preview = await mountPreview(t, (url) => (url === "/fred" ? previous.promise : current.promise))
  await preview.render({ url: "/current" })
  await act(async () => current.resolve(new Response("current content")))
  await act(async () => previous.resolve(new Response("previous content")))
  assert.deepEqual(preview.result(), { status: "ready", content: "current content" })
})

test("a changed preview renderer clears a pending text request", async (t) => {
  const response = Promise.withResolvers<Response>()
  const preview = await mountPreview(t, () => response.promise)
  await preview.render({ mode: "image" })
  await act(async () => response.resolve(new Response("previous content")))
  assert.deepEqual(preview.result(), { status: "idle", content: "" })
})

test("closed and non-text previews never fetch text", async (t) => {
  const fetcher = t.mock.fn<typeof fetch>(async () => new Response("unused"))
  const preview = await mountPreview(t, fetcher, { show: false })
  await preview.render({ show: true, mode: "download" })
  assert.equal(fetcher.mock.callCount(), 0)
})

test("existing explicit text decoding retains its behavior", async (t) => {
  const preview = await mountPreview(t, async () => new Response(Uint8Array.of(0xff)), { mode: "text" })
  assert.deepEqual(preview.result(), { status: "ready", content: "�" })
})
