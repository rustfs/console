import test from "node:test"
import assert from "node:assert/strict"
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  UploadPartCopyCommand,
  type S3Client,
} from "@aws-sdk/client-s3"
import {
  ObjectTransferError,
  transferObject,
  validateObjectTransfer,
  type ObjectTransferProgress,
  type ObjectTransferRequest,
} from "../../lib/object-transfer"
import type { ConsolePolicy } from "../../lib/console-policy-parser"
import { hasConsoleCapability } from "../../lib/permission-capabilities"

type TransferCommand =
  | AbortMultipartUploadCommand
  | CompleteMultipartUploadCommand
  | CopyObjectCommand
  | CreateMultipartUploadCommand
  | DeleteObjectCommand
  | GetObjectTaggingCommand
  | HeadObjectCommand
  | UploadPartCopyCommand

const singleCopyLimit = 5 * 1024 ** 3
const minimumPartSize = 512 * 1024 ** 2
const request: ObjectTransferRequest = {
  mode: "copy",
  sourceBucket: "source-bucket",
  sourceKey: "original/report.txt",
  targetBucket: "destination-bucket",
  targetKey: "archive/report.txt",
}
const source = {
  ContentLength: 12,
  ETag: '"source-etag"',
  VersionId: "source-version",
  LastModified: new Date("2026-09-01T00:00:00Z"),
}

function defaultResponse(command: TransferCommand): unknown {
  if (command instanceof HeadObjectCommand) return { ...source }
  if (command instanceof CopyObjectCommand) return { CopyObjectResult: { ETag: '"destination-etag"' } }
  if (command instanceof GetObjectTaggingCommand) return { TagSet: [] }
  if (command instanceof CreateMultipartUploadCommand) return { UploadId: "transfer-upload" }
  if (command instanceof UploadPartCopyCommand) {
    return { CopyPartResult: { ETag: `"part-${command.input.PartNumber}"` } }
  }
  if (command instanceof CompleteMultipartUploadCommand) return { ETag: '"multipart-etag"' }
  if (command instanceof DeleteObjectCommand) return { $metadata: { httpStatusCode: 204 } }
  if (command instanceof AbortMultipartUploadCommand) return {}
  throw new Error("Unexpected command")
}

function createClient(respond: (command: TransferCommand) => unknown = defaultResponse) {
  const commands: TransferCommand[] = []
  const client = {
    send: async (command: TransferCommand) => {
      commands.push(command)
      return respond(command)
    },
  } as unknown as S3Client
  return { client, commands }
}

function isTransferFailure(copied: boolean) {
  return (error: unknown) => {
    assert.ok(error instanceof ObjectTransferError)
    assert.equal(error.copied, copied)
    return true
  }
}

for (const [description, values, field] of [
  ["an empty destination bucket", { targetBucket: "" }, "bucket"],
  ["a destination bucket containing whitespace", { targetBucket: "target bucket" }, "bucket"],
  ["a bucket field containing a path", { targetBucket: "target/folder" }, "bucket"],
  ["an empty destination key", { targetKey: "" }, "key"],
  ["a destination with no object name", { targetKey: "folder/" }, "key"],
  ["a key exceeding 1,024 UTF-8 bytes", { targetKey: "文".repeat(342) }, "key"],
  ["the unchanged source location", { targetBucket: request.sourceBucket, targetKey: request.sourceKey }, "key"],
] as const) {
  test(`transfer validation rejects ${description}`, () => {
    assert.equal(validateObjectTransfer({ ...request, ...values })?.field, field)
  })
}

for (const [description, values] of [
  ["the same key in another bucket", { targetKey: request.sourceKey }],
  ["a leading slash and surrounding spaces", { targetKey: "/ report .txt " }],
  ["a whitespace-only object name", { targetKey: " " }],
  ["a key of exactly 1,024 UTF-8 bytes", { targetKey: `${"文".repeat(341)}a` }],
] as const) {
  test(`transfer validation accepts ${description}`, () => {
    assert.equal(validateObjectTransfer({ ...request, ...values }), null)
  })
}

test("invalid transfer destinations fail before making an S3 request", async () => {
  const { client, commands } = createClient()

  await assert.rejects(transferObject(client, { ...request, targetKey: "" }), isTransferFailure(false))
  assert.equal(commands.length, 0)
})

