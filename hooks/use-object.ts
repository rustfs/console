"use client"

import { useCallback } from "react"
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  type DeleteMarkerEntry,
  GetObjectLegalHoldCommand,
  GetObjectRetentionCommand,
  GetObjectTaggingCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectVersionsCommand,
  type ListObjectVersionsCommandOutput,
  ListObjectsV2Command,
  type ObjectVersion,
  ObjectLockRetentionMode,
  PutObjectCommand,
  PutObjectLegalHoldCommand,
  PutObjectRetentionCommand,
  PutObjectTaggingCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { useS3 } from "@/contexts/s3-context"
import { encodeObjectCopySource } from "@/lib/object-rename"
import { decodeS3UrlEncodedObjectList, decodeS3UrlEncodedObjectVersions } from "@/lib/s3-object-encoding"

function attachIncludeDeletedHeader(command: ListObjectsV2Command) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(command.middlewareStack.add as any)(
    (next: (args: unknown) => Promise<unknown>) => async (args: { request?: { headers?: Record<string, string> } }) => {
      if (args?.request?.headers) {
        args.request.headers["X-Rustfs-Include-Deleted"] = "true"
      }
      return next(args)
    },
    { step: "build", name: "includeDeletedMiddleware", tags: ["INCLUDE_DELETED"] },
  )
}

