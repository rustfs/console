import { reactive } from 'vue'

export type TaskEventType = 'enqueued' | 'running' | 'completed' | 'failed' | 'canceled' | 'drained'

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
  shouldRetry?: (task: TTask, error: any) => boolean
  handleError?: (task: TTask, error: any) => Promise<'retry' | 'handled' | 'fail'> | 'retry' | 'handled' | 'fail'
  isCanceledError?: (error: any) => boolean
  maxRetries?: number
  retryDelay?: number
}

export interface TaskManagerOptions<TTask extends ManagedTask<TStatus>, TStatus extends string> {
  handlers: Record<string, TaskHandler<any, any>>
  maxConcurrent?: number
  maxRetries?: number
  retryDelay?: number
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

class TaskManager<TTask extends ManagedTask<TStatus>, TStatus extends string> {
  private tasksState = reactive<{ items: any[] }>({ items: [] })

  private readonly handlers: Record<string, TaskHandler<any, any>>
  readonly maxConcurrent: number
  readonly maxRetries: number
  readonly retryDelay: number

  private activeCount = 0
  private isStarted = false
  private eventHandlers: Map<TaskEventType, Set<TaskEventHandler<TTask> | AllCompletedEventHandler>> = new Map()
  private allCompletedEmitted = false

  constructor(options: TaskManagerOptions<TTask, TStatus>) {
    this.handlers = options.handlers
    this.maxConcurrent = options.maxConcurrent ?? 6
    this.maxRetries = options.maxRetries ?? 3
    this.retryDelay = options.retryDelay ?? 1000
  }

