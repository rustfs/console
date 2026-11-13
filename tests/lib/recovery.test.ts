import test from "node:test"
import assert from "node:assert/strict"
import { ApiClient } from "../../lib/api-client"
import { groupMrfResponsibilities, parseRecoveryReceipt, RecoveryClient, RecoveryError } from "../../lib/recovery"
import type { IntegrityJob, MrfAction, MrfObservation, MrfResponsibility, RecoveryReceipt } from "../../types/recovery"

const node = "a".repeat(64)
const id = "11111111-1111-1111-1111-111111111111"
const incarnation = "22222222-2222-2222-2222-222222222222"
const secondId = "33333333-3333-3333-3333-333333333333"

function row(overrides: Partial<MrfResponsibility> = {}): MrfResponsibility {
  return {
    responsibilityId: id,
    bucket: "bucket",
    object: "key",
    sourceBucketIncarnationId: incarnation,
    bucketIncarnationId: incarnation,
    versionId: null,
    poolIndex: 0,
    setIndex: 0,
    enqueuedAtMs: 10,
    status: "held_unverified_legacy",
    heldSinceMs: 20,
    accepted: null,
    ...overrides,
  }
}

function observed(
  reply: MrfObservation["nodes"][number]["reply"],
  overrides: Partial<MrfObservation> = {},
): MrfObservation {
  return {
    contractVersion: 1,
    topologyFingerprint: "topology",
    observationStartedAtMs: 10,
    observationFinishedAtMs: 20,
    expectedNodes: 1,
    pageComplete: true,
    nodes: [{ nodeId: node, host: "node.test", state: "ok", reply }],
    nextCursor: null,
    ...overrides,
  }
}

function summary(nextCursor: string | null = null): MrfObservation {
  return observed(
    {
      result: "summary",
      summary: {
        contractVersion: 1,
        sampledAtMs: 15,
        checkpointReadable: true,
        checkpointOwner: incarnation,
        checkpointSequence: 1,
        activeResponsibilityCount: 0,
        heldCount: 1,
        legacyGenerationUnknownCount: 0,
        bucketIncarnationChangedCount: 0,
        operatorAcceptedCount: 0,
        bestEffortQueueDepth: 0,
        responsibilityBytes: 512,
      },
    },
    { nextCursor },
  )
}

function list(rows: MrfResponsibility[], nextCursor: string | null = null): MrfObservation {
  return observed(
    {
      result: "list",
      observedAtMs: 15,
      snapshot: {
        contractVersion: 2,
        nodeLocal: true,
        checkpointOwner: incarnation,
        checkpointSequence: 1,
        heldCount: rows.length,
        legacyGenerationUnknownCount: 0,
        bucketIncarnationChangedCount: 0,
        operatorAcceptedCount: 0,
        responsibilities: rows,
      },
    },
    { nextCursor },
  )
}

function job(): IntegrityJob {
  return {
    format_version: 1,
    id,
    bucket: "bucket",
    bucket_incarnation: incarnation,
    request: {
      mode: "audit",
      items: [{ key: "key", version_id: null, expected_sha256: null, target_key: null }],
      bytes_per_second: 1024,
      max_object_bytes: 4096,
    },
    state: "paused",
    revision: 1,
    results: [
      {
        state: "pending",
        source_fingerprint: null,
        expected_sha256: null,
        evidence_source: null,
        source_size: null,
        target_version_id: null,
        detail: null,
      },
    ],
    last_error: null,
  }
}

function receipt(): RecoveryReceipt {
  return {
    format_version: 1,
    alias: "lab",
    endpoint: "https://server.test/proxy",
    job: job(),
    inventory_observed_at: "2026-11-13T01:00:00Z",
    inventory_bucket_incarnation: incarnation,
    digest_source_reference: null,
    qualification: null,
    readiness: null,
    estimate: {
      object_count: 1,
      inventory_selected_bytes: null,
      per_stream_bytes_per_second: 1024,
      stream_passes: 1,
      minimum_stream_seconds: null,
      peak_payload_staging_budget: 0,
      note: "Not an ETA",
    },
    query_command: ["rc", "admin"],
    resume_command: ["rc", "admin"],
  }
}

function client(fetcher: (input: string | Request, init?: RequestInit) => Promise<Response>, timeoutMs = 35_000) {
  return new RecoveryClient(
    new ApiClient({ fetch: fetcher }, { baseUrl: "https://server.test/proxy/rustfs/admin/v3" }),
    { timeoutMs },
  )
}

test("MRF reads preserve the proxy prefix, encode cursors, and load only one page", async () => {
  const requests: string[] = []
  const recovery = client(async (url) => {
    requests.push(String(url))
    return Response.json(summary("next"))
  })
  const value = await recovery.mrfSummary("a+b /?")
  assert.equal(recovery.endpoint, "https://server.test/proxy")
  assert.equal(value.nextCursor, "next")
  assert.deepEqual(requests, ["https://server.test/proxy/rustfs/admin/v4/heal/mrf/cluster?cursor=a%2Bb+%2F%3F"])
})

