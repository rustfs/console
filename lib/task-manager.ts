export type TaskEventType = "enqueued" | "running" | "completed" | "failed" | "canceled" | "drained"

export type TaskEventHandler<TTask> = (task: TTask) => void
export type AllCompletedEventHandler = () => void

export interface TaskLifecycleStatus<TStatus extends string> {
  pending: TStatus
  running: TStatus
  completed: TStatus
  failed: TStatus
  canceled: TStatus
  paused?: TStatus
}

export interface ManagedTask<TStatus extends string> {
  id: string
  status: TStatus
  progress: number
  error?: string
  abortController?: AbortController
  retryCount?: number
  kind: string
}

export interface TaskHandler<TTask, TStatus extends string> {
  lifecycle: TaskLifecycleStatus<TStatus>
  perform: (task: TTask) => Promise<void>
  shouldRetry?: (task: TTask, error: unknown) => boolean
  handleError?: (task: TTask, error: unknown) => Promise<"retry" | "handled" | "fail"> | "retry" | "handled" | "fail"
  isCanceledError?: (error: unknown) => boolean
  maxRetries?: number
  retryDelay?: number
}

export interface TaskManagerOptions<TTask extends ManagedTask<TStatus>, TStatus extends string> {
  handlers: Record<string, TaskHandler<TTask, TStatus>>
  maxConcurrent?: number
  maxRetries?: number
  retryDelay?: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Listener = () => void

export class TaskManager<TTask extends ManagedTask<TStatus>, TStatus extends string> {
  private tasks: TTask[] = []
  private readonly handlers: Record<string, TaskHandler<TTask, TStatus>>
  readonly maxConcurrent: number
  readonly maxRetries: number
  readonly retryDelay: number
  private activeCount = 0
  private isStarted = false
  private allCompletedEmitted = false
  private listeners = new Set<Listener>()
  private snapshotCache: TTask[] | null = null

  constructor(options: TaskManagerOptions<TTask, TStatus>) {
    this.handlers = options.handlers
    this.maxConcurrent = options.maxConcurrent ?? 6
    this.maxRetries = options.maxRetries ?? 3
    this.retryDelay = options.retryDelay ?? 1000
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.snapshotCache = null
    this.listeners.forEach((l) => l())
  }

  enqueue(tasks: TTask[]) {
    if (!tasks.length) return
    this.allCompletedEmitted = false
    this.tasks.push(...tasks)
    this.notify()
    this.start()
  }

  start() {
    if (!this.isStarted) this.isStarted = true
    this.processQueue()
  }

  cancel() {
    this.tasks.forEach((task) => {
      const lifecycle = this.getLifecycle(task) as TaskLifecycleStatus<TStatus>
      if (this.isActive(task)) {
        ;(task as TTask & { _pauseRequested?: boolean })._pauseRequested = false
        task.abortController?.abort()
        task.status = lifecycle.canceled
      }
    })
    this.notify()
    this.checkAllCompleted()
  }

  cancelTask(taskId: string) {
    const task = this.tasks.find((t) => t.id === taskId)
    if (!task) return
    const lifecycle = this.getLifecycle(task) as TaskLifecycleStatus<TStatus>
    ;(task as TTask & { _pauseRequested?: boolean })._pauseRequested = false
    task.abortController?.abort()
    task.status = lifecycle.canceled
    this.notify()
    this.checkAllCompleted()
  }

  removeTask(taskId: string) {
    const index = this.tasks.findIndex((t) => t.id === taskId)
    if (index === -1) return
    const task = this.tasks[index]
    if (task && this.isActive(task)) {
      task.abortController?.abort()
    }
    this.tasks.splice(index, 1)
    this.notify()
  }

  clearTasks() {
    this.cancel()
    this.tasks = []
    this.activeCount = 0
    this.isStarted = false
    this.notify()
  }

  getTasks(): TTask[] {
    if (this.snapshotCache) return this.snapshotCache
    this.snapshotCache = [...this.tasks]
    return this.snapshotCache
  }

  private isActive(task: TTask) {
    const lifecycle = this.getLifecycle(task) as TaskLifecycleStatus<TStatus>
    const activeStatuses = [lifecycle.pending, lifecycle.running]
    if (lifecycle.paused) activeStatuses.push(lifecycle.paused)
    return activeStatuses.includes(task.status)
  }

