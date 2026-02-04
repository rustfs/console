import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3"
import type { ManagedTask, TaskHandler, TaskLifecycleStatus } from "./task-manager"
import { formatBytes } from "./functions"

export type UploadStatus = "pending" | "running" | "completed" | "failed" | "canceled" | "paused"

export interface UploadTask extends ManagedTask<UploadStatus> {
  kind: "upload"
  file: File
  bucketName: string
  prefix?: string
  key: string
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
  createTasks: (items: { file: File; key: string }[], bucketName: string) => UploadTask[]
}

const lifecycle: TaskLifecycleStatus<UploadStatus> = {
  pending: "pending",
  running: "running",
  completed: "completed",
  failed: "failed",
  canceled: "canceled",
  paused: "paused",
}

export function createUploadTaskHelpers(s3Client: S3Client, config: UploadTaskConfig = {}): UploadTaskHelpers {
  const chunkSize = (config.chunkSize ?? 5) * 1024 * 1024
  const maxRetries = config.maxRetries ?? 3
  const retryDelay = config.retryDelay ?? 1000

  const perform: TaskHandler<UploadTask, UploadStatus>["perform"] = async (task) => {
    task.progress = 0
    if (task.file.size > chunkSize) {
      await multipartUpload(task, s3Client, chunkSize)
    } else {
      await putObject(task, s3Client)
    }
  }

  const shouldRetry: TaskHandler<UploadTask, UploadStatus>["shouldRetry"] = (task, error) => {
    if (task.status === lifecycle.canceled) return false
    if ((task.retryCount || 0) >= maxRetries) return false
    const err = error as { $metadata?: { httpStatusCode?: number }; message?: string }
    if (err?.$metadata?.httpStatusCode && err.$metadata.httpStatusCode >= 400 && err.$metadata.httpStatusCode < 500)
      return false
    const errorMessage = (err?.message || "").toLowerCase()
    const nonRetryableErrors = [
      "access denied",
      "forbidden",
      "invalid credentials",
      "bucket not found",
      "file not found",
    ]
    return !nonRetryableErrors.some((msg) => errorMessage.includes(msg))
  }

  const handleError: TaskHandler<UploadTask, UploadStatus>["handleError"] = async (task, error) => {
    if (
      task._pauseRequested &&
      ((error as Error)?.message === "Upload paused" || (error as Error)?.message === "Request aborted")
    ) {
      task.status = "paused"
      return "handled"
    }
    return "fail"
  }

  const handler: TaskHandler<UploadTask, UploadStatus> = {
    lifecycle,
    perform,
    shouldRetry,
    handleError,
    isCanceledError: (error) =>
      (error as Error)?.name === "AbortError" || (error as Error)?.message?.includes("canceled"),
    maxRetries,
    retryDelay,
  }

  const createTasks = (items: { file: File; key: string }[], bucketName: string): UploadTask[] => {
    const existKeys = new Set<string>()
    return items
      .filter((item) => !existKeys.has(`${bucketName}/${item.key}`))
      .map((item) => {
        existKeys.add(`${bucketName}/${item.key}`)
        const displayName = item.key.split("/").pop() ?? item.key
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${item.key}`,
          kind: "upload" as const,
          file: item.file,
          key: item.key,
          bucketName,
          status: lifecycle.pending,
          progress: 0,
          actionLabel: "Upload",
          displayName,
          subInfo: formatBytes(item.file.size),
          retryCount: 0,
          _pauseRequested: false,
        }
      })
  }

  return { handler, createTasks }
}

async function putObject(task: UploadTask, s3Client: S3Client) {
  const { file, bucketName, key } = task
  const abortController = new AbortController()
  task.abortController = abortController

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: file.type || "application/octet-stream",
    }),
    { abortSignal: abortController.signal },
  )
  task.progress = 100
}

async function multipartUpload(task: UploadTask, s3Client: S3Client, chunkSize: number) {
  const { file, bucketName, key } = task
  const abortController = new AbortController()
  task.abortController = abortController

  let uploadId: string | undefined = task.uploadId
  const completedParts: { ETag: string; PartNumber: number }[] = task.completedParts || []

  try {
    if (!uploadId) {
      const createResponse = await s3Client.send(
        new CreateMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: file.type || "application/octet-stream",
        }),
        { abortSignal: abortController.signal },
      )
      uploadId = createResponse.UploadId
      task.uploadId = uploadId
      task.completedParts = []
    }

    if (!uploadId) throw new Error("Failed to create multipart upload")

    const totalChunks = Math.ceil(file.size / chunkSize)
    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      if (abortController.signal.aborted) throw new Error("Upload paused")
      if (completedParts.some((p) => p.PartNumber === partNumber)) continue

      const start = (partNumber - 1) * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)

      const { ETag } = await s3Client.send(
        new UploadPartCommand({
          Bucket: bucketName,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: chunk,
        }),
        { abortSignal: abortController.signal },
      )
      if (!ETag) throw new Error(`Failed to upload part ${partNumber}`)
      completedParts.push({ ETag, PartNumber: partNumber })
      task.completedParts = completedParts
      task.progress = Math.round((completedParts.length / totalChunks) * 100)
    }

    await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: completedParts },
      }),
      { abortSignal: abortController.signal },
    )
    task.uploadId = undefined
    task.completedParts = undefined
  } catch (error) {
    if (!task._pauseRequested && uploadId) {
      try {
        const { AbortMultipartUploadCommand } = await import("@aws-sdk/client-s3")
        await s3Client.send(new AbortMultipartUploadCommand({ Bucket: bucketName, Key: key, UploadId: uploadId }))
      } catch {
        // ignore cleanup errors
      }
    }
    throw error
  }
}