test("a repeated pagination cursor is rejected instead of looping", async () => {
  const recovery = client(async () => Response.json(list([row()], "same")))
  await assert.rejects(recovery.mrfList("same"), { code: "pagination" })
})

test("a missing responsibility stays not observed and does not become verified", async () => {
  const value = observed({ result: "get", observation: { contractVersion: 1, observedAtMs: 15, responsibility: null } })
  assert.deepEqual(await client(async () => Response.json(value)).mrfGet(node, id), value)
})

test("reads reject node, responsibility, and contract identity mismatches", async () => {
  for (const invalid of [
    observed({
      result: "get",
      observation: { contractVersion: 1, observedAtMs: 15, responsibility: row({ responsibilityId: secondId }) },
    }),
    { ...summary(), contractVersion: 2 },
    { ...summary(), nodes: [{ ...summary().nodes[0], nodeId: "b".repeat(64) }] },
  ]) {
    await assert.rejects(client(async () => Response.json(invalid)).mrfGet(node, id), RecoveryError)
  }
})

test("partial coverage is preserved and never normalized to a healthy empty cluster", async () => {
  const partial = observed(undefined, {
    pageComplete: false,
    nodes: [{ nodeId: node, host: "node.test", state: "timeout" }],
  })
  assert.deepEqual(await client(async () => Response.json(partial)).mrfSummary(), partial)
})

test("an unreadable checkpoint remains explicit without dropping other node observations", async () => {
  const response = summary()
  response.pageComplete = false
  response.nodes[0].state = "error"
  const reply = response.nodes[0].reply
  if (reply?.result === "summary") reply.summary.checkpointReadable = false
  response.expectedNodes = 2
  response.nodes.push({ ...summary().nodes[0], nodeId: "b".repeat(64) })
  assert.deepEqual(await client(async () => Response.json(response)).mrfSummary(), response)
})

test("failed nodes cannot smuggle incomplete summary or unchecked current responsibility data", async () => {
  for (const reply of [
    { result: "summary" },
    { result: "error" },
    { result: "get", observation: { contractVersion: 1, observedAtMs: 15, responsibility: row() } },
  ]) {
    const response = observed(reply as MrfObservation["nodes"][number]["reply"], { pageComplete: false })
    response.nodes[0].state = "error"
    await assert.rejects(client(async () => Response.json(response)).mrfSummary(), { code: "invalid-response" })
    await assert.rejects(client(async () => Response.json(response)).mrfGet(node, id), { code: "invalid-response" })
  }
})

test("safe failed-node codes remain available for operator diagnostics", async () => {
  const response = observed({ result: "error", code: "checkpoint_unreadable" }, { pageComplete: false })
  response.nodes[0].state = "error"
  assert.deepEqual(await client(async () => Response.json(response)).mrfSummary(), response)
})

test("a list response cannot exceed the requested per-node page budget", async () => {
  await assert.rejects(
    client(async () => Response.json(list([row(), row({ responsibilityId: secondId })]))).mrfList(undefined, 1),
    { code: "invalid-response" },
  )
})

test("grouping uses known source identity and exact version slots; unknown sources stay separate", () => {
  const rows = [
    row(),
    row({ responsibilityId: secondId }),
    row({ responsibilityId: "44444444-4444-4444-4444-444444444444", versionId: "null" }),
    row({ responsibilityId: "55555555-5555-5555-5555-555555555555", sourceBucketIncarnationId: null }),
    row({ responsibilityId: "66666666-6666-6666-6666-666666666666", sourceBucketIncarnationId: null }),
  ]
  const groups = groupMrfResponsibilities(list(rows))
  assert.deepEqual(
    groups.map((group) => [group.versionId, group.responsibilities.length]),
    [
      [null, 2],
      ["null", 1],
      [null, 1],
      [null, 1],
    ],
  )
})

test("actions require an exact retained, unverified receipt with the expected state", async () => {
  const action: MrfAction = {
    nodeId: node,
    request: { action: "recheck", responsibilityId: id, expectedBucketIncarnationId: incarnation },
  }
  const valid = observed({
    result: "action",
    action: { responsibilityId: id, state: "active", dataVerified: false, durableResponsibilityRetained: true },
  })
  assert.deepEqual(await client(async () => Response.json(valid)).mrfAction(action), valid)
  for (const change of [
    { state: "refreshed" },
    { dataVerified: true },
    { durableResponsibilityRetained: false },
    { responsibilityId: secondId },
  ]) {
    const response = observed({
      result: "action",
      action: {
        responsibilityId: id,
        state: "active",
        dataVerified: false,
        durableResponsibilityRetained: true,
        ...change,
      },
    } as MrfObservation["nodes"][number]["reply"])
    await assert.rejects(client(async () => Response.json(response)).mrfAction(action), {
      code: "invalid-response",
      outcomeUnknown: true,
    })
  }
})