  private checkAllCompleted() {
    const hasActive = this.tasks.some((task) => this.isActive(task))
    if (!hasActive && this.tasks.length > 0 && !this.allCompletedEmitted) {
      this.allCompletedEmitted = true
      this.notify()
    }
  }

  private processQueue() {
    if (!this.isStarted) return

    while (this.activeCount < this.maxConcurrent) {
      const next = this.tasks.find((task) => {
        const handler = this.handlers[task.kind]
        return handler && task.status === (handler.lifecycle as TaskLifecycleStatus<TStatus>).pending
      })
      if (!next) break
      this.activeCount++
      this.runTask(next)
    }

    const hasPending = this.tasks.some((task) => {
      const lifecycle = this.getLifecycle(task) as TaskLifecycleStatus<TStatus>
      return task.status === lifecycle.pending
    })
    if (hasPending) {
      setTimeout(() => this.processQueue(), 100)
    } else {
      setTimeout(() => this.checkAllCompleted(), 200)
    }
  }

  private async runTask(task: TTask) {
    const lifecycle = this.getLifecycle(task) as TaskLifecycleStatus<TStatus>
    task.status = lifecycle.running
    this.notify()

    try {
      const handler = this.getHandler(task)
      await handler.perform(task)
      if (task.status === lifecycle.running) {
        task.status = lifecycle.completed
        task.progress = 100
      }
      this.notify()
      this.checkAllCompleted()
    } catch (error) {
      const action = await this.handleError(task, error)
      if (action === "retry") {
        await this.retryTask(task)
      } else {
        task.status = lifecycle.failed
        task.error = (error as Error)?.message ?? "Unknown error"
      }
      this.notify()
      this.checkAllCompleted()
    } finally {
      this.activeCount--
      if (this.isStarted) setTimeout(() => this.processQueue(), 50)
    }
  }

  private async handleError(task: TTask, error: unknown): Promise<"retry" | "handled" | "fail"> {
    const handler = this.getHandler(task)
    if (handler.handleError) {
      const result = await handler.handleError(task, error)
      if (result !== "fail") return result
    }
    if (this.isCanceledError(task, error)) {
      const lifecycle = this.getLifecycle(task) as TaskLifecycleStatus<TStatus>
      task.status = lifecycle.canceled
      this.notify()
      this.checkAllCompleted()
      return "handled"
    }
    if (this.shouldRetry(task, error)) return "retry"
    return "fail"
  }

  private shouldRetry(task: TTask, error: unknown) {
    const handler = this.getHandler(task)
    const lifecycle = this.getLifecycle(task) as TaskLifecycleStatus<TStatus>
    const maxRetries = handler.maxRetries ?? this.maxRetries
    if (task.status === lifecycle.canceled) return false
    if ((task.retryCount || 0) >= maxRetries) return false
    if (handler.shouldRetry) return handler.shouldRetry(task, error)
    return true
  }

  private isCanceledError(task: TTask, error: unknown) {
    const handler = this.getHandler(task)
    if (handler.isCanceledError) return handler.isCanceledError(error)
    return (error as Error)?.name === "AbortError" || (error as Error)?.message?.includes("canceled")
  }

  private async retryTask(task: TTask) {
    const handler = this.getHandler(task)
    const lifecycle = this.getLifecycle(task) as TaskLifecycleStatus<TStatus>
    const retryDelay = handler.retryDelay ?? this.retryDelay
    task.retryCount = (task.retryCount || 0) + 1
    task.status = lifecycle.pending
    task.progress = 0
    task.error = undefined
    const retryCount = task.retryCount || 1
    await sleep(retryDelay * retryCount)
  }

  private getHandler(task: TTask): TaskHandler<TTask, TStatus> {
    const handler = this.handlers[task.kind] as TaskHandler<TTask, TStatus> | undefined
    if (!handler) throw new Error(`No task handler registered for kind: ${task.kind}`)
    return handler
  }

  private getLifecycle(task: TTask) {
    return this.getHandler(task).lifecycle
  }
}
