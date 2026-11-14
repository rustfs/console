import test from "node:test"
import assert from "node:assert/strict"
import {
  AbortMultipartUploadCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  PutObjectCommand,
  UploadPartCommand,
  type S3Client,
} from "@aws-sdk/client-s3"
import { createUploadTaskHelpers } from "../../lib/upload-task"
import type { PermissionResourceContext } from "../../lib/permission-resources"

for (const [name, chunkSize] of [
  ["ordinary", 5],
  ["multipart", 0.000001],
] as const) {
  test(`${name} upload checks the exact selected key before its first write`, async () => {
    const commands: unknown[] = []
    const checks: unknown[] = []
    const client = {
      send: async (command: unknown) => {
        commands.push(command)
        return {}
      },
    }
    const { handler, createTasks } = createUploadTaskHelpers(client as unknown as S3Client, {
      chunkSize,
      checkCapability: async (capability, context) => {
        checks.push({ capability, context })
        return false
      },
    })
    const [task] = createTasks([{ file: new File(["content"], "file.txt"), key: "/protected.txt" }], "bucket")
    await assert.rejects(handler.perform(task), /Access Denied/)
    assert.deepEqual(checks, [
      {
        capability: "objects.upload",
        context: {
          bucket: "bucket",
          objectKey: "/protected.txt",
          authType: "REST-HEADER",
          operation: name === "ordinary" ? "PutObject" : "CreateMultipartUpload",
          requestTags: {},
          copySource: null,
          ifMatch: null,
          ifNoneMatch: null,
        },
      },
    ])
    assert.deepEqual(commands, [])
  })
}

test("multipart upload freshly authorizes each real SDK phase with known absent headers", async () => {
  const events: { operation: string; kind: "authorize" | "send" }[] = []
  const checks: PermissionResourceContext[] = []
  const client = {
    send: async (command: unknown) => {
      events.push({ kind: "send", operation: command!.constructor.name.replace(/Command$/, "") })
      if (command instanceof CreateMultipartUploadCommand) return { UploadId: "upload" }
      if (command instanceof UploadPartCommand) return { ETag: `part-${command.input.PartNumber}` }
      if (command instanceof CompleteMultipartUploadCommand) return {}
      throw new Error("Unexpected command")
    },
  }
  const { handler, createTasks } = createUploadTaskHelpers(client as unknown as S3Client, {
    chunkSize: 2 / 1024 ** 2,
    checkCapability: async (capability, context) => {
      assert.equal(capability, "objects.upload")
      events.push({ kind: "authorize", operation: context.operation! })
      checks.push(context)
      return true
    },
  })
  const [task] = createTasks([{ file: new File(["abcd"], "file.txt"), key: "/protected.txt" }], "bucket")
  await handler.perform(task)
  assert.deepEqual(
    events,
    ["CreateMultipartUpload", "UploadPart", "UploadPart", "CompleteMultipartUpload"].flatMap((operation) => [
      { kind: "authorize", operation },
      { kind: "send", operation },
    ]),
  )
  for (const context of checks)
    assert.deepEqual(context, {
      bucket: "bucket",
      objectKey: "/protected.txt",
      authType: "REST-HEADER",
      operation: context.operation,
      requestTags: {},
      copySource: null,
      ifMatch: null,
      ifNoneMatch: null,
    })
})