export function useObject(bucket: string) {
  const client = useS3()

  const headObject = useCallback(
    async (key: string) => {
      return client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    },
    [client, bucket],
  )

  const getSignedUrlFn = useCallback(
    async (key: string, expiresIn = 3600) => {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key })
      return getSignedUrl(client, command, { expiresIn })
    },
    [client, bucket],
  )

  const putObject = useCallback(
    async (key: string, body: Blob | string) => {
      return client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }))
    },
    [client, bucket],
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
      { step: "build", name: "forceDeleteMiddleware", tags: ["FORCE_DELETE"] },
    )
  }

  const deleteObject = useCallback(
    async (key: string, versionId?: string, options?: { forceDelete?: boolean }) => {
      const params: { Bucket: string; Key: string; VersionId?: string } = {
        Bucket: bucket,
        Key: key,
      }
      if (versionId) params.VersionId = versionId

      const command = new DeleteObjectCommand(params)
      if (options?.forceDelete) attachForceDeleteHeader(command)

      return client.send(command)
    },
    [client, bucket],
  )

  const renameObject = useCallback(
    async (sourceKey: string, targetKey: string) => {
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: targetKey,
          CopySource: encodeObjectCopySource(bucket, sourceKey),
          IfNoneMatch: "*",
          MetadataDirective: "COPY",
          TaggingDirective: "COPY",
        }),
      )

      return deleteObject(sourceKey)
    },
    [client, bucket, deleteObject],
  )

  const restoreObjectVersion = useCallback(
    async (key: string, versionId: string) => {
      return client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: key,
          CopySource: encodeObjectCopySource(bucket, key, versionId),
          MetadataDirective: "COPY",
          TaggingDirective: "COPY",
        }),
      )
    },
    [client, bucket],
  )

  const listObject = useCallback(
    async (
      bucketName: string,
      prefix?: string,
      pageSize = 25,
      continuationToken?: string,
      options?: { includeDeleted?: boolean },
    ) => {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: pageSize,
        Delimiter: "/",
        ContinuationToken: continuationToken,
        EncodingType: "url",
      })
      if (options?.includeDeleted) {
        attachIncludeDeletedHeader(command)
      }
      const response = await client.send(command)
      return decodeS3UrlEncodedObjectList(response)
    },
    [client],
  )

  const mapAllFiles = useCallback(
    async (bucketName: string, prefix: string, callback: (fileKey: string) => void) => {
      let isTruncated = true
      let continuationToken: string | undefined

      while (isTruncated) {
        const data = await client.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
            ContinuationToken: continuationToken,
            EncodingType: "url",
          }),
        )
        decodeS3UrlEncodedObjectList(data)

        data.Contents?.forEach((item) => {
          if (item.Key) callback(item.Key)
        })

        isTruncated = data.IsTruncated ?? false
        continuationToken = data.NextContinuationToken
      }
    },
    [client],
  )

  const getObjectInfo = useCallback(
    async (key: string) => {
      const [meta, signedUrl] = await Promise.all([headObject(key), getSignedUrlFn(key)])
      return {
        ...meta,
        Key: key,
        SignedUrl: signedUrl,
      }
    },
    [headObject, getSignedUrlFn],
  )

  const getObjectTags = useCallback(
    async (key: string): Promise<Array<{ Key: string; Value: string }>> => {
      const response = await client.send(new GetObjectTaggingCommand({ Bucket: bucket, Key: key }))
      return (response.TagSet ?? []).map((tag) => ({
        Key: tag.Key ?? "",
        Value: tag.Value ?? "",
      }))
    },
    [client, bucket],
  )

  const putObjectTags = useCallback(
    async (key: string, tags: Array<{ Key: string; Value: string }>) => {
      const sanitizedTags = tags
        .filter((tag) => tag.Key && tag.Value)
        .map((tag) => ({ Key: tag.Key, Value: tag.Value }))
      return client.send(
        new PutObjectTaggingCommand({
          Bucket: bucket,
          Key: key,
          Tagging: { TagSet: sanitizedTags },
        }),
      )
    },
    [client, bucket],
  )

  const getObjectRetention = useCallback(
    async (key: string): Promise<{ Mode: string; RetainUntilDate: string }> => {
      try {
        const response = await client.send(new GetObjectRetentionCommand({ Bucket: bucket, Key: key }))
        const retention = response?.Retention
        if (!retention || Object.keys(retention).length === 0) {
          return { Mode: "", RetainUntilDate: "" }
        }
        return {
          Mode: retention.Mode ?? "",
          RetainUntilDate: retention.RetainUntilDate ? new Date(retention.RetainUntilDate).toISOString() : "",
        }
      } catch (err) {
        const msg = (err as Error)?.message ?? ""
        if (msg.includes("Deserialization error")) {
          return { Mode: "", RetainUntilDate: "" }
        }
        throw err
      }
    },
    [client, bucket],
  )

  const getObjectLegalHold = useCallback(
    async (key: string): Promise<{ Status: string }> => {
      try {
        const response = await client.send(new GetObjectLegalHoldCommand({ Bucket: bucket, Key: key }))
        return { Status: response?.LegalHold?.Status ?? "" }
      } catch (err) {
        const msg = (err as Error)?.message ?? ""
        if (msg.includes("Deserialization error")) {
          return { Status: "" }
        }
        throw err
      }
    },
    [client, bucket],
  )

  const putObjectRetention = useCallback(
    async (
      key: string,
      retention: {
        Mode: "GOVERNANCE" | "COMPLIANCE"
        RetainUntilDate?: string
      },
    ) => {
      return client.send(
        new PutObjectRetentionCommand({
          Bucket: bucket,
          Key: key,
          Retention: {
            Mode:
              retention.Mode === "COMPLIANCE" ? ObjectLockRetentionMode.COMPLIANCE : ObjectLockRetentionMode.GOVERNANCE,
            ...(retention.RetainUntilDate ? { RetainUntilDate: new Date(retention.RetainUntilDate) } : {}),
          },
        }),
      )
    },
    [client, bucket],
  )

  const setLegalHold = useCallback(
    async (key: string, enabled: boolean) => {
      return client.send(
        new PutObjectLegalHoldCommand({
          Bucket: bucket,
          Key: key,
          LegalHold: { Status: enabled ? "ON" : "OFF" },
        }),
      )
    },
    [client, bucket],
  )

  const listObjectVersions = useCallback(
    async (key: string) => {
      const Versions: ObjectVersion[] = []
      const DeleteMarkers: DeleteMarkerEntry[] = []
      let keyMarker: string | undefined
      let versionIdMarker: string | undefined
      let isTruncated = true
      let lastResponse: Partial<ListObjectVersionsCommandOutput> = {}

      while (isTruncated) {
        const res = await client.send(
          new ListObjectVersionsCommand({
            Bucket: bucket,
            Prefix: key,
            Delimiter: "/",
            EncodingType: "url",
            KeyMarker: keyMarker,
            VersionIdMarker: versionIdMarker,
          }),
        )
        decodeS3UrlEncodedObjectVersions(res)
        lastResponse = res
        Versions.push(...(res.Versions ?? []).filter((v) => v.Key === key))
        DeleteMarkers.push(...(res.DeleteMarkers ?? []).filter((m) => m.Key === key))
        isTruncated = res.IsTruncated ?? false
        keyMarker = res.NextKeyMarker
        versionIdMarker = res.NextVersionIdMarker
      }

      Versions.sort((a, b) => new Date(b.LastModified!).getTime() - new Date(a.LastModified!).getTime())
      DeleteMarkers.sort((a, b) => new Date(b.LastModified!).getTime() - new Date(a.LastModified!).getTime())
      return { ...lastResponse, Versions, DeleteMarkers, IsTruncated: false }
    },
    [client, bucket],
  )

  return {
    headObject,
    putObject,
    deleteObject,
    renameObject,
    restoreObjectVersion,
    getSignedUrl: getSignedUrlFn,
    listObject,
    mapAllFiles,
    getObjectInfo,
    getObjectTags,
    putObjectTags,
    getObjectLegalHold,
    getObjectRetention,
    putObjectRetention,
    setLegalHold,
    listObjectVersions,
  }
}
