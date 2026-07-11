import { logger } from "./logger"

export interface TaskLifecycleStatus<TStatus extends string> {
  pending: TStatus
  running: TStatus
  completed: TStatus
  failed: TStatus
  canceled: TStatus
}

export interface ManagedTask<TStatus extends string = string> {
  id: string
  status: TStatus
  progress: number
  error?: string
  abortController?: AbortController
  retryCount?: number
  kind: string
}

export interface TaskHandler<TTask extends ManagedTask> {
  lifecycle: TaskLifecycleStatus<TTask["status"]>
  perform: (task: TTask) => Promise<void>
  shouldRetry?: (task: TTask, error: unknown) => boolean
  isCanceledError?: (error: unknown) => boolean
  maxRetries?: number
  retryDelay?: number
}

export type TaskHandlerMap<TTask extends ManagedTask> = {
  [TKind in TTask["kind"]]: TaskHandler<Extract<TTask, { kind: TKind }>>
}

export interface TaskManagerOptions<TTask extends ManagedTask> {
  handlers: TaskHandlerMap<TTask>
  maxConcurrent?: number
  maxRetries?: number
  retryDelay?: number
}

export interface TaskManagerApi<TTask extends ManagedTask> {
  subscribe(listener: () => void): () => void
  getTasks(): readonly TTask[]
  enqueue(tasks: readonly TTask[]): void
  cancelTask(taskId: string): boolean
  cancelAll(): void
  removeFinishedTask(taskId: string): boolean
  clearFinishedTasks(): void
  dispose(): void
}

type Listener = () => void

