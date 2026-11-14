import test from "node:test"
import assert from "node:assert/strict"
import {
  EffectivePermissionClient,
  permissionRequest,
  permissionCheckKey,
  type PermissionRequest,
} from "../../lib/effective-permissions"
import { capabilityCheckGroups, capabilityDecision, hasConsoleCapability } from "../../lib/permission-capabilities"
import { hasConsolePermission, hasConsoleScopes } from "../../lib/console-policy-parser"
import { permissionEndpoint } from "../../lib/permission-endpoint"

const check = { action: "s3:PutObject", context: { bucket: "alice-data", objectKey: "/private.txt" } }
const response = (requests: PermissionRequest[], decision = "allowed", potential?: boolean) => ({
  results: requests.map(({ id }) => ({ id, decision, ...(potential !== undefined && { potential }) })),
})
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

test("permission endpoint URLs retain reverse-proxy prefixes and support trailing slashes", () => {
  for (const suffix of ["", "/"]) {
    assert.equal(
      permissionEndpoint(`https://fixture.invalid/proxy/rustfs/admin/v3${suffix}`),
      "https://fixture.invalid/proxy/rustfs/admin/v4/account/permissions",
    )
  }
})

test("permission requests retain exact object keys and omit irrelevant prefix metadata", () => {
  assert.deepEqual(permissionRequest({ ...check, context: { ...check.context, prefix: "unrelated/" } }, "one"), {
    id: "one",
    action: "s3:PutObject",
    bucket: "alice-data",
    object: "/private.txt",
    authType: "REST-HEADER",
  })
})

test("unknown copy and conditional headers are distinct from headers the SDK explicitly omits", () => {
  const absent = { ...check, context: { ...check.context, copySource: null, ifMatch: null, ifNoneMatch: null } }
  assert.notEqual(permissionCheckKey(check), permissionCheckKey(absent))
  const request = permissionRequest(absent, "absent")
  assert.equal(request.copySource, null)
  assert.equal(request.ifMatch, null)
  assert.equal(request.ifNoneMatch, null)
  assert.equal(Object.hasOwn(permissionRequest(check, "unknown"), "copySource"), false)
})

test("multipart stages never reuse an ordinary object creation decision", () => {
  const staged = { ...check, context: { ...check.context, operation: "CreateMultipartUpload" as const } }
  const complete = { ...check, context: { ...check.context, operation: "CompleteMultipartUpload" as const } }
  assert.notEqual(permissionCheckKey(staged), permissionCheckKey(complete))
  assert.equal(permissionRequest(staged, "stage").operation, "CreateMultipartUpload")
})

test("retention and legal-hold decisions are not reused for a different submitted value", () => {
  const first = {
    action: "s3:PutObjectRetention",
    context: { ...check.context, retainUntilDate: "2026-12-01T00:00:00Z", retentionMode: "GOVERNANCE" as const },
  }
  const second = { ...first, context: { ...first.context, retainUntilDate: "2027-12-01T00:00:00Z" } }
  assert.notEqual(permissionCheckKey(first), permissionCheckKey(second))
  assert.equal(permissionRequest(first, "retention").retainUntilDate, first.context.retainUntilDate)
  assert.notEqual(
    permissionCheckKey({ action: "s3:PutObjectLegalHold", context: { ...check.context, legalHoldStatus: "ON" } }),
    permissionCheckKey({ action: "s3:PutObjectLegalHold", context: { ...check.context, legalHoldStatus: "OFF" } }),
  )
})

test("tag decisions include the exact set and do not depend on object insertion order", () => {
  const first = { ...check, context: { ...check.context, requestTags: { owner: "alice", team: "storage" } } }
  const reordered = { ...check, context: { ...check.context, requestTags: { team: "storage", owner: "alice" } } }
  assert.equal(permissionCheckKey(first), permissionCheckKey(reordered))
  assert.notEqual(
    permissionCheckKey(first),
    permissionCheckKey({ ...check, context: { ...check.context, requestTags: {} } }),
  )
})

test("render queries share one request and use the returned decision", async () => {
  const calls: PermissionRequest[][] = []
  const client = new EffectivePermissionClient(
    async (requests) => {
      calls.push(requests)
      return response(requests)
    },
    () => {},
  )
  const first = client.load(check)
  const second = client.load(check)
  assert.equal(first, second)
  assert.equal((await first).decision, "allowed")
  await client.load(check)
  assert.equal(calls.length, 1)
})