test("single-object copy preserves metadata and tags and never overwrites a destination", async () => {
  const { client, commands } = createClient()
  const targetKey = "/ 报告 +%?.txt "
  const progress: ObjectTransferProgress[] = []

  await transferObject(client, { ...request, targetKey }, (value) => progress.push(value))

  const copy = commands.find((command) => command instanceof CopyObjectCommand)
  assert.ok(copy)
  assert.equal(copy.input.Bucket, request.targetBucket)
  assert.equal(copy.input.Key, targetKey)
  assert.equal(copy.input.CopySourceIfMatch, source.ETag)
  assert.equal(copy.input.IfNoneMatch, "*")
  assert.equal(copy.input.MetadataDirective, "COPY")
  assert.equal(copy.input.TaggingDirective, "COPY")
  assert.equal(
    commands.some((command) => command instanceof DeleteObjectCommand),
    false,
  )
  assert.deepEqual(progress.at(-1), { phase: "copying", copiedBytes: 12, totalBytes: 12 })
})

test("single-object copy explicitly preserves the source website redirect location", async () => {
  const redirectLocation = "/reports/latest"
  const { client, commands } = createClient((command) => {
    if (command instanceof HeadObjectCommand) return { ...source, WebsiteRedirectLocation: redirectLocation }
    return defaultResponse(command)
  })

  await transferObject(client, request)

  const copy = commands.find((command) => command instanceof CopyObjectCommand)
  assert.equal(copy?.input.WebsiteRedirectLocation, redirectLocation)
})

test("copy encodes Unicode and reserved source characters and pins the observed source version", async () => {
  const versionId = "2026/09/01 version+1"
  const { client, commands } = createClient((command) => {
    if (command instanceof HeadObjectCommand) return { ...source, VersionId: versionId }
    return defaultResponse(command)
  })

  await transferObject(client, { ...request, sourceKey: "a b/c+中文%?.txt" })

  const copy = commands.find((command) => command instanceof CopyObjectCommand)
  assert.equal(
    copy?.input.CopySource,
    "/source-bucket/a%20b/c%2B%E4%B8%AD%E6%96%87%25%3F.txt?versionId=2026%2F09%2F01%20version%2B1",
  )
})

for (const contentLength of [0, singleCopyLimit]) {
  test(`copy uses CopyObject for an object of ${contentLength} bytes`, async () => {
    const { client, commands } = createClient((command) => {
      if (command instanceof HeadObjectCommand) return { ...source, ContentLength: contentLength }
      return defaultResponse(command)
    })

    await transferObject(client, request)

    assert.deepEqual(
      commands.map((command) => command.constructor.name),
      ["HeadObjectCommand", "CopyObjectCommand"],
    )
  })
}

test("unversioned objects can be copied without adding a version parameter", async () => {
  const { client, commands } = createClient((command) => {
    if (command instanceof HeadObjectCommand) return { ...source, VersionId: undefined }
    return defaultResponse(command)
  })

  await transferObject(client, request)

  const copy = commands.find((command) => command instanceof CopyObjectCommand)
  assert.equal(copy?.input.CopySource, "/source-bucket/original/report.txt")
})

for (const sourceResponse of [
  {},
  { ...source, ETag: undefined },
  { ...source, ETag: "" },
  { ...source, ContentLength: undefined },
  { ...source, ContentLength: -1 },
  { ...source, ContentLength: Number.NaN },
]) {
  test(`copy refuses unconfirmed source information ${JSON.stringify(sourceResponse)}`, async () => {
    const { client, commands } = createClient((command) => {
      if (command instanceof HeadObjectCommand) return sourceResponse
      return defaultResponse(command)
    })

    await assert.rejects(transferObject(client, request), isTransferFailure(false))
    assert.equal(commands.length, 1)
  })
}

for (const status of [409, 412]) {
  test(`a ${status} destination conflict does not retry the transfer or delete the source`, async () => {
    const { client, commands } = createClient((command) => {
      if (command instanceof CopyObjectCommand) {
        throw Object.assign(new Error("Destination already exists"), { $metadata: { httpStatusCode: status } })
      }
      return defaultResponse(command)
    })

    await assert.rejects(transferObject(client, { ...request, mode: "move" }), isTransferFailure(false))
    assert.deepEqual(
      commands.map((command) => command.constructor.name),
      ["HeadObjectCommand", "CopyObjectCommand"],
    )
  })
}

for (const response of [{}, { CopyObjectResult: {} }, { CopyObjectResult: { ETag: "" } }]) {
  test(`move retains the source when a copy response is unconfirmed: ${JSON.stringify(response)}`, async () => {
    const { client, commands } = createClient((command) => {
      if (command instanceof CopyObjectCommand) return response
      return defaultResponse(command)
    })

    await assert.rejects(transferObject(client, { ...request, mode: "move" }), isTransferFailure(false))
    assert.equal(
      commands.some((command) => command instanceof DeleteObjectCommand),
      false,
    )
  })
}

