import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { ManagedTask, TaskHandler, TaskLifecycleStatus } from './task-manager'

export type DeleteStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled'

export interface DeleteTask extends ManagedTask<DeleteStatus> {
  kind: 'delete'
  key: string
  bucketName: string
  prefix?: string
  actionLabel: string
  displayName: string
  subInfo: string
}

export interface DeleteTaskConfig {
  maxRetries?: number
  retryDelay?: number
}

export interface DeleteTaskHelpers {
  handler: TaskHandler<DeleteTask, DeleteStatus>
  createTasks: (keys: string[], bucketName: string, prefix?: string) => DeleteTask[]
}

const lifecycle: TaskLifecycleStatus<DeleteStatus> = {
  pending: 'pending',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  canceled: 'canceled',
}

export const createDeleteTaskHelpers = (s3Client: S3Client, config: DeleteTaskConfig = {}): DeleteTaskHelpers => {
  const maxRetries = config.maxRetries ?? 3
  const retryDelay = config.retryDelay ?? 1000

  const perform: TaskHandler<DeleteTask, DeleteStatus>['perform'] = async task => {
    const { key, bucketName, prefix } = task
    const abortController = new AbortController()
    task.abortController = abortController

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: (prefix || '') + key,
    })

    await s3Client.send(command, { abortSignal: abortController.signal })
    task.progress = 100
  }

  const shouldRetry: TaskHandler<DeleteTask, DeleteStatus>['shouldRetry'] = (task, error) => {
    if (task.status === lifecycle.canceled) return false
    if ((task.retryCount || 0) >= maxRetries) return false
    const errorMessage = (error?.message || '').toLowerCase()
    const nonRetryableErrors = ['access denied', 'forbidden', 'invalid credentials', 'bucket not found', 'no such key']
    return !nonRetryableErrors.some(msg => errorMessage.includes(msg))
  }

  const handler: TaskHandler<DeleteTask, DeleteStatus> = {
    lifecycle,
    perform,
    shouldRetry,
    isCanceledError: error => error?.name === 'AbortError' || error?.message?.includes('canceled'),
    maxRetries,
    retryDelay,
  }

  const createTasks = (keys: string[], bucketName: string, prefix?: string) =>
    keys.map(key => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${key}`,
      kind: 'delete' as const,
      key,
      status: lifecycle.pending,
      progress: 0,
      bucketName,
      prefix: prefix ?? '',
      actionLabel: 'Delete',
      displayName: key,
      subInfo: '',
      error: undefined,
      abortController: undefined,
      retryCount: 0,
    }))

  return { handler, createTasks }
}

export type {
  TaskEventType as DeleteTaskEventType,
  TaskEventHandler as DeleteTaskEventHandler,
  AllCompletedEventHandler as DeleteAllCompletedEventHandler,
} from './task-manager'