test("mutation transport disables redirects and treats network failure as an unknown outcome", async () => {
  let redirect: RequestRedirect | undefined
  const recovery = client(async (_url, options) => {
    redirect = options?.redirect
    throw new TypeError("private endpoint details")
  })
  await assert.rejects(
    recovery.mrfAction({
      nodeId: node,
      request: { action: "refresh", responsibilityId: id, expectedBucketIncarnationId: null },
    }),
    { code: "network", outcomeUnknown: true },
  )
  assert.equal(redirect, "error")
})

test("receipt endpoint mismatches fail before any request, including a different proxy prefix", async () => {
  let calls = 0
  const recovery = client(async () => {
    calls++
    return Response.json(job())
  })
  for (const endpoint of [
    "https://other.test/proxy",
    "https://server.test/other",
    "https://user:secret@server.test/proxy",
    "https://server.test/proxy?token=secret",
  ]) {
    await assert.rejects(recovery.importReceipt({ ...receipt(), endpoint }), { code: "receipt-mismatch" })
  }
  assert.equal(calls, 0)
})

test("receipt import reads current state and binds request and incarnation without trusting saved status", async () => {
  const saved = receipt()
  saved.job.state = "completed"
  assert.equal((await client(async () => Response.json(job())).importReceipt(saved)).state, "paused")
  for (const current of [
    { ...job(), bucket_incarnation: secondId },
    { ...job(), request: { ...job().request, items: [{ ...job().request.items[0], version_id: "null" }] } },
  ]) {
    await assert.rejects(client(async () => Response.json(current)).importReceipt(saved), { code: "receipt-mismatch" })
  }
  assert.equal(parseRecoveryReceipt(saved, "https://server.test/proxy/").job.state, "completed")
})

test("job 404 and missing API 404 are distinct and never expose server text", async () => {
  await assert.rejects(
    client(
      async () => new Response("<Error><Code>NoSuchKey</Code><Message>secret body</Message></Error>", { status: 404 }),
    ).integrityJob("bucket", id),
    { code: "not-found" },
  )
  await assert.rejects(client(async () => new Response("secret body", { status: 404 })).integrityJob("bucket", id), {
    code: "unsupported",
  })
  await assert.rejects(
    client(async () => new Response("secret body", { status: 403 })).mrfSummary(),
    (error: unknown) => error instanceof RecoveryError && error.code === "denied" && !error.message.includes("secret"),
  )
})

test("rawResponse is opt-in and does not read or globally handle an error body", async () => {
  let handled = 0
  const response = new Response("arbitrary body", { status: 403 })
  const api = new ApiClient(
    { fetch: async () => response },
    {
      errorHandler: {
        handle401: async () => {
          handled++
        },
        handle403: async () => {
          handled++
        },
        handleServerError: async () => {},
        handleByStatus: async () => {},
      },
    },
  )
  assert.equal(await api.request("https://server.test", { rawResponse: true }, false), response)
  assert.equal(response.bodyUsed, false)
  assert.equal(handled, 0)
})

test("oversized responses are rejected and cancelled before an unbounded body read", async () => {
  let cancelled = false
  const recovery = client(
    async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true
          },
        }),
        { headers: { "content-length": String(8 * 1024 * 1024 + 1) } },
      ),
  )
  await assert.rejects(recovery.mrfSummary(), { code: "invalid-response" })
  assert.equal(cancelled, true)
})

test("chunked response limits include bodies without content-length", async () => {
  let cancelled = false
  const recovery = client(
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1))
          },
          cancel() {
            cancelled = true
          },
        }),
      ),
  )
  await assert.rejects(recovery.mrfSummary(), { code: "invalid-response" })
  assert.equal(cancelled, true)
})

test("total deadlines cover both missing headers and dripping bodies without mutation retry", async () => {
  for (const dripping of [false, true]) {
    let calls = 0
    let signal: AbortSignal | null | undefined
    let timer: ReturnType<typeof setInterval> | undefined
    const recovery = client(async (_url, options) => {
      calls++
      signal = options?.signal
      if (!dripping) return new Promise<Response>(() => {})
      return new Response(
        new ReadableStream({
          start(controller) {
            timer = setInterval(() => controller.enqueue(new TextEncoder().encode(" ")), 2)
          },
          cancel() {
            clearInterval(timer)
          },
        }),
      )
    }, 25)
    await assert.rejects(
      recovery.mrfAction({
        nodeId: node,
        request: { action: "refresh", responsibilityId: id, expectedBucketIncarnationId: null },
      }),
      { code: "timeout", outcomeUnknown: true },
    )
    clearInterval(timer)
    assert.equal(signal?.aborted, true)
    assert.equal(calls, 1)
  }
})

test("same-family requests cannot overlap and cancelled reads release their slot", async () => {
  let calls = 0
  const recovery = client(async () => {
    calls++
    return new Promise<Response>(() => {})
  })
  const controller = new AbortController()
  const pending = recovery.mrfSummary(undefined, controller.signal)
  await assert.rejects(recovery.mrfSummary(), { code: "busy" })
  controller.abort()
  await assert.rejects(pending, { code: "cancelled", outcomeUnknown: false })
  assert.equal(calls, 1)
})