function assertIntegerOption(name: string, value: number, minimum: number) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}`)
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error || "Unknown error")
}

export class TaskManager<TTask extends ManagedTask> implements TaskManagerApi<TTask> {
  private tasks: TTask[] = []
  private readonly handlers: TaskHandlerMap<TTask>
  readonly maxConcurrent: number
  readonly maxRetries: number
  readonly retryDelay: number
  private activeCount = 0
  private disposed = false
  private listeners = new Set<Listener>()
  private snapshotCache: readonly TTask[] | null = null
  private retryAvailableAt = new WeakMap<TTask, number>()
  private pumpTimer: ReturnType<typeof setTimeout> | null = null
  private pumpScheduledAt = Number.POSITIVE_INFINITY
  private progressWatchers = new Set<() => void>()

  constructor(options: TaskManagerOptions<TTask>) {
    this.handlers = options.handlers
    this.maxConcurrent = options.maxConcurrent ?? 6
    this.maxRetries = options.maxRetries ?? 3
    this.retryDelay = options.retryDelay ?? 1000

    assertIntegerOption("maxConcurrent", this.maxConcurrent, 1)
    assertIntegerOption("maxRetries", this.maxRetries, 0)
    assertIntegerOption("retryDelay", this.retryDelay, 0)
    for (const handler of Object.values(options.handlers) as TaskHandler<TTask>[]) {
      if (handler.maxRetries !== undefined) assertIntegerOption("handler.maxRetries", handler.maxRetries, 0)
      if (handler.retryDelay !== undefined) assertIntegerOption("handler.retryDelay", handler.retryDelay, 0)
    }
  }

  subscribe(listener: Listener): () => void {
    if (this.disposed) return () => {}
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getTasks(): readonly TTask[] {
    if (this.snapshotCache) return this.snapshotCache
    this.snapshotCache = [...this.tasks]
    return this.snapshotCache
  }

  enqueue(tasks: readonly TTask[]) {
    if (this.disposed) throw new Error("Cannot enqueue tasks after TaskManager is disposed")
    if (!tasks.length) return

    this.validateEnqueue(tasks)
    this.tasks.push(...tasks)
    this.notify()
    this.schedulePump()
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.find((candidate) => candidate.id === taskId)
    if (!task || !this.isActive(task)) return false

    this.cancelActiveTask(task)
    this.notify()
    this.schedulePump()
    return true
  }

  cancelAll() {
    let changed = false
    for (const task of this.tasks) {
      if (!this.isActive(task)) continue
      this.cancelActiveTask(task)
      changed = true
    }
    if (changed) {
      this.notify()
      this.schedulePump()
    }
  }

  removeFinishedTask(taskId: string): boolean {
    const index = this.tasks.findIndex((task) => task.id === taskId)
    if (index === -1 || !this.isFinished(this.tasks[index]!)) return false

    this.tasks.splice(index, 1)
    this.notify()
    return true
  }

  clearFinishedTasks() {
    const remaining = this.tasks.filter((task) => !this.isFinished(task))
    if (remaining.length === this.tasks.length) return
    this.tasks = remaining
    this.notify()
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true

    for (const task of this.tasks) {
      if (this.isActive(task)) this.cancelActiveTask(task)
    }
    this.tasks = []
    this.clearPumpTimer()
    this.progressWatchers.forEach((stopWatching) => stopWatching())
    this.progressWatchers.clear()
    this.notify()
    this.listeners.clear()
  }

  private validateEnqueue(tasks: readonly TTask[]) {
    const knownIds = new Set(this.tasks.map((task) => task.id))
    for (const task of tasks) {
      const handler = this.getHandler(task)
      if (task.status !== handler.lifecycle.pending) {
        throw new Error(`Task ${task.id} must be pending when enqueued`)
      }
      if (knownIds.has(task.id)) {
        throw new Error(`Task id already exists: ${task.id}`)
      }
      knownIds.add(task.id)
    }
  }

  private notify() {
    this.snapshotCache = null
    this.listeners.forEach((listener) => {
      try {
        listener()
      } catch (error) {
        logger.error("TaskManager listener failed", error)
      }
    })
  }

  private schedulePump(delay = 0) {
    if (this.disposed) return
    const scheduledAt = Date.now() + Math.max(0, delay)
    if (this.pumpTimer && this.pumpScheduledAt <= scheduledAt) return

    this.clearPumpTimer()
    this.pumpScheduledAt = scheduledAt
    this.pumpTimer = setTimeout(
      () => {
        this.pumpTimer = null
        this.pumpScheduledAt = Number.POSITIVE_INFINITY
        this.processQueue()
      },
      Math.max(0, scheduledAt - Date.now()),
    )
  }

  private clearPumpTimer() {
    if (this.pumpTimer) clearTimeout(this.pumpTimer)
    this.pumpTimer = null
    this.pumpScheduledAt = Number.POSITIVE_INFINITY
  }

  private processQueue() {
    if (this.disposed) return

    const now = Date.now()
    while (this.activeCount < this.maxConcurrent) {
      const next = this.tasks.find((task) => this.isPending(task) && (this.retryAvailableAt.get(task) ?? 0) <= now)
      if (!next) break

      this.retryAvailableAt.delete(next)
      this.activeCount += 1
      void this.runTask(next)
    }

    const nextRetryAt = this.tasks.reduce((earliest, task) => {
      if (!this.isPending(task)) return earliest
      const availableAt = this.retryAvailableAt.get(task) ?? 0
      return availableAt > now ? Math.min(earliest, availableAt) : earliest
    }, Number.POSITIVE_INFINITY)
    if (Number.isFinite(nextRetryAt)) this.schedulePump(nextRetryAt - now)
  }

  private watchProgress(task: TTask, lifecycle: TaskLifecycleStatus<TTask["status"]>) {
    let lastProgress = task.progress
    const timer = setInterval(() => {
      if (this.disposed || task.status !== lifecycle.running || task.progress === lastProgress) return
      lastProgress = task.progress
      this.notify()
    }, 120)
    return () => clearInterval(timer)
  }

  private async runTask(task: TTask) {
    const handler = this.getHandler(task)
    const lifecycle = handler.lifecycle
    task.status = lifecycle.running
    task.error = undefined
    this.notify()

    const stopWatchingProgress = this.watchProgress(task, lifecycle)
    this.progressWatchers.add(stopWatchingProgress)

    try {
      await handler.perform(task)
      if (task.status === lifecycle.running) {
        task.status = lifecycle.completed
        task.progress = 100
      }
      this.notify()
    } catch (error) {
      this.resolveTaskError(task, handler, error)
    } finally {
      stopWatchingProgress()
      this.progressWatchers.delete(stopWatchingProgress)
      task.abortController = undefined
      this.activeCount = Math.max(0, this.activeCount - 1)
      this.schedulePump()
    }
  }

  private resolveTaskError(task: TTask, handler: TaskHandler<TTask>, error: unknown) {
    const lifecycle = handler.lifecycle
    try {
      if (task.status === lifecycle.canceled || this.isCanceledError(handler, error)) {
        task.status = lifecycle.canceled
        task.error = undefined
        this.retryAvailableAt.delete(task)
      } else if (this.canRetry(task, handler, error)) {
        const retryCount = (task.retryCount ?? 0) + 1
        task.retryCount = retryCount
        task.status = lifecycle.pending
        task.progress = 0
        task.error = undefined
        this.retryAvailableAt.set(task, Date.now() + this.getRetryDelay(handler) * retryCount)
      } else {
        task.status = lifecycle.failed
        task.error = getErrorMessage(error)
      }
    } catch (classificationError) {
      task.status = lifecycle.failed
      task.error = `Failed to classify task error: ${getErrorMessage(classificationError)}`
    }
    this.notify()
  }

  private canRetry(task: TTask, handler: TaskHandler<TTask>, error: unknown): boolean {
    const maxRetries = handler.maxRetries ?? this.maxRetries
    assertIntegerOption("handler.maxRetries", maxRetries, 0)
    if ((task.retryCount ?? 0) >= maxRetries) return false
    return handler.shouldRetry ? handler.shouldRetry(task, error) : true
  }

  private getRetryDelay(handler: TaskHandler<TTask>): number {
    const retryDelay = handler.retryDelay ?? this.retryDelay
    assertIntegerOption("handler.retryDelay", retryDelay, 0)
    return retryDelay
  }

  private isCanceledError(handler: TaskHandler<TTask>, error: unknown): boolean {
    if (handler.isCanceledError) return handler.isCanceledError(error)
    return error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("canceled"))
  }

  private cancelActiveTask(task: TTask) {
    const lifecycle = this.getHandler(task).lifecycle
    task.abortController?.abort()
    task.status = lifecycle.canceled
    task.error = undefined
    this.retryAvailableAt.delete(task)
  }

  private isPending(task: TTask): boolean {
    return task.status === this.getHandler(task).lifecycle.pending
  }

  private isActive(task: TTask): boolean {
    const lifecycle = this.getHandler(task).lifecycle
    return task.status === lifecycle.pending || task.status === lifecycle.running
  }

  private isFinished(task: TTask): boolean {
    const lifecycle = this.getHandler(task).lifecycle
    return task.status === lifecycle.completed || task.status === lifecycle.failed || task.status === lifecycle.canceled
  }

  private getHandler(task: TTask): TaskHandler<TTask> {
    const handler = (this.handlers as unknown as Record<string, TaskHandler<TTask> | undefined>)[task.kind]
    if (!handler) throw new Error(`No task handler registered for kind: ${task.kind}`)
    return handler
  }
}
