import { defineStore } from 'pinia'
import TaskManager, {
  type ManagedTask,
  type TaskEventHandler,
  type TaskEventType,
  type TaskHandler,
} from '~/lib/task-manager'
import { createDeleteTaskHelpers } from '~/lib/delete-task'
import { createUploadTaskHelpers } from '~/lib/upload-task'
import type { AllCompletedEventHandler } from '~/lib/task-manager'

export type AnyTask = ManagedTask<string> & {
  actionLabel: string
  displayName: string
  subInfo: string
  kind: string
  bucketName?: string
  prefix?: string
  file?: File
}

export const useTaskManagerStore = defineStore('taskManager', {
  state: () => {
    const { $s3Client } = useNuxtApp()

    const uploadHelpers = createUploadTaskHelpers($s3Client, {
      chunkSize: 16,
      maxRetries: 3,
      retryDelay: 1000,
    })
    const deleteHelpers = createDeleteTaskHelpers($s3Client, {
      maxRetries: 3,
      retryDelay: 1000,
    })

    const taskManager = new TaskManager<AnyTask, string>({
      handlers: {
        upload: uploadHelpers.handler as TaskHandler<AnyTask, string>,
        delete: deleteHelpers.handler as TaskHandler<AnyTask, string>,
      },
      maxConcurrent: 6, // shared并发，上传/删除统一排队
      maxRetries: 3,
      retryDelay: 1000,
    })

    return {
      taskManager,
      uploadHelpers,
      deleteHelpers,
    }
  },
  getters: {
    tasks: state => state.taskManager.getTasks(),
    uploadTasks: state => state.taskManager.getTasks().filter(task => task.kind === 'upload') as AnyTask[],
    deleteTasks: state => state.taskManager.getTasks().filter(task => task.kind === 'delete') as AnyTask[],
    pendingTasks: state => state.taskManager.getTasks().filter(task => task.status === 'pending'),
  },
  actions: {
    // 上传
    addUploadFiles(files: File[], bucketName: string, prefix?: string) {
      const activeKeys = new Set(
        this.uploadTasks
          .filter(task => ['pending', 'running', 'failed', 'paused'].includes(task.status))
          .map(task => `${task.bucketName ?? ''}/${task.prefix ?? ''}${task.file?.name ?? task.displayName}`)
      )

      const newTasks = this.uploadHelpers
        .createTasks(files, bucketName, prefix)
        .filter(task => !activeKeys.has(`${task.bucketName}/${task.prefix || ''}${task.file.name}`))

      this.taskManager.enqueue(newTasks)
    },
    pauseUploadTask(taskId: string) {
      // pause disabled
    },
    async resumeUploadTask(taskId: string) {
      // resume disabled
    },

    // 删除
    addDeleteKeys(keys: string[], bucketName: string, prefix?: string) {
      const newTasks = this.deleteHelpers.createTasks(keys, bucketName, prefix)
      this.taskManager.enqueue(newTasks)
    },

    addDeleteVersionedItems(items: { key: string; versionId?: string }[], bucketName: string, prefix?: string) {
      const newTasks = this.deleteHelpers.createVersionedTasks(items, bucketName, prefix)
      this.taskManager.enqueue(newTasks)
    },

    // 通用控制
    cancelTask(taskId: string) {
      this.taskManager.cancelTask(taskId)
    },
    cancelAllTasks() {
      this.taskManager.cancel()
    },
    removeTask(taskId: string) {
      this.taskManager.removeTask(taskId)
    },
    clearTasks() {
      this.taskManager.clearTasks()
    },

    // 统计
    getStats() {
      const tasks = this.tasks as AnyTask[]
      return {
        total: tasks.length,
        pending: tasks.filter(task => task.status === 'pending').length,
        running: tasks.filter(task => task.status === 'running').length,
        completed: tasks.filter(task => task.status === 'completed').length,
        failed: tasks.filter(task => task.status === 'failed').length,
        canceled: tasks.filter(task => task.status === 'canceled').length,
        paused: tasks.filter(task => task.status === 'paused').length,
        uploads: tasks.filter(task => task.kind === 'upload').length,
        deletes: tasks.filter(task => task.kind === 'delete').length,
      }
    },

    // 事件
    on(event: TaskEventType, handler: TaskEventHandler<AnyTask> | AllCompletedEventHandler): void {
      this.taskManager.on(event, handler as any)
    },
    off(event: TaskEventType, handler: TaskEventHandler<AnyTask> | AllCompletedEventHandler): void {
      this.taskManager.off(event, handler as any)
    },
  },
})