  on(event: TaskEventType, handler: TaskEventHandler<TTask> | AllCompletedEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  off(event: TaskEventType, handler: TaskEventHandler<TTask> | AllCompletedEventHandler): void {
    const handlers = this.eventHandlers.get(event)
    handlers?.delete(handler)
  }

  private emit(event: 'drained'): void
  private emit(event: Exclude<TaskEventType, 'drained'>, task: TTask): void
  private emit(event: TaskEventType, task?: TTask): void {
    const handlers = this.eventHandlers.get(event)
    if (!handlers) return
    handlers.forEach(handler => {
      if (event === 'drained') {
        ;(handler as AllCompletedEventHandler)()
      } else if (task) {
        ;(handler as TaskEventHandler<TTask>)(task)
      }
    })
  }

  enqueue(tasks: TTask[]) {
    if (!tasks.length) return
    this.allCompletedEmitted = false
    this.tasksState.items.push(...tasks)
    tasks.forEach(task => this.emit('enqueued', task as TTask))
    this.start()
  }

  start() {
    if (!this.isStarted) this.isStarted = true
    this.processQueue()
  }

  stop() {
    this.isStarted = false
  }

  cancel() {
    ;(this.tasksState.items as TTask[]).forEach(task => {
      const lifecycle = this.getLifecycle(task as TTask)
      if (this.isActive(task as TTask)) {
        ;(task as any)._pauseRequested = false
        task.abortController?.abort()
        task.status = lifecycle.canceled
        this.emit('canceled', task as TTask)
      }
    })
    this.checkAllCompleted()
  }

  cancelTask(taskId: string) {
    const task = (this.tasksState.items as TTask[]).find(t => t.id === taskId)
    if (!task) return
    const lifecycle = this.getLifecycle(task)
    ;(task as any)._pauseRequested = false
    task.abortController?.abort()
    task.status = lifecycle.canceled
    this.emit('canceled', task as TTask)
    this.checkAllCompleted()
  }

  removeTask(taskId: string) {
    const index = (this.tasksState.items as TTask[]).findIndex(t => t.id === taskId)
    if (index === -1) return
    const task = (this.tasksState.items as TTask[])[index]
    if (!task) return
    if (this.isActive(task)) {
      task.abortController?.abort()
    }
    this.tasksState.items.splice(index, 1)
  }

  clearTasks() {
    this.cancel()
    this.tasksState.items.splice(0, this.tasksState.items.length)
    this.activeCount = 0
    this.isStarted = false
  }

  getTasks() {
    return this.tasksState.items as TTask[]
  }

  private isActive(task: TTask) {
    const lifecycle = this.getLifecycle(task)
    const activeStatuses = [lifecycle.pending, lifecycle.running]
    if (lifecycle.paused) activeStatuses.push(lifecycle.paused)
    return activeStatuses.includes(task.status)
  }

  private checkAllCompleted() {
    const hasActive = (this.tasksState.items as TTask[]).some(task => this.isActive(task))
    if (!hasActive && this.tasksState.items.length > 0 && !this.allCompletedEmitted) {
      this.allCompletedEmitted = true
      this.emit('drained')
    }
  }

  private processQueue() {
    if (!this.isStarted) return

    while (this.activeCount < this.maxConcurrent) {
      const next = (this.tasksState.items as TTask[]).find(task => {
        const lifecycle = this.getLifecycle(task as TTask)
        return task.status === lifecycle.pending
      })
      if (!next) break
      this.activeCount++
      this.runTask(next)
    }

    if ((this.tasksState.items as TTask[]).some(task => task.status === this.getLifecycle(task as TTask).pending)) {
      setTimeout(() => this.processQueue(), 100)
    } else {
      setTimeout(() => this.checkAllCompleted(), 200)
    }
  }

  private async runTask(task: TTask) {
    const lifecycle = this.getLifecycle(task)
    task.status = lifecycle.running
    this.emit('running', task as TTask)
    task.error = undefined

    try {
      await this.getHandler(task).perform(task)
      if (task.status === lifecycle.running) {
        task.status = lifecycle.completed
        task.progress = 100
        this.emit('completed', task as TTask)
      }
      this.checkAllCompleted()
    } catch (error: any) {
      const action = await this.handleError(task, error)
      if (action === 'retry') {
        await this.retryTask(task)
      } else if (action === 'handled') {
        // handled upstream
      } else {
        task.status = lifecycle.failed
        task.error = error?.message || 'Unknown error'
        this.emit('failed', task as TTask)
        this.checkAllCompleted()
      }
    } finally {
      this.activeCount--
      if (this.isStarted) setTimeout(() => this.processQueue(), 50)
    }
  }

  private async handleError(task: TTask, error: any): Promise<'retry' | 'handled' | 'fail'> {
    const handler = this.getHandler(task)

    if (handler.handleError) {
      const result = await handler.handleError(task, error)
      if (result !== 'fail') return result
    }

    if (this.isCanceledError(task, error)) {
      const lifecycle = this.getLifecycle(task)
      task.status = lifecycle.canceled
      this.emit('canceled', task as TTask)
      this.checkAllCompleted()
      return 'handled'
    }

    if (this.shouldRetry(task, error)) {
      return 'retry'
    }

    return 'fail'
  }

  private shouldRetry(task: TTask, error: any) {
    const handler = this.getHandler(task)
    const lifecycle = this.getLifecycle(task)
    const maxRetries = handler.maxRetries ?? this.maxRetries
    if (task.status === lifecycle.canceled) return false
    if ((task.retryCount || 0) >= maxRetries) return false
    if (handler.shouldRetry) return handler.shouldRetry(task, error)
    return true
  }

  private isCanceledError(task: TTask, error: any) {
    const handler = this.getHandler(task)
    if (handler.isCanceledError) return handler.isCanceledError(error)
    return error?.name === 'AbortError' || error?.message?.includes('canceled')
  }

  private async retryTask(task: TTask) {
    const handler = this.getHandler(task)
    const lifecycle = this.getLifecycle(task)
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
    if (!handler) {
      throw new Error(`No task handler registered for kind: ${task.kind}`)
    }
    return handler
  }

  private getLifecycle(task: TTask): TaskLifecycleStatus<TStatus> {
    return this.getHandler(task).lifecycle
  }
}

export default TaskManager