test("move rechecks the source before conditional deletion and preserves historical versions", async () => {
  const { client, commands } = createClient()

  await transferObject(client, { ...request, mode: "move" })

  assert.deepEqual(
    commands.map((command) => command.constructor.name),
    ["HeadObjectCommand", "CopyObjectCommand", "HeadObjectCommand", "DeleteObjectCommand"],
  )
  const deletion = commands.find((command) => command instanceof DeleteObjectCommand)
  assert.deepEqual(deletion?.input, {
    Bucket: request.sourceBucket,
    Key: request.sourceKey,
    IfMatch: source.ETag,
  })
})

for (const [field, change] of [
  ["ETag", { ETag: '"replacement-etag"' }],
  ["VersionId", { VersionId: "replacement-version" }],
  ["ContentLength", { ContentLength: 13 }],
  ["LastModified", { LastModified: new Date("2026-09-02T00:00:00Z") }],
] as const) {
  test(`move reports a partial success without deleting a source whose ${field} changed`, async () => {
    let headCount = 0
    const { client, commands } = createClient((command) => {
      if (command instanceof HeadObjectCommand) {
        headCount += 1
        return headCount === 1 ? { ...source } : { ...source, ...change }
      }
      return defaultResponse(command)
    })

    await assert.rejects(transferObject(client, { ...request, mode: "move" }), isTransferFailure(true))
    assert.equal(
      commands.some((command) => command instanceof DeleteObjectCommand),
      false,
    )
  })
}

test("move retains the source if it cannot be reread after copying", async () => {
  let headCount = 0
  const { client, commands } = createClient((command) => {
    if (command instanceof HeadObjectCommand && ++headCount === 2) throw new Error("AccessDenied")
    return defaultResponse(command)
  })

  await assert.rejects(transferObject(client, { ...request, mode: "move" }), isTransferFailure(true))
  assert.equal(
    commands.some((command) => command instanceof DeleteObjectCommand),
    false,
  )
})

test("failed source deletion is a partial success and does not restart copying", async () => {
  const denied = new Error("Object is locked")
  const { client, commands } = createClient((command) => {
    if (command instanceof DeleteObjectCommand) throw denied
    return defaultResponse(command)
  })

  await assert.rejects(transferObject(client, { ...request, mode: "move" }), (error: unknown) => {
    isTransferFailure(true)(error)
    assert.equal((error as ObjectTransferError).cause, denied)
    return true
  })
  assert.equal(commands.filter((command) => command instanceof CopyObjectCommand).length, 1)
  assert.equal(commands.filter((command) => command instanceof DeleteObjectCommand).length, 1)
})

for (const response of [{}, { $metadata: {} }, { $metadata: { httpStatusCode: 200 } }]) {
  test(`move does not claim success without a confirmed delete response: ${JSON.stringify(response)}`, async () => {
    const { client } = createClient((command) => {
      if (command instanceof DeleteObjectCommand) return response
      return defaultResponse(command)
    })

    await assert.rejects(transferObject(client, { ...request, mode: "move" }), isTransferFailure(true))
  })
}

test("multipart copy preserves source headers, metadata and versioned tags and covers each byte once", async () => {
  const contentLength = singleCopyLimit + 1
  const headers = {
    ContentType: "text/plain",
    ContentDisposition: 'attachment; filename="report.txt"',
    ContentEncoding: "gzip",
    ContentLanguage: "zh-CN",
    CacheControl: "max-age=3600",
    Expires: new Date("2027-01-01T00:00:00Z"),
    WebsiteRedirectLocation: "/reports/latest",
    Metadata: { owner: "testing", custom: "value" },
  }
  const { client, commands } = createClient((command) => {
    if (command instanceof HeadObjectCommand) return { ...source, ...headers, ContentLength: contentLength }
    if (command instanceof GetObjectTaggingCommand) return { TagSet: [{ Key: "tag key", Value: "报告+a&b" }] }
    return defaultResponse(command)
  })
  const progress: ObjectTransferProgress[] = []

  await transferObject(client, request, (value) => progress.push(value))

  const tagging = commands.find((command) => command instanceof GetObjectTaggingCommand)
  assert.deepEqual(tagging?.input, {
    Bucket: request.sourceBucket,
    Key: request.sourceKey,
    VersionId: source.VersionId,
  })
  const create = commands.find((command) => command instanceof CreateMultipartUploadCommand)
  assert.ok(create)
  for (const [header, value] of Object.entries(headers)) {
    assert.deepEqual(create.input[header as keyof typeof headers], value)
  }
  assert.deepEqual(Array.from(new URLSearchParams(create.input.Tagging)), [["tag key", "报告+a&b"]])
  const parts = commands.filter((command) => command instanceof UploadPartCopyCommand)
  assert.equal(parts.length, 11)
  assert.deepEqual(
    parts.map((part) => part.input.CopySourceRange),
    Array.from({ length: 11 }, (_, index) => {
      const start = index * minimumPartSize
      return `bytes=${start}-${Math.min(start + minimumPartSize, contentLength) - 1}`
    }),
  )
  for (const part of parts) {
    assert.equal(part.input.CopySource, "/source-bucket/original/report.txt?versionId=source-version")
    assert.equal(part.input.CopySourceIfMatch, source.ETag)
    assert.equal(part.input.Bucket, request.targetBucket)
    assert.equal(part.input.Key, request.targetKey)
  }
  const complete = commands.find((command) => command instanceof CompleteMultipartUploadCommand)
  assert.equal(complete?.input.IfNoneMatch, "*")
  assert.deepEqual(
    complete?.input.MultipartUpload?.Parts,
    parts.map((part) => ({ PartNumber: part.input.PartNumber, ETag: `"part-${part.input.PartNumber}"` })),
  )
  assert.deepEqual(progress.at(-1), { phase: "copying", copiedBytes: contentLength, totalBytes: contentLength })
  assert.equal(
    commands.some((command) => command instanceof AbortMultipartUploadCommand),
    false,
  )
  assert.equal(
    commands.some((command) => command instanceof DeleteObjectCommand),
    false,
  )
})

