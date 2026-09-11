import test from "node:test"
import assert from "node:assert/strict"
import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3"
import type { HttpRequest } from "@aws-sdk/types"
import { createDeleteTaskHelpers } from "../../lib/delete-task"
import { resolveBucketVersioningState, shouldForceDeleteObjects } from "../../lib/object-delete"

for (const [name, status, deleteAllVersions, expectedForceDelete] of [
  ["unversioned object", undefined, false, false],
  ["versioning-suspended object", "Suspended", false, false],
  ["versioned object", "Enabled", false, false],
  ["explicit all-versions", "Enabled", true, true],
] as const) {
  test(`${name} deletion serializes the selected delete mode`, async (t) => {
    const requests: { method: string; path: string; headers: Record<string, string> }[] = []
    const client = new S3Client({
      region: "us-east-1",
      endpoint: "http://127.0.0.1:9000",
      forcePathStyle: true,
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
      requestHandler: {
        async handle(request: HttpRequest) {
          requests.push(request)
          return { response: { statusCode: 204, headers: {}, body: new Uint8Array() } }
        },
      },
    })
    t.after(() => client.destroy())
    const { handler, createTasks } = createDeleteTaskHelpers(client)
    const [task] = createTasks(["report.txt"], "test-bucket", "folder/", {
      forceDelete: shouldForceDeleteObjects(resolveBucketVersioningState(status), deleteAllVersions),
    })

    await handler.perform(task)

    assert.equal(requests.length, 1)
    assert.equal(requests[0].method, "DELETE")
    assert.equal(requests[0].path, "/test-bucket/folder/report.txt")
    const forceDeleteHeaders = Object.entries(requests[0].headers).filter(([name]) =>
      /^(x-rustfs|x-minio)-force-delete$/i.test(name),
    )
    assert.deepEqual(
      forceDeleteHeaders.map(([, value]) => value),
      expectedForceDelete ? ["true"] : [],
    )
    assert.equal(task.progress, 100)
  })
}

for (const status of [undefined, "Suspended"]) {
  test(`ordinary folder deletion uses standard listing and batch deletion when versioning is ${status ?? "unset"}`, async (t) => {
    const methods: string[] = []
    const client = new S3Client({
      region: "us-east-1",
      endpoint: "http://127.0.0.1:9000",
      forcePathStyle: true,
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
      requestHandler: {
        async handle(request: HttpRequest) {
          methods.push(request.method)
          assert.equal(
            Object.keys(request.headers).some((name) => /^(x-rustfs|x-minio)-force-delete$/i.test(name)),
            false,
          )
          if (request.method === "GET") {
            assert.equal(request.query?.["list-type"], "2")
            assert.equal(request.query?.prefix, "folder/")
            return {
              response: {
                statusCode: 200,
                headers: {},
                body: new TextEncoder().encode(
                  "<ListBucketResult><IsTruncated>false</IsTruncated><Contents><Key>folder/report.txt</Key></Contents></ListBucketResult>",
                ),
              },
            }
          }
          assert.equal(request.method, "POST")
          assert.match(String(request.body), /<Key>folder\/report\.txt<\/Key>/)
          return {
            response: { statusCode: 200, headers: {}, body: new TextEncoder().encode("<DeleteResult/>") },
          }
        },
      },
    })
    t.after(() => client.destroy())
    const { folderHandler, createFolderDeleteTask } = createDeleteTaskHelpers(client)
    const task = createFolderDeleteTask("folder/", "test-bucket", {
      forceDelete: shouldForceDeleteObjects(resolveBucketVersioningState(status), false),
    })

    await folderHandler.perform(task)

    assert.deepEqual(methods, ["GET", "POST"])
    assert.equal(task.progress, 100)
  })
}

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
