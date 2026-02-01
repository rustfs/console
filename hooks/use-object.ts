"use client"

import { useCallback } from "react"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { useS3 } from "@/contexts/s3-context"

function attachIncludeDeletedHeader(command: ListObjectsV2Command) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(command.middlewareStack.add as any)(
    (next: (args: unknown) => Promise<unknown>) =>
      async (args: { request?: { headers?: Record<string, string> } }) => {
        if (args?.request?.headers) {
          args.request.headers["X-Rustfs-Include-Deleted"] = "true"
        }
        return next(args)
      },
    { step: "build", name: "includeDeletedMiddleware", tags: ["INCLUDE_DELETED"] }
  )
}

export function useObject(bucket: string) {
  const client = useS3()

  const headObject = useCallback(
    async (key: string) => {
      return client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    },
    [client, bucket]
  )

  const getSignedUrlFn = useCallback(
    async (key: string, expiresIn = 3600) => {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key })
      return getSignedUrl(client, command, { expiresIn })
    },
    [client, bucket]
  )

  const putObject = useCallback(
    async (key: string, body: Blob | string) => {
      return client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }))
    },
    [client, bucket]
  )

  const attachForceDeleteHeader = (command: DeleteObjectCommand) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(command.middlewareStack.add as any)(
      (next: (args: unknown) => Promise<unknown>) =>
        async (args: { request?: { headers?: Record<string, string> } }) => {
          if (args?.request?.headers) {
            args.request.headers["X-Rustfs-Force-Delete"] = "true"
          }
          return next(args)
        },
      { step: "build", name: "forceDeleteMiddleware", tags: ["FORCE_DELETE"] }
    )
  }

  const deleteObject = useCallback(
    async (
      key: string,
      versionId?: string,
      options?: { forceDelete?: boolean }
    ) => {
      const params: { Bucket: string; Key: string; VersionId?: string } = {
        Bucket: bucket,
        Key: key,
      }
      if (versionId) params.VersionId = versionId

      const command = new DeleteObjectCommand(params)
      if (options?.forceDelete) attachForceDeleteHeader(command)

      return client.send(command)
    },
    [client, bucket]
  )

  const listObject = useCallback(
    async (
      bucketName: string,
      prefix?: string,
      pageSize = 25,
      continuationToken?: string,
      options?: { includeDeleted?: boolean }
    ) => {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: pageSize,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      })
      if (options?.includeDeleted) {
        attachIncludeDeletedHeader(command)
      }
      return client.send(command)
    },
    [client]
  )

  const mapAllFiles = useCallback(
    async (
      bucketName: string,
      prefix: string,
      callback: (fileKey: string) => void
    ) => {
      let isTruncated = true
      let continuationToken: string | undefined

      while (isTruncated) {
        const data = await client.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          })
        )

        data.Contents?.forEach((item) => {
          if (item.Key) callback(item.Key)
        })

        isTruncated = data.IsTruncated ?? false
        continuationToken = data.NextContinuationToken
      }
    },
    [client]
  )

  const getObjectInfo = useCallback(
    async (key: string) => {
      const [meta, signedUrl] = await Promise.all([
        headObject(key),
        getSignedUrlFn(key),
      ])
      return {
        ...meta,
        Key: key,
        SignedUrl: signedUrl,
      }
    },
    [headObject, getSignedUrlFn]
  )

  return {
    headObject,
    putObject,
    deleteObject,
    getSignedUrl: getSignedUrlFn,
    listObject,
    mapAllFiles,
    getObjectInfo,
  }
}
