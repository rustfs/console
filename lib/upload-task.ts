import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import type { ManagedTask, TaskHandler, TaskLifecycleStatus } from './task-manager'
import { formatBytes } from '~/utils/functions'

export type UploadStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled' | 'paused'

export interface UploadTask extends ManagedTask<UploadStatus> {
  kind: 'upload'
  file: File
  bucketName: string
  prefix?: string
  actionLabel: string
  displayName: string
  subInfo: string
  uploadId?: string
  completedParts?: { ETag: string; PartNumber: number }[]
  _pauseRequested?: boolean
}

export interface UploadTaskConfig {
  chunkSize?: number // MB
  maxRetries?: number
  retryDelay?: number
}

export interface UploadTaskHelpers {
  handler: TaskHandler<UploadTask, UploadStatus>
  createTasks: (files: File[], bucketName: string, prefix?: string) => UploadTask[]
}

const lifecycle: TaskLifecycleStatus<UploadStatus> = {
  pending: 'pending',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  canceled: 'canceled',
  paused: 'paused',
}

export const createUploadTaskHelpers = (s3Client: S3Client, config: UploadTaskConfig = {}): UploadTaskHelpers => {
  const chunkSize = (config.chunkSize ?? 5) * 1024 * 1024
  const maxRetries = config.maxRetries ?? 3
  const retryDelay = config.retryDelay ?? 1000

  const perform: TaskHandler<UploadTask, UploadStatus>['perform'] = async task => {
    task.progress = 0
    if (task.file.size > chunkSize) {
      await multipartUpload(task, s3Client, chunkSize)
    } else {
      await putObject(task, s3Client)
    }
  }

  const shouldRetry: TaskHandler<UploadTask, UploadStatus>['shouldRetry'] = (task, error) => {
    if (task.status === lifecycle.canceled) return false
    if ((task.retryCount || 0) >= maxRetries) return false
    if (error?.$metadata?.httpStatusCode >= 400 && error?.$metadata?.httpStatusCode < 500) return false
    const errorMessage = (error?.message || '').toLowerCase()
    const nonRetryableErrors = [
      'access denied',
      'forbidden',
      'invalid credentials',
      'bucket not found',
      'file not found',
    ]
    return !nonRetryableErrors.some(msg => errorMessage.includes(msg))
  }

  const handleError: TaskHandler<UploadTask, UploadStatus>['handleError'] = async (task, error) => {
    if (task._pauseRequested && (error?.message === 'Upload paused' || error?.message === 'Request aborted')) {
      task.status = (lifecycle.paused ?? 'paused') as UploadStatus
      return 'handled'
    }
    return 'fail'
  }

  const handler: TaskHandler<UploadTask, UploadStatus> = {
    lifecycle,
    perform,
    shouldRetry,
    handleError,
    isCanceledError: error => error?.name === 'AbortError' || error?.message?.includes('canceled'),
    maxRetries,
    retryDelay,
  }

  const createTasks = (files: File[], bucketName: string, prefix?: string) => {
    const existKeys = new Set<string>()
    return files
      .filter(file => !existKeys.has(`${bucketName}/${prefix || ''}${file.name}`))
      .map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`,
        kind: 'upload' as const,
        file,
        status: lifecycle.pending,
        progress: 0,
        bucketName,
        prefix: prefix ?? '',
        actionLabel: 'Upload',
        displayName: file.name,
        subInfo: formatBytes(file.size),
        retryCount: 0,
        _pauseRequested: false,
      }))
  }

  return { handler, createTasks }
}

const putObject = async (task: UploadTask, s3Client: S3Client) => {
  const { file, bucketName, prefix } = task
  const abortController = new AbortController()
  task.abortController = abortController

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: (prefix || '') + file.name,
    Body: file,
    ContentType: file.type || 'application/octet-stream',
  })

  await s3Client.send(command, { abortSignal: abortController.signal })
  task.progress = 100
}

const multipartUpload = async (task: UploadTask, s3Client: S3Client, chunkSize: number) => {
  const { file, bucketName, prefix } = task
  const abortController = new AbortController()
  task.abortController = abortController

  const Key = (prefix || '') + file.name
  let uploadId: string | undefined = task.uploadId
  let completedParts: { ETag: string; PartNumber: number }[] = task.completedParts || []

  try {
    if (!uploadId) {
      const createCommand = new CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: Key,
        ContentType: file.type || 'application/octet-stream',
      })
      const createResponse = await s3Client.send(createCommand, {
        abortSignal: abortController.signal,
      })
      uploadId = createResponse.UploadId
      task.uploadId = uploadId
      task.completedParts = []
    }

    if (!uploadId) {
      throw new Error('Failed to create multipart upload')
    }

    const totalChunks = Math.ceil(file.size / chunkSize)
    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      if (abortController.signal.aborted) {
        throw new Error('Upload paused')
      }

      if (completedParts.some(part => part.PartNumber === partNumber)) {
        continue
      }

      const start = (partNumber - 1) * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)

      const uploadPartCommand = new UploadPartCommand({
        Bucket: bucketName,
        Key: Key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: chunk,
      })

      const { ETag } = await s3Client.send(uploadPartCommand, {
        abortSignal: abortController.signal,
      })

      if (!ETag) {
        throw new Error(`Failed to upload part ${partNumber}`)
      }

      completedParts.push({ ETag, PartNumber: partNumber })
      task.completedParts = completedParts
      task.progress = Math.round((completedParts.length / totalChunks) * 100)
    }

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucketName,
      Key: Key,
      UploadId: uploadId,
      MultipartUpload: { Parts: completedParts },
    })

    await s3Client.send(completeCommand, {
      abortSignal: abortController.signal,
    })

    task.uploadId = undefined
    task.completedParts = undefined
  } catch (error) {
    if (!task._pauseRequested) {
      try {
        const { AbortMultipartUploadCommand } = await import('@aws-sdk/client-s3')
        const abortCommand = new AbortMultipartUploadCommand({
          Bucket: bucketName,
          Key: Key,
          UploadId: uploadId,
        })
        await s3Client.send(abortCommand)
      } catch (cleanupError) {
        console.warn('Failed to cleanup multipart upload:', cleanupError)
      }
    }
    throw error
  }
}

export type { TaskEventType, TaskEventHandler, AllCompletedEventHandler } from './task-manager'