for (const deniedStage of ["CreateMultipartUpload", "UploadPart", "CompleteMultipartUpload"] as const) {
  test(`a fresh ${deniedStage} denial stops its SDK write and cleans up any active upload`, async () => {
    const commands: string[] = []
    let uploadedParts = 0
    const client = {
      send: async (command: unknown) => {
        commands.push(command!.constructor.name)
        if (command instanceof CreateMultipartUploadCommand) return { UploadId: "upload" }
        if (command instanceof UploadPartCommand) {
          uploadedParts++
          return { ETag: "part" }
        }
        if (command instanceof AbortMultipartUploadCommand) return {}
        throw new Error("A denied write was sent")
      },
    }
    const { handler, createTasks } = createUploadTaskHelpers(client as unknown as S3Client, {
      chunkSize: 2 / 1024 ** 2,
      checkCapability: async (_capability, context) =>
        context.operation !== deniedStage || (deniedStage === "UploadPart" && uploadedParts === 0),
    })
    const [task] = createTasks([{ file: new File(["abcd"], "file.txt"), key: "file.txt" }], "bucket")
    await assert.rejects(handler.perform(task), /Access Denied/)
    assert.equal(handler.shouldRetry?.(task, new Error("Access Denied")), false)
    const expected =
      deniedStage === "CreateMultipartUpload"
        ? []
        : deniedStage === "UploadPart"
          ? ["CreateMultipartUploadCommand", "UploadPartCommand", "AbortMultipartUploadCommand"]
          : ["CreateMultipartUploadCommand", "UploadPartCommand", "UploadPartCommand", "AbortMultipartUploadCommand"]
    assert.deepEqual(commands, expected)
    assert.equal(task.uploadId, undefined)
    assert.equal(task.completedParts, undefined)
  })
}

for (const completedParts of [1, 2]) {
  test(`a resumed upload with ${completedParts} completed parts authorizes only its pending SDK stages`, async () => {
    const commands: string[] = []
    const checks: string[] = []
    const client = {
      send: async (command: unknown) => {
        commands.push(command!.constructor.name.replace(/Command$/, ""))
        if (command instanceof UploadPartCommand) return { ETag: "part" }
        if (command instanceof CompleteMultipartUploadCommand) return {}
        throw new Error("Unexpected command")
      },
    }
    const { handler, createTasks } = createUploadTaskHelpers(client as unknown as S3Client, {
      chunkSize: 2 / 1024 ** 2,
      checkCapability: async (_capability, context) => {
        checks.push(context.operation!)
        return true
      },
    })
    const [task] = createTasks([{ file: new File(["abcd"], "file.txt"), key: "file.txt" }], "bucket")
    task.uploadId = "resumed"
    task.completedParts = Array.from({ length: completedParts }, (_, index) => ({
      PartNumber: index + 1,
      ETag: `part-${index + 1}`,
    }))
    await handler.perform(task)
    const expected = completedParts === 1 ? ["UploadPart", "CompleteMultipartUpload"] : ["CompleteMultipartUpload"]
    assert.deepEqual(commands, expected)
    assert.deepEqual(checks, expected)
  })
}

test("canceling during a pending part permission check aborts the upload without sending the part", async () => {
  const permission = Promise.withResolvers<boolean>()
  const started = Promise.withResolvers<void>()
  const commands: string[] = []
  const client = {
    send: async (command: unknown) => {
      commands.push(command!.constructor.name)
      if (command instanceof CreateMultipartUploadCommand) return { UploadId: "upload" }
      if (command instanceof AbortMultipartUploadCommand) return {}
      throw new Error("A canceled write was sent")
    },
  }
  const { handler, createTasks } = createUploadTaskHelpers(client as unknown as S3Client, {
    chunkSize: 2 / 1024 ** 2,
    checkCapability: async (_capability, context) => {
      if (context.operation === "UploadPart") {
        started.resolve()
        return permission.promise
      }
      return true
    },
  })
  const [task] = createTasks([{ file: new File(["abcd"], "file.txt"), key: "file.txt" }], "bucket")
  const pending = handler.perform(task)
  await started.promise
  task.abortController!.abort()
  permission.resolve(true)
  await assert.rejects(pending, { name: "AbortError" })
  assert.deepEqual(commands, ["CreateMultipartUploadCommand", "AbortMultipartUploadCommand"])
})

