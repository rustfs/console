import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  UploadPartCopyCommand,
  type HeadObjectCommandOutput,
  type S3Client,
} from "@aws-sdk/client-s3"
import { encodeObjectCopySource } from "./object-rename"

export interface ObjectTransferRequest {
  mode: "copy" | "move"
  sourceBucket: string
  sourceKey: string
  targetBucket: string
  targetKey: string
}

export interface ObjectTransferProgress {
  phase: "preparing" | "copying" | "deleting"
  copiedBytes: number
  totalBytes: number
}

export class ObjectTransferError extends Error {
  readonly copied: boolean

  constructor(message: string, copied = false, cause?: unknown) {
    super(message, { cause })
    this.name = "ObjectTransferError"
    this.copied = copied
  }
}

export function validateObjectTransfer(
  request: ObjectTransferRequest,
): { field: "bucket" | "key"; message: string } | null {
  if (!request.targetBucket || /[\s/]/.test(request.targetBucket)) {
    return { field: "bucket", message: "Enter a destination bucket name without spaces or slashes." }
  }
  if (!request.targetKey || request.targetKey.endsWith("/")) {
    return { field: "key", message: "Enter a destination path including the object name." }
  }
  if (new TextEncoder().encode(request.targetKey).length > 1024) {
    return { field: "key", message: "The object path must not exceed 1,024 UTF-8 bytes." }
  }
  if (request.sourceBucket === request.targetBucket && request.sourceKey === request.targetKey) {
    return { field: "key", message: "The destination must be different from the source." }
  }
  return null
}

const SINGLE_COPY_LIMIT = 5 * 1024 ** 3
const MIN_COPY_PART_SIZE = 512 * 1024 ** 2

async function copyMultipartObject(
  client: S3Client,
  request: ObjectTransferRequest,
  source: HeadObjectCommandOutput,
  report: (copiedBytes: number) => void,
) {
  const target = { Bucket: request.targetBucket, Key: request.targetKey }
  const totalBytes = source.ContentLength!
  const partSize = Math.max(MIN_COPY_PART_SIZE, Math.ceil(totalBytes / 10000))
  if (partSize > SINGLE_COPY_LIMIT) throw new Error("The object is too large for multipart copy.")

  const tags = await client.send(
    new GetObjectTaggingCommand({ Bucket: request.sourceBucket, Key: request.sourceKey, VersionId: source.VersionId }),
  )
  if (!tags.TagSet) throw new Error("The source object tags could not be read.")

  const created = await client.send(
    new CreateMultipartUploadCommand({
      ...target,
      Metadata: source.Metadata,
      CacheControl: source.CacheControl,
      ContentDisposition: source.ContentDisposition,
      ContentEncoding: source.ContentEncoding,
      ContentLanguage: source.ContentLanguage,
      ContentType: source.ContentType,
      Expires: source.Expires,
      WebsiteRedirectLocation: source.WebsiteRedirectLocation,
      Tagging: tags.TagSet.map((tag) => `${encodeURIComponent(tag.Key!)}=${encodeURIComponent(tag.Value ?? "")}`).join(
        "&",
      ),
    }),
  )
  if (!created.UploadId) throw new Error("The multipart upload could not be confirmed.")

  const upload = { ...target, UploadId: created.UploadId }
  try {
    const parts: { PartNumber: number; ETag: string }[] = []
    for (let start = 0; start < totalBytes; start += partSize) {
      const end = Math.min(start + partSize, totalBytes) - 1
      const PartNumber = parts.length + 1
      const result = await client.send(
        new UploadPartCopyCommand({
          ...upload,
          PartNumber,
          CopySource: encodeObjectCopySource(request.sourceBucket, request.sourceKey, source.VersionId),
          CopySourceIfMatch: source.ETag,
          CopySourceRange: `bytes=${start}-${end}`,
        }),
      )
      if (!result.CopyPartResult?.ETag) throw new Error("The copied part could not be confirmed.")
      parts.push({ PartNumber, ETag: result.CopyPartResult.ETag })
      report(end + 1)
    }

    const result = await client.send(
      new CompleteMultipartUploadCommand({ ...upload, MultipartUpload: { Parts: parts }, IfNoneMatch: "*" }),
    )
    if (!result.ETag) throw new Error("The copy result could not be confirmed. Check the destination before retrying.")
  } catch (error) {
    try {
      await client.send(new AbortMultipartUploadCommand(upload))
    } catch (cleanupError) {
      // Completion may have succeeded even if its response was lost.
      if ((cleanupError as { name?: string })?.name !== "NoSuchUpload") {
        throw new ObjectTransferError(
          "Copy failed and the unfinished upload could not be cleaned up. Check the destination bucket.",
          false,
          new AggregateError([error, cleanupError]),
        )
      }
    }
    throw error
  }
}