test("multipart copy increases part size to stay within the 10,000-part limit", async () => {
  const contentLength = minimumPartSize * 10000 + 1
  const { client, commands } = createClient((command) => {
    if (command instanceof HeadObjectCommand) return { ...source, ContentLength: contentLength }
    return defaultResponse(command)
  })

  await transferObject(client, request)

  const parts = commands.filter((command) => command instanceof UploadPartCopyCommand)
  assert.ok(parts.length <= 10000)
  let nextByte = 0
  for (const part of parts) {
    const range = /^bytes=(\d+)-(\d+)$/.exec(part.input.CopySourceRange ?? "")
    assert.ok(range)
    const start = Number(range[1])
    const end = Number(range[2])
    assert.equal(start, nextByte)
    assert.ok(end - start + 1 <= singleCopyLimit)
    if (end < contentLength - 1) assert.ok(end - start + 1 >= minimumPartSize)
    nextByte = end + 1
  }
  assert.equal(nextByte, contentLength)
})

test("multipart copy fails before creating an upload if the source tags cannot be read", async () => {
  const { client, commands } = createClient((command) => {
    if (command instanceof HeadObjectCommand) return { ...source, ContentLength: singleCopyLimit + 1 }
    if (command instanceof GetObjectTaggingCommand) throw new Error("AccessDenied")
    return defaultResponse(command)
  })

  await assert.rejects(transferObject(client, request), isTransferFailure(false))
  assert.equal(
    commands.some((command) => command instanceof CreateMultipartUploadCommand),
    false,
  )
})

for (const failurePoint of ["part request", "part confirmation", "completion conflict", "completion confirmation"]) {
  test(`multipart copy aborts an unfinished upload after ${failurePoint} fails and retains the source`, async () => {
    const { client, commands } = createClient((command) => {
      if (command instanceof HeadObjectCommand) return { ...source, ContentLength: singleCopyLimit + 1 }
      if (command instanceof UploadPartCopyCommand && command.input.PartNumber === 2) {
        if (failurePoint === "part request") throw new Error("Part copy failed")
        if (failurePoint === "part confirmation") return { CopyPartResult: {} }
      }
      if (command instanceof CompleteMultipartUploadCommand) {
        if (failurePoint === "completion conflict") {
          throw Object.assign(new Error("Destination already exists"), { $metadata: { httpStatusCode: 412 } })
        }
        if (failurePoint === "completion confirmation") return {}
      }
      return defaultResponse(command)
    })

    await assert.rejects(transferObject(client, { ...request, mode: "move" }), isTransferFailure(false))
    const aborts = commands.filter((command) => command instanceof AbortMultipartUploadCommand)
    assert.deepEqual(
      aborts.map((command) => command.input),
      [{ Bucket: request.targetBucket, Key: request.targetKey, UploadId: "transfer-upload" }],
    )
    assert.equal(
      commands.some((command) => command instanceof DeleteObjectCommand),
      false,
    )
    assert.equal(commands.filter((command) => command instanceof CreateMultipartUploadCommand).length, 1)
  })
}

