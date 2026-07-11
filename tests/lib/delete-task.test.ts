import test from "node:test"
import assert from "node:assert/strict"
import { DeleteObjectsCommand, ListObjectsV2Command, type S3Client } from "@aws-sdk/client-s3"
import { createDeleteTaskHelpers } from "../../lib/delete-task"

test("folder deletion rejects partial DeleteObjects failures", async () => {
  const client = {
    send: async (command: unknown) => {
      if (command instanceof ListObjectsV2Command) {
        return { Contents: [{ Key: "folder/locked.txt" }], IsTruncated: false }
      }
      if (command instanceof DeleteObjectsCommand) {
        return {
          Errors: [{ Key: "folder/locked.txt", Code: "AccessDenied", Message: "Object is locked" }],
        }
      }
      throw new Error("Unexpected command")
    },
  }
  const { folderHandler, createFolderDeleteTask } = createDeleteTaskHelpers(client as unknown as S3Client)
  const task = createFolderDeleteTask("folder/", "bucket")

  await assert.rejects(folderHandler.perform(task), /Object is locked/)
  assert.equal(task.progress, 0)
})
