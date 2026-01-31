"use client"

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { useS3 } from "@/contexts/s3-context"

export function useObject(bucket: string) {
  const client = useS3()

  const headObject = async (key: string) => {
    return client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  }

  const getSignedUrlFn = async (key: string, expiresIn = 3600) => {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key })
    return getSignedUrl(client, command, { expiresIn })
  }

  const putObject = async (key: string, body: Blob | string) => {
    return client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }))
  }

  const attachForceDeleteHeader = (command: DeleteObjectCommand) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(command.middlewareStack.add as any)(
      (next: any) =>
        async (args: any) => {
          if (args?.request?.headers) {
            args.request.headers["X-Rustfs-Force-Delete"] = "true"
          }
          return next(args)
        },
      { step: "build", name: "forceDeleteMiddleware", tags: ["FORCE_DELETE"] }
    )
  }

  const deleteObject = async (
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
  }

  const listObject = async (
    bucketName: string,
    prefix?: string,
    pageSize = 25
  ) => {
    return client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: pageSize,
        Delimiter: "/",
      })
    )
  }

  return {
    headObject,
    putObject,
    deleteObject,
    getSignedUrl: getSignedUrlFn,
    listObject,
  }
}
