import test from "node:test"
import assert from "node:assert/strict"
import { TaskManager, type ManagedTask, type TaskHandler } from "../../lib/task-manager"

type Status = "pending" | "running" | "completed" | "failed" | "canceled"
type Task = ManagedTask<Status> & { kind: "work" }

const lifecycle = {
  pending: "pending",
  running: "running",
  completed: "completed",
  failed: "failed",
  canceled: "canceled",
} as const

function createTask(id: string): Task {
  return { id, kind: "work", status: "pending", progress: 0 }
}

function createManager(
  handler: TaskHandler<Task>,
  options: { maxConcurrent?: number; maxRetries?: number; retryDelay?: number } = {},
) {
  return new TaskManager<Task>({ handlers: { work: handler }, ...options })
}

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  assert.fail("Timed out waiting for task state")
}

test("completes tasks and reports progress snapshots", async () => {
  const task = createTask("completed")
  let notifications = 0
  const manager = createManager({
    lifecycle,
    perform: async (current) => {
      current.progress = 45
    },
  })
  manager.subscribe(() => {
    notifications += 1
  })

  manager.enqueue([task])
  await waitFor(() => task.status === "completed")

  assert.equal(task.progress, 100)
  assert.ok(notifications >= 3)
  assert.deepEqual(manager.getTasks(), [task])
})

test("keeps canceled tasks canceled after AbortError", async () => {
  const manager = createManager({
    lifecycle,
    perform: (task) =>
      new Promise((_, reject) => {
        task.abortController = new AbortController()
        task.abortController.signal.addEventListener("abort", () => {
          reject(new DOMException("Canceled", "AbortError"))
        })
      }),
  })
  const task = createTask("canceled")

  manager.enqueue([task])
  await waitFor(() => task.status === "running" && !!task.abortController)

  assert.equal(manager.cancelTask(task.id), true)
  await waitFor(() => task.status === "canceled")

  assert.equal(task.error, undefined)
  assert.equal(manager.cancelTask(task.id), false)
})

test("cancelAll cancels both running and queued tasks", async () => {
  const manager = createManager(
    {
      lifecycle,
      perform: (task) =>
        new Promise((_, reject) => {
          task.abortController = new AbortController()
          task.abortController.signal.addEventListener("abort", () => {
            reject(new DOMException("Canceled", "AbortError"))
          })
        }),
    },
    { maxConcurrent: 1 },
  )
  const running = createTask("running")
  const queued = createTask("queued")

  manager.enqueue([running, queued])
  await waitFor(() => running.status === "running" && queued.status === "pending")
  manager.cancelAll()
  await waitFor(() => running.status === "canceled" && queued.status === "canceled")

  assert.deepEqual(
    manager.getTasks().map((task) => task.status),
    ["canceled", "canceled"],
  )
})

test("enforces maxRetries even when the handler always retries", async () => {
  let attempts = 0
  const manager = createManager(
    {
      lifecycle,
      perform: async () => {
        attempts += 1
        throw new Error("temporary")
      },
      shouldRetry: () => true,
    },
    { maxRetries: 1, retryDelay: 0 },
  )
  const task = createTask("retry-limit")

  manager.enqueue([task])
  await waitFor(() => task.status === "failed")

  assert.equal(attempts, 2)
  assert.equal(task.retryCount, 1)
  assert.equal(task.error, "temporary")
})

test("fails safely when an error classifier throws", async () => {
  const manager = createManager({
    lifecycle,
    perform: async () => {
      throw new Error("operation failed")
    },
    shouldRetry: () => {
      throw new Error("classifier failed")
    },
  })
  const task = createTask("classifier")

  manager.enqueue([task])
  await waitFor(() => task.status === "failed")

  assert.equal(task.error, "Failed to classify task error: classifier failed")
})

test("releases the concurrency slot during retry backoff", async () => {
  const executionOrder: string[] = []
  const manager = createManager(
    {
      lifecycle,
      perform: async (task) => {
        executionOrder.push(`${task.id}:${task.retryCount ?? 0}`)
        if (task.id === "first" && !task.retryCount) throw new Error("retry")
      },
    },
    { maxConcurrent: 1, maxRetries: 1, retryDelay: 40 },
  )
  const first = createTask("first")
  const second = createTask("second")

  manager.enqueue([first, second])
  await waitFor(() => first.status === "completed" && second.status === "completed")

  assert.deepEqual(executionOrder, ["first:0", "second:0", "first:1"])
})

