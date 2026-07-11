import test from "node:test"
import assert from "node:assert/strict"
import {
  AbortMultipartUploadCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  type S3Client,
} from "@aws-sdk/client-s3"
import { createUploadTaskHelpers } from "../../lib/upload-task"

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
