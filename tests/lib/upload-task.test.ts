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
      { capability: "objects.upload", context: { bucket: "bucket", objectKey: "/protected.txt", requestTags: {} } },
    ])
    assert.deepEqual(commands, [])
  })
}

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
      if (command instanceof PutObjectCommand || command instanceof CreateMultipartUploadCommand)
        assert.equal(command.input.Tagging, undefined)
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