for (const [name, chunkSize] of [
  ["ordinary", 5],
  ["multipart", 0.000001],
] as const) {
  test(`${name} untagged upload declares known absence of request tags and sends no tagging data`, async () => {
    const commands: unknown[] = []
    const client = {
      send: async (command: unknown) => {
        commands.push(command)
        if (command instanceof CreateMultipartUploadCommand) return { UploadId: "upload" }
        if (command instanceof UploadPartCommand) return { ETag: "part" }
        if (command instanceof PutObjectCommand || command instanceof CompleteMultipartUploadCommand) return {}
        throw new Error("Unexpected command")
      },
    }
    const { handler, createTasks } = createUploadTaskHelpers(client as unknown as S3Client, {
      chunkSize,
      checkCapability: async (_capability, context) =>
        context.requestTags !== undefined && Object.keys(context.requestTags).length === 0,
    })
    const [task] = createTasks([{ file: new File(["content"], "file.txt"), key: "file.txt" }], "bucket")
    await handler.perform(task)
    assert.ok(commands.length > 0)
    for (const command of commands) {
      if (
        command instanceof PutObjectCommand ||
        command instanceof CreateMultipartUploadCommand ||
        command instanceof UploadPartCommand ||
        command instanceof CompleteMultipartUploadCommand
      ) {
        for (const field of ["Tagging", "CopySource", "IfMatch", "IfNoneMatch"])
          assert.equal(Object.hasOwn(command.input, field), false)
      }
    }
    assert.equal(task.progress, 100)
  })
}

test("a canceled upload cannot start writing after a pending permission check succeeds", async () => {
  const permission = Promise.withResolvers<boolean>()
  const commands: unknown[] = []
  const client = {
    send: async (command: unknown) => {
      commands.push(command)
      return {}
    },
  }
  const { handler, createTasks } = createUploadTaskHelpers(client as unknown as S3Client, {
    checkCapability: () => permission.promise,
  })
  const [task] = createTasks([{ file: new File(["content"], "file.txt"), key: "file.txt" }], "bucket")
  const pending = handler.perform(task)
  task.abortController!.abort()
  permission.resolve(true)
  await assert.rejects(pending, { name: "AbortError" })
  assert.deepEqual(commands, [])
})

test("multipart cleanup clears aborted upload state before retry", async () => {
  const commands: string[] = []
  const client = {
    send: async (command: unknown) => {
      commands.push(command?.constructor.name ?? "unknown")
      if (command instanceof CreateMultipartUploadCommand) return { UploadId: "aborted-upload" }
      if (command instanceof UploadPartCommand) throw new Error("temporary network error")
      if (command instanceof AbortMultipartUploadCommand) return {}
      throw new Error("Unexpected command")
    },
  }
  const { handler, createTasks } = createUploadTaskHelpers(client as unknown as S3Client, { chunkSize: 0.000001 })
  const task = createTasks([{ file: new File(["content"], "file.txt"), key: "file.txt" }], "bucket")[0]
  assert.ok(task)

  await assert.rejects(handler.perform(task), /temporary network error/)

  assert.equal(task.uploadId, undefined)
  assert.equal(task.completedParts, undefined)
  assert.deepEqual(commands, ["CreateMultipartUploadCommand", "UploadPartCommand", "AbortMultipartUploadCommand"])
})

test("multipart cleanup resets local state when the abort request fails", async () => {
  const client = {
    send: async (command: unknown) => {
      if (command instanceof CreateMultipartUploadCommand) return { UploadId: "uncertain-upload" }
      if (command instanceof UploadPartCommand) throw new Error("original upload error")
      if (command instanceof AbortMultipartUploadCommand) throw new Error("cleanup error")
      throw new Error("Unexpected command")
    },
  }
  const { handler, createTasks } = createUploadTaskHelpers(client as unknown as S3Client, { chunkSize: 0.000001 })
  const task = createTasks([{ file: new File(["content"], "file.txt"), key: "file.txt" }], "bucket")[0]
  assert.ok(task)

  await assert.rejects(handler.perform(task), /original upload error/)

  assert.equal(task.uploadId, undefined)
  assert.equal(task.completedParts, undefined)
})

test("upload retry policy retries throttling but not authorization failures", () => {
  const client = { send: async () => ({}) }
  const { handler, createTasks } = createUploadTaskHelpers(client as unknown as S3Client)
  const task = createTasks([{ file: new File(["content"], "file.txt"), key: "file.txt" }], "bucket")[0]
  assert.ok(task)

  assert.equal(handler.shouldRetry?.(task, { $metadata: { httpStatusCode: 429 } }), true)
  assert.equal(handler.shouldRetry?.(task, { $metadata: { httpStatusCode: 403 } }), false)
})
