import test, { type TestContext } from "node:test"
import assert from "node:assert/strict"
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { Window } from "happy-dom"
import { useObjectListPagination } from "../../hooks/use-object-list-pagination"

type PaginationProps = Omit<Parameters<typeof useObjectListPagination>[0], "loadMoreRef">

function Pagination(props: Parameters<typeof useObjectListPagination>[0]) {
  useObjectListPagination(props)
  return null
}

async function mountPagination(t: TestContext, props: PaginationProps) {
  const browser = new Window()
  const observers: MockIntersectionObserver[] = []

  class MockIntersectionObserver {
    targets = new Set<Element>()
    callback: IntersectionObserverCallback

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
      observers.push(this)
    }

    observe(target: Element) {
      this.targets.add(target)
    }

    disconnect() {
      this.targets.clear()
    }

    intersect() {
      if (!this.targets.size) return
      const entries = Array.from(this.targets, (target) => ({ isIntersecting: true, target }))
      this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
    }
  }

  const globals = {
    window: browser,
    document: browser.document,
    IntersectionObserver: MockIntersectionObserver,
    IS_REACT_ACT_ENVIRONMENT: true,
  }
  const previousDescriptors = Object.keys(globals).map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  )
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  }

  const container = browser.document.createElement("div")
  browser.document.body.appendChild(container)
  const root = createRoot(container as unknown as Element)
  const loadMoreRef = { current: container as unknown as HTMLDivElement }
  t.after(async () => {
    await act(async () => root.unmount())
    await browser.happyDOM.close()
    for (const [key, descriptor] of previousDescriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })

  const render = async (changes: Partial<PaginationProps> = {}) => {
    props = { ...props, ...changes }
    await act(async () => root.render(createElement(Pagination, { ...props, loadMoreRef })))
  }
  const intersect = async () => {
    await act(async () => observers.forEach((observer) => observer.intersect()))
  }
  await render()
  return { render, intersect, observers }
}

test("empty append pages resume observation only after loading clears", async (t) => {
  const response = Promise.withResolvers<{ Contents: never[]; NextContinuationToken: string }>()
  let token = "page-2"
  const append = t.mock.fn<(token: string) => typeof response.promise>(() => response.promise)
  const loadNextBatch = () => void append(token)
  const { render, intersect, observers } = await mountPagination(t, {
    nextToken: token,
    loading: true,
    loadMoreError: false,
    loadNextBatch,
  })

  assert.equal(observers.length, 0)
  await render({ loading: false })
  await intersect()
  assert.equal(append.mock.callCount(), 1)

  await render({ loading: true })
  await intersect()
  assert.equal(append.mock.callCount(), 1)
  assert.equal(observers[0].targets.size, 0)

  response.resolve({ Contents: [], NextContinuationToken: "page-3" })
  token = (await response.promise).NextContinuationToken
  // The response token is committed before fetchObjects clears loading.
  await render({ nextToken: token })
  await intersect()
  assert.equal(append.mock.callCount(), 1)

  await render({ loading: false })
  await intersect()
  assert.deepEqual(
    append.mock.calls.map((call) => call.arguments[0]),
    ["page-2", "page-3"],
  )
})

test("an append failure pauses automatic requests until a manual retry", async (t) => {
  const response = Promise.withResolvers<void>()
  const append = t.mock.fn(() => response.promise)
  let request: Promise<boolean> | undefined
  const loadNextBatch = () => {
    request = append().then(
      () => true,
      () => false,
    )
  }
  const { render, intersect } = await mountPagination(t, {
    nextToken: "page-2",
    loading: false,
    loadMoreError: false,
    loadNextBatch,
  })

  await intersect()
  await render({ loading: true })
  response.reject(new Error("Append request failed"))
  assert.equal(await request, false)
  await render({ loadMoreError: true })
  await render({ loading: false })
  await intersect()
  await render()
  await intersect()
  assert.equal(append.mock.callCount(), 1)

  append.mock.mockImplementation(() => Promise.resolve())
  loadNextBatch()
  await render({ loading: true, loadMoreError: false })
  await intersect()
  assert.equal(await request, true)
  await render({ loading: false, nextToken: undefined })
  await intersect()
  assert.equal(append.mock.callCount(), 2)
})
