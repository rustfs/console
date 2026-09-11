import test from "node:test"
import assert from "node:assert/strict"
import { DeleteObjectsCommand, ListObjectsV2Command, ListObjectVersionsCommand, S3Client } from "@aws-sdk/client-s3"
import type { HttpRequest } from "@aws-sdk/types"
import { createDeleteTaskHelpers, type DeleteTask } from "../../lib/delete-task"
import { resolveBucketVersioningState, shouldDeleteAllVersions } from "../../lib/object-delete"
import { TaskManager } from "../../lib/task-manager"

async function waitForTaskStatus(task: DeleteTask, status: DeleteTask["status"]) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (task.status === status) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  assert.fail(`Timed out waiting for delete task to become ${status}`)
}

for (const [name, status, deleteAllVersions, expectedForceDelete] of [
  ["unversioned object", undefined, false, false],
  ["versioning-suspended object", "Suspended", false, false],
  ["versioned object", "Enabled", false, false],
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
      deleteAllVersions: shouldDeleteAllVersions(resolveBucketVersioningState(status), deleteAllVersions),
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

test("all-version file deletion paginates exact versions and markers without deleting colliding keys", async (t) => {
  const key = "folder/空间/%2F.txt"
  const encodedKey = encodeURIComponent(key)
  const requests: HttpRequest[] = []
  const deletedBatches: string[][] = []
  let listCalls = 0
  const client = new S3Client({
    region: "us-east-1",
    endpoint: "http://127.0.0.1:9000",
    forcePathStyle: true,
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
    requestHandler: {
      async handle(request: HttpRequest) {
        requests.push(request)
        assert.equal(
          Object.keys(request.headers).some((name) => /^(x-rustfs|x-minio)-force-delete$/i.test(name)),
          false,
        )
        let body: string
        if (request.method === "GET") {
          assert.equal(request.query?.prefix, key)
          assert.equal(request.query?.versions, "")
          listCalls++
          if (listCalls === 1) {
            body = `<ListVersionsResult><EncodingType>url</EncodingType><IsTruncated>true</IsTruncated><NextKeyMarker>${encodedKey}</NextKeyMarker><NextVersionIdMarker>v999</NextVersionIdMarker>${Array.from({ length: 1000 }, (_, i) => `<Version><Key>${encodedKey}</Key><VersionId>v${i}</VersionId></Version>`).join("")}</ListVersionsResult>`
          } else {
            assert.equal(listCalls, 2)
            assert.equal(request.query?.["key-marker"], key)
            assert.equal(request.query?.["version-id-marker"], "v999")
            body = `<ListVersionsResult><EncodingType>url</EncodingType><IsTruncated>true</IsTruncated><NextKeyMarker>${encodedKey}%2Fchild</NextKeyMarker><Version><Key>${encodedKey}</Key><VersionId>null</VersionId></Version><DeleteMarker><Key>${encodedKey}</Key><VersionId>marker</VersionId></DeleteMarker><Version><Key>${encodedKey}%2Fchild</Key><VersionId>child-version</VersionId></Version><Version><Key>${encodedKey}-sibling</Key><VersionId>sibling-version</VersionId></Version></ListVersionsResult>`
          }
        } else {
          assert.equal(request.method, "POST")
          assert.equal(listCalls, 2, "enumeration finishes before any version is removed")
          const xml = String(request.body)
          const keys = [...xml.matchAll(/<Key>(.*?)<\/Key>/g)].map((match) => match[1])
          assert.ok(keys.every((value) => value === key))
          deletedBatches.push([...xml.matchAll(/<VersionId>(.*?)<\/VersionId>/g)].map((match) => match[1]))
          body = "<DeleteResult/>"
        }
        return { response: { statusCode: 200, headers: {}, body: new TextEncoder().encode(body) } }
      },
    },
  })
  t.after(() => client.destroy())
  const { handler, createTasks } = createDeleteTaskHelpers(client)
  const [task] = createTasks([key], "test-bucket", undefined, { deleteAllVersions: true })

  await handler.perform(task)

  assert.deepEqual(
    requests.map((request) => request.method),
    ["GET", "GET", "POST", "POST"],
  )
  assert.deepEqual(deletedBatches, [Array.from({ length: 1000 }, (_, i) => `v${i}`), ["null", "marker"]])
  assert.equal(task.progress, 100)
})

test("an explicit version selection never uses the recursive extension", async (t) => {
  const requests: HttpRequest[] = []
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
  const { handler, createVersionedTasks } = createDeleteTaskHelpers(client)
  const [task] = createVersionedTasks([{ key: "file.txt", versionId: "null" }], "test-bucket")
  await handler.perform(task)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].method, "DELETE")
  assert.equal(requests[0].query?.versionId, "null")
  assert.equal(
    Object.keys(requests[0].headers).some((name) => /force-delete/i.test(name)),
    false,
  )
})