test("large tables are queried in bounded batches without omitting rows", async () => {
  const sizes: number[] = []
  const client = new EffectivePermissionClient(
    async (requests) => {
      sizes.push(requests.length)
      return response(requests)
    },
    () => {},
  )
  const results = await Promise.all(
    Array.from({ length: 130 }, (_, i) =>
      client.load({ ...check, context: { ...check.context, objectKey: `${i}.txt` } }),
    ),
  )
  assert.deepEqual(sizes, [64, 64, 2])
  assert.equal(results.filter(({ decision }) => decision === "allowed").length, 130)
})

test("visible lists retain more decisions than the idle cache limit without re-querying each render", async () => {
  let count = 0
  const client = new EffectivePermissionClient(
    async (requests) => {
      count += requests.length
      return response(requests)
    },
    () => {},
  )
  const checks = Array.from({ length: 3001 }, (_, i) => ({
    ...check,
    context: { ...check.context, objectKey: `${i}.txt` },
  }))
  const release = client.pin(checks)
  await Promise.all(checks.map((entry) => client.load(entry)))
  await Promise.all(checks.map((entry) => client.load(entry)))
  assert.equal(count, checks.length)
  // A same-commit effect replacement must not temporarily evict visible decisions.
  release()
  const releaseNext = client.pin(checks)
  await Promise.resolve()
  await Promise.all(checks.map((entry) => client.load(entry)))
  assert.equal(count, checks.length)
  releaseNext()
  await Promise.resolve()
  assert.ok(checks.filter((entry) => client.peek(entry)).length <= 2048)
})

test("one consumer unmounting cannot evict another consumer's shared active checks", async () => {
  const client = new EffectivePermissionClient(
    async (requests) => response(requests),
    () => {},
  )
  const checks = Array.from({ length: 2200 }, (_, i) => ({
    ...check,
    context: { ...check.context, objectKey: `${i}.txt` },
  }))
  const first = client.pin(checks)
  const second = client.pin(checks)
  await Promise.all(checks.map((entry) => client.load(entry)))
  first()
  await Promise.resolve()
  assert.ok(checks.every((entry) => client.peek(entry)?.decision === "allowed"))
  second()
})

test("long UTF-8 object keys stay inside the server's body budget without losing checks", async () => {
  const batches: PermissionRequest[][] = []
  const client = new EffectivePermissionClient(
    async (requests) => {
      batches.push(requests)
      return response(requests)
    },
    () => {},
  )
  const results = await Promise.all(
    Array.from({ length: 64 }, (_, i) =>
      client.load({ ...check, context: { ...check.context, objectKey: `${"é".repeat(500)}${i}` } }),
    ),
  )
  assert.ok(batches.length > 1)
  assert.equal(results.filter(({ decision }) => decision === "allowed").length, 64)
  assert.ok(
    batches.every((requests) => new TextEncoder().encode(JSON.stringify({ checks: requests })).length <= 64 * 1024),
  )
})

test(
  "a check that exceeds the budget only after JSON framing cannot block later checks",
  { timeout: 1000 },
  async () => {
    const budget = 60 * 1024
    const baseBytes = new TextEncoder().encode(
      JSON.stringify(permissionRequest({ ...check, context: { ...check.context, objectKey: "" } }, "0")),
    ).length
    const oversized = { ...check, context: { ...check.context, objectKey: "x".repeat(budget - baseBytes) } }
    assert.equal(new TextEncoder().encode(JSON.stringify(permissionRequest(oversized, "0"))).length, budget)
    const requests: PermissionRequest[] = []
    const client = new EffectivePermissionClient(
      async (checks) => {
        requests.push(...checks)
        return response(checks)
      },
      () => {},
    )
    const results = await Promise.all([client.load(oversized), client.load(check)])
    assert.deepEqual(
      results.map((result) => result.decision),
      ["unknown", "allowed"],
    )
    assert.equal(requests.length, 1)
    assert.equal(client.hasPending(), false)
  },
)

test("submission queries do not reuse a pending render-time allowance", async () => {
  const renderResponse = deferred<unknown>()
  const submitResponse = deferred<unknown>()
  const requests: PermissionRequest[][] = []
  const client = new EffectivePermissionClient(
    (batch) => {
      requests.push(batch)
      return requests.length === 1 ? renderResponse.promise : submitResponse.promise
    },
    () => {},
  )
  const render = client.load(check)
  const submit = client.load(check, true)
  await Promise.resolve()
  renderResponse.resolve(response(requests[0]))
  await render
  await Promise.resolve()
  submitResponse.resolve(response(requests[1], "denied"))
  assert.equal((await submit).decision, "denied")
})