test("never exceeds the configured concurrency", async () => {
  let active = 0
  let peak = 0
  const releases: Array<() => void> = []
  const manager = createManager(
    {
      lifecycle,
      perform: () =>
        new Promise<void>((resolve) => {
          active += 1
          peak = Math.max(peak, active)
          releases.push(() => {
            active -= 1
            resolve()
          })
        }),
    },
    { maxConcurrent: 2 },
  )
  const tasks = [createTask("one"), createTask("two"), createTask("three")]

  manager.enqueue(tasks)
  await waitFor(() => releases.length === 2)
  assert.equal(peak, 2)
  releases.shift()?.()
  await waitFor(() => releases.length === 2)
  releases.splice(0).forEach((release) => release())
  await waitFor(() => tasks.every((task) => task.status === "completed"))

  assert.equal(peak, 2)
})

test("clears only finished records and refuses to remove active work", async () => {
  let finishActive: (() => void) | undefined
  const manager = createManager({
    lifecycle,
    perform: (task) => {
      if (task.id === "active") {
        return new Promise<void>((resolve) => {
          finishActive = resolve
        })
      }
      return Promise.resolve()
    },
  })
  const completed = createTask("completed")
  const active = createTask("active")

  manager.enqueue([completed])
  await waitFor(() => completed.status === "completed")
  manager.enqueue([active])
  await waitFor(() => active.status === "running" && !!finishActive)

  assert.equal(manager.removeFinishedTask(active.id), false)
  manager.clearFinishedTasks()
  assert.deepEqual(manager.getTasks(), [active])

  finishActive?.()
  await waitFor(() => active.status === "completed")
  assert.equal(manager.removeFinishedTask(active.id), true)
  assert.deepEqual(manager.getTasks(), [])
})

test("validates an enqueue batch before mutating the queue", () => {
  const manager = createManager({ lifecycle, perform: async () => {} })
  const valid = createTask("valid")
  const invalid = { ...createTask("invalid"), status: "running" as const }

  assert.throws(() => manager.enqueue([valid, invalid]), /must be pending/)
  assert.deepEqual(manager.getTasks(), [])

  assert.throws(
    () => manager.enqueue([{ ...createTask("unknown"), kind: "unknown" } as unknown as Task]),
    /No task handler registered/,
  )
  assert.deepEqual(manager.getTasks(), [])
})

test("rejects duplicate task ids within and across enqueue calls", () => {
  const manager = createManager({ lifecycle, perform: async () => {} })

  assert.throws(() => manager.enqueue([createTask("same"), createTask("same")]), /already exists/)
  assert.deepEqual(manager.getTasks(), [])

  manager.enqueue([createTask("existing")])
  assert.throws(() => manager.enqueue([createTask("existing")]), /already exists/)
})

test("dispose aborts active work, clears state, and prevents reuse", async () => {
  let aborted = false
  const manager = createManager({
    lifecycle,
    perform: (task) =>
      new Promise((_, reject) => {
        task.abortController = new AbortController()
        task.abortController.signal.addEventListener("abort", () => {
          aborted = true
          reject(new DOMException("Canceled", "AbortError"))
        })
      }),
  })
  const task = createTask("active")

  manager.enqueue([task])
  await waitFor(() => task.status === "running" && !!task.abortController)
  manager.dispose()
  await waitFor(() => aborted)

  assert.deepEqual(manager.getTasks(), [])
  assert.throws(() => manager.enqueue([createTask("new")]), /disposed/)
  assert.throws(() => manager.enqueue([]), /disposed/)
})

test("validates scheduler options", () => {
  const handler: TaskHandler<Task> = { lifecycle, perform: async () => {} }

  assert.throws(() => createManager(handler, { maxConcurrent: 0 }), /maxConcurrent/)
  assert.throws(() => createManager(handler, { maxRetries: -1 }), /maxRetries/)
  assert.throws(() => createManager(handler, { retryDelay: 1.5 }), /retryDelay/)
  assert.throws(() => createManager({ ...handler, maxRetries: -1 }), /handler.maxRetries/)
  assert.throws(() => createManager({ ...handler, retryDelay: 1.5 }), /handler.retryDelay/)
})

test("a failing subscriber cannot stall task execution", async () => {
  const manager = createManager({ lifecycle, perform: async () => {} })
  const task = createTask("subscriber")
  manager.subscribe(() => {
    throw new Error("render failed")
  })

  manager.enqueue([task])
  await waitFor(() => task.status === "completed")

  assert.equal(task.progress, 100)
})