test("all-version file deletion reports partial failures", async () => {
  const client = {
    send: async (command: unknown) => {
      if (command instanceof ListObjectVersionsCommand) {
        return { Versions: [{ Key: "file.txt", VersionId: "protected" }] }
      }
      assert.ok(command instanceof DeleteObjectsCommand)
      return { Errors: [{ Key: "file.txt", VersionId: "protected", Code: "AccessDenied" }] }
    },
  }
  const { handler, createTasks } = createDeleteTaskHelpers(client as unknown as S3Client)
  const [task] = createTasks(["file.txt"], "test-bucket", undefined, { deleteAllVersions: true })
  await assert.rejects(handler.perform(task), /AccessDenied/)
  assert.equal(task.progress, 0)
})

test("AccessDenied from version deletion fails without retrying", async (t) => {
  let deleteAttempts = 0
  const client = {
    send: async (command: unknown) => {
      if (command instanceof ListObjectVersionsCommand) {
        return { Versions: [{ Key: "file.txt", VersionId: "protected" }] }
      }
      assert.ok(command instanceof DeleteObjectsCommand)
      deleteAttempts += 1
      return { Errors: [{ Key: "file.txt", VersionId: "protected", Code: "AccessDenied" }] }
    },
  }
  const { handler, createTasks } = createDeleteTaskHelpers(client as unknown as S3Client, {
    maxRetries: 3,
    retryDelay: 0,
  })
  const [task] = createTasks(["file.txt"], "test-bucket", undefined, { deleteAllVersions: true })
  const manager = new TaskManager<DeleteTask>({ handlers: { delete: handler } })
  t.after(() => manager.dispose())

  manager.enqueue([task])
  await waitForTaskStatus(task, "failed")

  assert.equal(deleteAttempts, 1)
  assert.equal(task.retryCount, 0)
  assert.equal(task.error, "AccessDenied")
})

test("all-version file deletion fails before mutation when pagination does not advance", async () => {
  const client = {
    send: async (command: unknown) => {
      assert.ok(command instanceof ListObjectVersionsCommand)
      return {
        Versions: [{ Key: "file.txt", VersionId: "v1" }],
        IsTruncated: true,
        NextKeyMarker: "file.txt",
        NextVersionIdMarker: "v1",
      }
    },
  }
  const { handler, createTasks } = createDeleteTaskHelpers(client as unknown as S3Client)
  const [task] = createTasks(["file.txt"], "test-bucket", undefined, { deleteAllVersions: true })
  await assert.rejects(handler.perform(task), /did not advance/)
  assert.equal(task.progress, 0)
})

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
      forceDelete: shouldDeleteAllVersions(resolveBucketVersioningState(status), false),
    })

    await folderHandler.perform(task)

    assert.deepEqual(methods, ["GET", "POST"])
    assert.equal(task.progress, 100)
  })
}

for (const statusCode of [204, 403]) {
  test(`explicit all-versions folder deletion uses one prefix request and handles HTTP ${statusCode}`, async (t) => {
    const requests: HttpRequest[] = []
    const client = new S3Client({
      region: "us-east-1",
      endpoint: "http://127.0.0.1:9000",
      forcePathStyle: true,
      maxAttempts: 1,
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
      requestHandler: {
        async handle(request: HttpRequest) {
          requests.push(request)
          return {
            response: {
              statusCode,
              headers: {},
              body: new TextEncoder().encode(
                statusCode === 403 ? "<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>" : "",
              ),
            },
          }
        },
      },
    })
    t.after(() => client.destroy())
    const { folderHandler, createFolderDeleteTask } = createDeleteTaskHelpers(client)
    const task = createFolderDeleteTask("parent/空间/%2F+/", "test-bucket", { forceDelete: true })

    if (statusCode === 403) {
      await assert.rejects(folderHandler.perform(task), { name: "AccessDenied" })
      assert.equal(task.progress, 0)
    } else {
      await folderHandler.perform(task)
      assert.equal(task.progress, 100)
    }
    assert.equal(requests.length, 1)
    assert.equal(requests[0].method, "DELETE")
    assert.equal(requests[0].path, "/test-bucket/parent/%E7%A9%BA%E9%97%B4/%252F%2B/")
    assert.equal(requests[0].headers["X-Rustfs-Force-Delete"], "true")
    assert.equal(requests[0].query?.versionId, undefined)
  })
}

test("canceling a forced folder deletion aborts its single request", async (t) => {
  let requestStarted: () => void = () => {}
  const started = new Promise<void>((resolve) => {
    requestStarted = resolve
  })
  const client = new S3Client({
    region: "us-east-1",
    endpoint: "http://127.0.0.1:9000",
    forcePathStyle: true,
    maxAttempts: 1,
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
    requestHandler: {
      async handle(_request: HttpRequest, options?: { abortSignal?: AbortSignal }) {
        assert.ok(options?.abortSignal)
        requestStarted()
        return new Promise<never>((_resolve, reject) => {
          options.abortSignal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("Request aborted"), { name: "AbortError" }))
          })
        })
      },
    },
  })
  t.after(() => client.destroy())
  const { folderHandler, createFolderDeleteTask } = createDeleteTaskHelpers(client)
  const task = createFolderDeleteTask("folder/", "test-bucket", { forceDelete: true })
  const pending = folderHandler.perform(task)
  await started
  task.abortController?.abort()

  await assert.rejects(pending, { name: "AbortError" })
  assert.equal(task.progress, 0)
})

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