test("disposing an identity prevents its late response from populating another session", async () => {
  const pending = deferred<unknown>()
  let requests: PermissionRequest[] = []
  const client = new EffectivePermissionClient(
    (batch) => {
      requests = batch
      return pending.promise
    },
    () => {},
  )
  const result = client.load(check)
  await Promise.resolve()
  client.dispose()
  pending.resolve(response(requests))
  assert.equal((await result).decision, "unknown")
  assert.equal(client.peek(check), undefined)
})

test("a policy refresh invalidates an older response instead of restoring a stale grant", async () => {
  const pending = deferred<unknown>()
  let requests: PermissionRequest[] = []
  const client = new EffectivePermissionClient(
    (batch) => {
      requests = batch
      return pending.promise
    },
    () => {},
  )
  const result = client.load(check)
  await Promise.resolve()
  client.invalidate()
  pending.resolve(response(requests))
  assert.equal((await result).decision, "unknown")
  assert.equal(client.peek(check), undefined)
})

test("a Strict Mode replay cannot let an old response remove the replayed query", async () => {
  const firstResponse = deferred<unknown>()
  const replayResponse = deferred<unknown>()
  const requests: PermissionRequest[][] = []
  const client = new EffectivePermissionClient(
    (batch) => {
      requests.push(batch)
      return requests.length === 1 ? firstResponse.promise : replayResponse.promise
    },
    () => {},
  )
  const first = client.load(check)
  await Promise.resolve()
  client.dispose()
  client.activate()
  const replay = client.load(check)
  await Promise.resolve()
  firstResponse.resolve(response(requests[0]))
  await first
  assert.equal(client.hasPending(), true)
  replayResponse.resolve(response(requests[1], "denied"))
  assert.equal((await replay).decision, "denied")
})

for (const status of [401, 403, 500]) {
  test(`HTTP ${status} fails closed without selecting legacy policy fallback`, async () => {
    const client = new EffectivePermissionClient(
      async () => {
        throw Object.assign(new Error("unavailable"), { status })
      },
      () => {},
    )
    assert.equal((await client.load(check)).decision, "unknown")
    assert.equal(client.status, "unavailable")
  })
}

test("an absent endpoint selects explicit legacy compatibility", async () => {
  const client = new EffectivePermissionClient(
    async () => {
      throw Object.assign(new Error("missing"), { status: 404 })
    },
    () => {},
  )
  await client.load(check)
  assert.equal(client.status, "unsupported")
})

test("temporary transport failures recover after a bounded retry instead of permanently hiding controls", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] })
  let calls = 0
  const client = new EffectivePermissionClient(
    async (requests) => {
      if (++calls === 1) throw Object.assign(new Error("temporary"), { status: 503 })
      return response(requests)
    },
    () => {},
  )
  t.after(() => client.dispose())
  assert.equal((await client.load(check)).decision, "unknown")
  assert.equal((await client.load(check)).decision, "unknown")
  assert.equal(calls, 1)
  t.mock.timers.tick(1000)
  assert.equal((await client.load(check)).decision, "allowed")
  assert.equal(calls, 2)
})

test("a previously supported endpoint cannot fail open into legacy grants after a later 404", async () => {
  let calls = 0
  const client = new EffectivePermissionClient(
    async (requests) => {
      if (++calls > 1) throw Object.assign(new Error("temporary"), { status: 404 })
      return response(requests)
    },
    () => {},
  )
  await client.load(check)
  assert.equal((await client.load(check, true)).decision, "unknown")
  assert.equal(client.status, "unavailable")
  client.dispose()
})

test("a possible grant is discoverability only and cannot authorize an operation", async () => {
  const client = new EffectivePermissionClient(
    async (requests) => response(requests, "unknown", true),
    () => {},
  )
  const groups = capabilityCheckGroups("objects.upload", { bucket: "alice-data" })
  await Promise.all(groups.flatMap(({ checks }) => checks).map((entry) => client.load(entry)))
  assert.equal(
    capabilityDecision(groups, (entry) => client.peek(entry)),
    "unknown",
  )
})

