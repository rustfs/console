import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import type { ManagedTask, TaskHandler, TaskLifecycleStatus } from "./task-manager"
import { createTaskId } from "./task-id"

export type DeleteStatus = "pending" | "running" | "completed" | "failed" | "canceled"

export interface DeleteTask extends ManagedTask<DeleteStatus> {
  kind: "delete"
  key: string
  bucketName: string
  prefix?: string
  versionId?: string
  forceDelete?: boolean
  actionLabel: string
  displayName: string
  subInfo: string
}

export interface FolderDeleteTask extends ManagedTask<DeleteStatus> {
  kind: "delete-folder"
  bucketName: string
  prefix: string
  forceDelete?: boolean
  actionLabel: string
  displayName: string
  subInfo: string
}

export type AnyDeleteTask = DeleteTask | FolderDeleteTask

export interface DeleteTaskConfig {
  maxRetries?: number
  retryDelay?: number
}

export interface DeleteTaskHelpers {
  handler: TaskHandler<DeleteTask, DeleteStatus>
  folderHandler: TaskHandler<FolderDeleteTask, DeleteStatus>
  createTasks: (
    keys: string[],
    bucketName: string,
    prefix?: string,
    options?: { forceDelete?: boolean },
  ) => DeleteTask[]
  createVersionedTasks: (
    items: { key: string; versionId?: string }[],
    bucketName: string,
    prefix?: string,
    options?: { forceDelete?: boolean },
  ) => DeleteTask[]
  createFolderDeleteTask: (prefix: string, bucketName: string, options?: { forceDelete?: boolean }) => FolderDeleteTask
}

const lifecycle: TaskLifecycleStatus<DeleteStatus> = {
  pending: "pending",
  running: "running",
  completed: "completed",
  failed: "failed",
  canceled: "canceled",
}

function attachForceDeleteHeader(command: DeleteObjectCommand | DeleteObjectsCommand) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(command.middlewareStack.add as any)(
    (next: (args: unknown) => Promise<unknown>) => async (args: { request?: { headers?: Record<string, string> } }) => {
      if (args?.request?.headers) {
        args.request.headers["X-Rustfs-Force-Delete"] = "true"
      }
      return next(args)
    },
    { step: "build", name: "forceDeleteMiddleware", tags: ["FORCE_DELETE"] },
  )
}

