import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { HttpRequest } from '@smithy/protocol-http'
import type { ManagedTask, TaskHandler, TaskLifecycleStatus } from './task-manager'

export type DeleteStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled'

export interface DeleteTask extends ManagedTask<DeleteStatus> {
  kind: 'delete'
  key: string
  bucketName: string
  prefix?: string
  /**
   * Optional object version id.
   * When provided, the delete operation will target the specific version.
   */
  versionId?: string
  /**
   * When true, instructs backend to force delete (e.g., delete all versions)
   * without enumerating individual object versions.
   */
  forceDelete?: boolean
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
  createTasks: (
    keys: string[],
    bucketName: string,
    prefix?: string,
    options?: { forceDelete?: boolean }
  ) => DeleteTask[]
  createVersionedTasks: (
    items: { key: string; versionId?: string }[],
    bucketName: string,
    prefix?: string,
    options?: { forceDelete?: boolean }
  ) => DeleteTask[]
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

  const attachForceDeleteHeader = (command: DeleteObjectCommand) => {
    command.middlewareStack.add(
      next => async args => {
        const request = args.request as HttpRequest
        request.headers['X-Rustfs-Force-Delete'] = 'true'
        return next(args)
      },
      { step: 'build', name: 'forceDeleteMiddleware', tags: ['FORCE_DELETE'] }
    )
  }

  const perform: TaskHandler<DeleteTask, DeleteStatus>['perform'] = async task => {
    const { key, bucketName, prefix, versionId, forceDelete } = task
    const abortController = new AbortController()
    task.abortController = abortController

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: (prefix || '') + key,
      ...(versionId ? { VersionId: versionId } : {}),
    })

    if (forceDelete) attachForceDeleteHeader(command)

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

  const createTasksFromItems = (
    items: { key: string; versionId?: string; forceDelete?: boolean }[],
    bucketName: string,
    prefix?: string
  ): DeleteTask[] =>
    items.map(item => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${item.key}-${item.versionId ?? 'latest'}`,
      kind: 'delete' as const,
      key: item.key,
      versionId: item.versionId,
      forceDelete: item.forceDelete,
      status: lifecycle.pending,
      progress: 0,
      bucketName,
      prefix: prefix ?? '',
      actionLabel: 'Delete',
      displayName: item.key,
      subInfo: item.versionId ? `Version: ${item.versionId}` : '',
      error: undefined,
      abortController: undefined,
      retryCount: 0,
    }))

  const createTasks = (keys: string[], bucketName: string, prefix?: string, options?: { forceDelete?: boolean }) =>
    createTasksFromItems(
      keys.map(key => ({ key, forceDelete: options?.forceDelete })),
      bucketName,
      prefix
    )

  const createVersionedTasks = (
    items: { key: string; versionId?: string }[],
    bucketName: string,
    prefix?: string,
    options?: { forceDelete?: boolean }
  ) =>
    createTasksFromItems(
      items.map(item => ({ ...item, forceDelete: options?.forceDelete })),
      bucketName,
      prefix
    )

  return { handler, createTasks, createVersionedTasks }
}

export type {
  TaskEventType as DeleteTaskEventType,
  TaskEventHandler as DeleteTaskEventHandler,
  AllCompletedEventHandler as DeleteAllCompletedEventHandler,
} from './task-manager'