for (const malformed of [
  { results: [] },
  {
    results: [
      { id: "0", decision: "allowed" },
      { id: "0", decision: "allowed" },
    ],
  },
  { results: [{ id: "0", decision: "allowed", potential: true }] },
  { results: [{ id: "0", decision: "unexpected" }] },
]) {
  test("malformed permission responses fail closed", async () => {
    const client = new EffectivePermissionClient(
      async () => malformed,
      () => {},
    )
    assert.equal((await client.load(check)).decision, "unknown")
    assert.equal(client.status, "unavailable")
  })
}

test("rename authorization targets the new key rather than its parent wildcard", () => {
  assert.deepEqual(
    capabilityCheckGroups("objects.rename", {
      bucket: "alice-data",
      objectKey: "source.txt",
      targetObjectKey: "/protected.txt",
    })
      .flatMap(({ checks }) => checks)
      .find(({ action }) => action === "s3:PutObject")?.context,
    {
      bucket: "alice-data",
      objectKey: "/protected.txt",
      authType: "REST-HEADER",
      operation: "CopyObject",
      ifMatch: null,
      ifNoneMatch: "*",
      copySource: { bucket: "alice-data", objectKey: "source.txt" },
    },
  )
})

test("an explicit null UUID copy source remains a versioned restore", () => {
  const groups = capabilityCheckGroups("objects.version.restore", {
    bucket: "alice-data",
    objectKey: "data.txt",
    versionId: "00000000-0000-0000-0000-000000000000",
  })
  assert.equal(groups[0].checks[0].action, "s3:GetObjectVersion")
  assert.deepEqual(groups[0].checks.find((check) => check.action === "s3:PutObject")?.context, {
    bucket: "alice-data",
    objectKey: "data.txt",
    authType: "REST-HEADER",
    operation: "CopyObject",
    ifMatch: null,
    ifNoneMatch: null,
    copySource: { bucket: "alice-data", objectKey: "data.txt", versionId: "00000000-0000-0000-0000-000000000000" },
  })
})

test("legacy null UUID preview and download use the current-object action omitted by the SDK", () => {
  const policy = {
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow" as const, Action: ["s3:GetObject"], Resource: ["arn:aws:s3:::alice-data/file.txt"] }],
  }
  const context = { bucket: "alice-data", objectKey: "file.txt", versionId: "00000000-0000-0000-0000-000000000000" }
  assert.equal(hasConsoleCapability(policy, "objects.version.download", context), true)
  assert.equal(hasConsoleCapability(policy, "objects.version.preview", context), true)
  assert.equal(hasConsoleCapability(policy, "objects.version.restore", context), false)
})

test("table-scoped admin permissions do not grant other warehouses in legacy mode", () => {
  const policy = {
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow" as const, Action: ["admin:DeleteTable"], Resource: ["arn:aws:s3:::one/*"] }],
  }
  assert.equal(hasConsolePermission(policy, "admin:DeleteTable", "arn:aws:s3:::two/namespaces/a/tables/b"), false)
})

test("legacy conditional grants cannot authorize a concrete mutation", () => {
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow" as const,
        Action: ["s3:PutObject"],
        Resource: ["*"],
        Condition: { StringEquals: { "jwt:preferred_username": "alice" } },
      },
    ],
  }
  assert.equal(hasConsolePermission(policy, "s3:PutObject", "arn:aws:s3:::alice-data/file.txt"), false)
})

test("the user editor requires the action used by set-user-status rather than an unused disable action", () => {
  const policy = (action: string) => ({
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow" as const, Action: ["admin:GetUser", action], Resource: ["*"] }],
  })
  assert.equal(hasConsoleCapability(policy("admin:DisableUser"), "users.edit"), false)
  assert.equal(hasConsoleCapability(policy("admin:EnableUser"), "users.edit"), true)
})

test("the corresponding narrow actions provide management page entry hints", () => {
  for (const [action, scope] of [
    ["admin:ListTier", "console:TieredStorage"],
    ["admin:GetBucketTarget", "console:EventDestinations"],
    ["admin:ExportIAM", "console:ImportExport"],
    ["kms:ListKeys", "console:SSESettings"],
  ]) {
    const policy = {
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow" as const, Action: [action], Resource: ["*"] }],
    }
    assert.equal(hasConsoleScopes(policy, [scope]), true, action)
  }
})