function sourceIsUnchanged(source: HeadObjectCommandOutput, current: HeadObjectCommandOutput): boolean {
  return (
    source.ETag === current.ETag &&
    source.VersionId === current.VersionId &&
    source.ContentLength === current.ContentLength &&
    source.LastModified?.getTime() === current.LastModified?.getTime()
  )
}

export async function transferObject(
  client: S3Client,
  request: ObjectTransferRequest,
  onProgress?: (progress: ObjectTransferProgress) => void,
): Promise<void> {
  const validation = validateObjectTransfer(request)
  if (validation) throw new ObjectTransferError(validation.message)
  if (!request.sourceBucket || !request.sourceKey) throw new ObjectTransferError("The source object is required.")

  onProgress?.({ phase: "preparing", copiedBytes: 0, totalBytes: 0 })
  const sourceLocation = { Bucket: request.sourceBucket, Key: request.sourceKey }
  let source: HeadObjectCommandOutput
  try {
    source = await client.send(new HeadObjectCommand(sourceLocation))
    if (!source.ETag || !Number.isSafeInteger(source.ContentLength) || source.ContentLength! < 0) {
      throw new Error("The source object information could not be confirmed.")
    }
    const report = (copiedBytes: number) =>
      onProgress?.({ phase: "copying", copiedBytes, totalBytes: source.ContentLength! })
    report(0)
    if (source.ContentLength! > SINGLE_COPY_LIMIT) {
      await copyMultipartObject(client, request, source, report)
    } else {
      const result = await client.send(
        new CopyObjectCommand({
          Bucket: request.targetBucket,
          Key: request.targetKey,
          CopySource: encodeObjectCopySource(request.sourceBucket, request.sourceKey, source.VersionId),
          CopySourceIfMatch: source.ETag,
          IfNoneMatch: "*",
          MetadataDirective: "COPY",
          TaggingDirective: "COPY",
          WebsiteRedirectLocation: source.WebsiteRedirectLocation,
        }),
      )
      if (!result.CopyObjectResult?.ETag) {
        throw new Error("The copy result could not be confirmed. Check the destination before retrying.")
      }
    }
    report(source.ContentLength!)
  } catch (error) {
    if (error instanceof ObjectTransferError) throw error
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode
    throw new ObjectTransferError(
      status === 412 || status === 409
        ? "The source changed or the destination already exists. Refresh and choose a different destination."
        : "Copy could not be confirmed. The source was not deleted. Check the destination before retrying.",
      false,
      error,
    )
  }

  if (request.mode !== "move") return
  onProgress?.({ phase: "deleting", copiedBytes: source.ContentLength!, totalBytes: source.ContentLength! })
  try {
    const current = await client.send(new HeadObjectCommand(sourceLocation))
    if (!sourceIsUnchanged(source, current)) {
      throw new Error("The source changed after copying.")
    }
    // Keep historical versions; IfMatch is checked atomically by the server.
    const result = await client.send(new DeleteObjectCommand({ ...sourceLocation, IfMatch: source.ETag }))
    if (result.$metadata?.httpStatusCode !== 204) throw new Error("Source deletion could not be confirmed.")
  } catch (error) {
    throw new ObjectTransferError(
      "The destination was copied, but source deletion could not be confirmed. Check both locations before retrying.",
      true,
      error,
    )
  }
}