test("multipart cleanup failure retains both the copy and cleanup errors", async () => {
  const copyError = new Error("Part copy failed")
  const cleanupError = new Error("Abort denied")
  const { client, commands } = createClient((command) => {
    if (command instanceof HeadObjectCommand) return { ...source, ContentLength: singleCopyLimit + 1 }
    if (command instanceof UploadPartCopyCommand) throw copyError
    if (command instanceof AbortMultipartUploadCommand) throw cleanupError
    return defaultResponse(command)
  })

  await assert.rejects(transferObject(client, request), (error: unknown) => {
    isTransferFailure(false)(error)
    assert.ok((error as ObjectTransferError).cause instanceof AggregateError)
    assert.deepEqual(((error as ObjectTransferError).cause as AggregateError).errors, [copyError, cleanupError])
    return true
  })
  assert.equal(
    commands.some((command) => command instanceof DeleteObjectCommand),
    false,
  )
})

const sourceContext = { bucket: request.sourceBucket, objectKey: request.sourceKey }
const destinationContext = { bucket: request.targetBucket, objectKey: request.targetKey }
const sourceOnlyPolicy: ConsolePolicy = {
  Version: "2012-10-17",
  Statement: [
    { Effect: "Allow", Action: ["s3:GetObject"], Resource: ["arn:aws:s3:::source-bucket/original/report.txt"] },
  ],
}

test("copy permission requires only reading the source while move also requires deleting it", () => {
  assert.equal(hasConsoleCapability(sourceOnlyPolicy, "objects.copy", sourceContext), true)
  assert.equal(hasConsoleCapability(sourceOnlyPolicy, "objects.move", sourceContext), false)
  assert.equal(hasConsoleCapability(sourceOnlyPolicy, "objects.transferDestination", destinationContext), false)
})

test("transfer checks exact source and destination object permissions independently", () => {
  const policy: ConsolePolicy = {
    ...sourceOnlyPolicy,
    Statement: [
      ...sourceOnlyPolicy.Statement,
      { Effect: "Allow", Action: ["s3:DeleteObject"], Resource: ["arn:aws:s3:::source-bucket/original/report.txt"] },
      { Effect: "Allow", Action: ["s3:PutObject"], Resource: ["arn:aws:s3:::destination-bucket/archive/report.txt"] },
    ],
  }

  assert.equal(hasConsoleCapability(policy, "objects.move", sourceContext), true)
  assert.equal(hasConsoleCapability(policy, "objects.transferDestination", destinationContext), true)
  assert.equal(hasConsoleCapability(policy, "objects.transferDestination", sourceContext), false)
  assert.equal(
    hasConsoleCapability(policy, "objects.transferDestination", {
      ...destinationContext,
      objectKey: "archive/other.txt",
    }),
    false,
  )
})

test("explicit source deletion and destination writing denies override broad transfer permissions", () => {
  const policy: ConsolePolicy = {
    Version: "2012-10-17",
    Statement: [
      { Effect: "Allow", Action: ["s3:*"], Resource: ["arn:aws:s3:::*/*"] },
      { Effect: "Deny", Action: ["s3:DeleteObject"], Resource: ["arn:aws:s3:::source-bucket/original/report.txt"] },
      { Effect: "Deny", Action: ["s3:PutObject"], Resource: ["arn:aws:s3:::destination-bucket/archive/report.txt"] },
    ],
  }

  assert.equal(hasConsoleCapability(policy, "objects.copy", sourceContext), true)
  assert.equal(hasConsoleCapability(policy, "objects.move", sourceContext), false)
  assert.equal(hasConsoleCapability(policy, "objects.transferDestination", destinationContext), false)
})

test("an exact destination allow preserves a leading slash in the object key", () => {
  const policy: ConsolePolicy = {
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow", Action: ["s3:PutObject"], Resource: ["arn:aws:s3:::target-bucket//report.txt"] }],
  }

  assert.equal(
    hasConsoleCapability(policy, "objects.transferDestination", {
      bucket: "target-bucket",
      objectKey: "/report.txt",
    }),
    true,
  )
})

test("an exact leading-slash destination deny overrides an allow for all objects in the bucket", () => {
  const policy: ConsolePolicy = {
    Version: "2012-10-17",
    Statement: [
      { Effect: "Allow", Action: ["s3:PutObject"], Resource: ["arn:aws:s3:::target-bucket/*"] },
      { Effect: "Deny", Action: ["s3:PutObject"], Resource: ["arn:aws:s3:::target-bucket//report.txt"] },
    ],
  }

  assert.equal(
    hasConsoleCapability(policy, "objects.transferDestination", {
      bucket: "target-bucket",
      objectKey: "/report.txt",
    }),
    false,
  )
})