export function createDeleteTaskHelpers(s3Client: S3Client, config: DeleteTaskConfig = {}): DeleteTaskHelpers {
  const maxRetries = config.maxRetries ?? 3
  const retryDelay = config.retryDelay ?? 1000

  const perform: TaskHandler<DeleteTask, DeleteStatus>["perform"] = async (task) => {
    const { key, bucketName, prefix, versionId, forceDelete } = task
    const abortController = new AbortController()
    task.abortController = abortController

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: (prefix ?? "") + key,
      ...(versionId ? { VersionId: versionId } : {}),
    })

    if (forceDelete) attachForceDeleteHeader(command)

    await s3Client.send(command, { abortSignal: abortController.signal })
    task.progress = 100
  }

  const performFolder: TaskHandler<FolderDeleteTask, DeleteStatus>["perform"] = async (task) => {
    const { bucketName, prefix, forceDelete } = task
    const abortController = new AbortController()
    task.abortController = abortController

    if (forceDelete) {
      let isTruncated = true
      let keyMarker: string | undefined
      let versionIdMarker: string | undefined

      while (isTruncated) {
        const data = await s3Client.send(
          new ListObjectVersionsCommand({
            Bucket: bucketName,
            Prefix: prefix,
            KeyMarker: keyMarker,
            VersionIdMarker: versionIdMarker,
          }),
          { abortSignal: abortController.signal },
        )

        const objectsToDelete: { Key: string; VersionId?: string }[] = []
        data.Versions?.forEach((v) => {
          if (v.Key) objectsToDelete.push({ Key: v.Key, VersionId: v.VersionId })
        })
        data.DeleteMarkers?.forEach((m) => {
          if (m.Key) objectsToDelete.push({ Key: m.Key, VersionId: m.VersionId })
        })

        if (objectsToDelete.length > 0) {
          const command = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: objectsToDelete, Quiet: true },
          })
          attachForceDeleteHeader(command)
          await s3Client.send(command, { abortSignal: abortController.signal })
        }

        isTruncated = data.IsTruncated ?? false
        keyMarker = data.NextKeyMarker
        versionIdMarker = data.NextVersionIdMarker
      }
    } else {
      let isTruncated = true
      let continuationToken: string | undefined

      while (isTruncated) {
        const data = await s3Client.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
          { abortSignal: abortController.signal },
        )

        const objectsToDelete = (data.Contents ?? []).filter((item) => item.Key).map((item) => ({ Key: item.Key! }))

        if (objectsToDelete.length > 0) {
          const command = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: objectsToDelete, Quiet: true },
          })
          await s3Client.send(command, { abortSignal: abortController.signal })
        }

        isTruncated = data.IsTruncated ?? false
        continuationToken = data.NextContinuationToken
      }
    }
    task.progress = 100
  }

  const shouldRetry = (task: DeleteTask | FolderDeleteTask, error: unknown) => {
    if (task.status === lifecycle.canceled) return false
    if ((task.retryCount ?? 0) >= maxRetries) return false
    const errorMessage = String((error as Error)?.message ?? "").toLowerCase()
    const nonRetryableErrors = ["access denied", "forbidden", "invalid credentials", "bucket not found", "no such key"]
    return !nonRetryableErrors.some((msg) => errorMessage.includes(msg))
  }

  const handler: TaskHandler<DeleteTask, DeleteStatus> = {
    lifecycle,
    perform,
    shouldRetry,
    isCanceledError: (error) =>
      (error as Error)?.name === "AbortError" || String((error as Error)?.message ?? "").includes("canceled"),
    maxRetries,
    retryDelay,
  }

  const folderHandler: TaskHandler<FolderDeleteTask, DeleteStatus> = {
    lifecycle,
    perform: performFolder,
    shouldRetry,
    isCanceledError: (error) =>
      (error as Error)?.name === "AbortError" || String((error as Error)?.message ?? "").includes("canceled"),
    maxRetries,
    retryDelay,
  }

  const createTasksFromItems = (
    items: { key: string; versionId?: string; forceDelete?: boolean }[],
    bucketName: string,
    prefix?: string,
  ): DeleteTask[] =>
    items.map((item) => ({
      id: createTaskId(`${item.key}-${item.versionId ?? "latest"}`),
      kind: "delete" as const,
      key: item.key,
      versionId: item.versionId,
      forceDelete: item.forceDelete,
      status: lifecycle.pending,
      progress: 0,
      bucketName,
      prefix: prefix ?? "",
      actionLabel: "Delete",
      displayName: item.key,
      subInfo: item.versionId ? `Version: ${item.versionId}` : "",
      error: undefined,
      abortController: undefined,
      retryCount: 0,
    }))

  const createTasks = (keys: string[], bucketName: string, prefix?: string, options?: { forceDelete?: boolean }) =>
    createTasksFromItems(
      keys.map((key) => ({ key, forceDelete: options?.forceDelete })),
      bucketName,
      prefix,
    )

  const createVersionedTasks = (
    items: { key: string; versionId?: string }[],
    bucketName: string,
    prefix?: string,
    options?: { forceDelete?: boolean },
  ) =>
    createTasksFromItems(
      items.map((item) => ({ ...item, forceDelete: options?.forceDelete })),
      bucketName,
      prefix,
    )

  const createFolderDeleteTask = (
    prefix: string,
    bucketName: string,
    options?: { forceDelete?: boolean },
  ): FolderDeleteTask => ({
    id: createTaskId(prefix),
    kind: "delete-folder" as const,
    bucketName,
    prefix,
    forceDelete: options?.forceDelete,
    status: lifecycle.pending,
    progress: 0,
    actionLabel: "Delete Folder",
    displayName: prefix,
    subInfo: options?.forceDelete ? "Deleting all versions" : "Recursive delete",
    error: undefined,
    abortController: undefined,
    retryCount: 0,
  })

  return { handler, folderHandler, createTasks, createVersionedTasks, createFolderDeleteTask }
}
