import test from "node:test"
import assert from "node:assert/strict"
import type { TableBucketInfo } from "../../hooks/use-table-catalog"
import type { DialogOptions } from "../../lib/feedback/dialog"
import { confirmTableBucketDisable } from "../../lib/table-catalog-disable"
import { runDialogAction } from "../../lib/feedback/dialog-action"

function bucketInfo(bucket = "analytics"): TableBucketInfo {
  return {
    tableBucket: bucket,
    enabled: true,
    disableSupported: true,
    catalogType: "iceberg",
    warehouse: bucket,
    warehouseLocation: `s3://${bucket}/`,
    catalogUri: `/iceberg/v1/${bucket}`,
    compatCatalogUri: `/_iceberg/v1/${bucket}`,
    credentialVending: "unsupported",
    credentialScope: "warehouse-prefix",
    credentialScopePrefix: `s3://${bucket}/`,
    catalogEntryPresent: true,
    properties: {},
  }
}

function setup(overrides: { bucket?: string; canManage?: boolean; info?: TableBucketInfo | undefined } = {}) {
  const state: Record<string, TableBucketInfo> = { analytics: bucketInfo(), other: bucketInfo("other") }
  const requests: string[] = []
  const errors: string[] = []
  const successes: string[] = []
  const dialogs: DialogOptions[] = []
  const pendingIds = new Set<string>()
  let closeCalls = 0
  let respond: (bucket: string) => Promise<TableBucketInfo> = async (bucket) => ({ ...state[bucket], enabled: false })
  confirmTableBucketDisable({
    bucket: "analytics",
    canManage: true,
    info: state.analytics,
    ...overrides,
    disable: (bucket) => {
      requests.push(bucket)
      return respond(bucket)
    },
    onDisabled: (bucket, info) => {
      state[bucket] = info
    },
    dialog: { warning: (options) => dialogs.push(options) },
    message: { success: (text) => successes.push(text), error: (text) => errors.push(text) },
    t: (key) => key,
  })
  return {
    state,
    requests,
    errors,
    successes,
    dialogs,
    pendingIds,
    get closeCalls() {
      return closeCalls
    },
    setResponse: (response: typeof respond) => {
      respond = response
    },
    submit: () =>
      runDialogAction({
        dialogId: "disable",
        pendingIds,
        setPendingIds: () => {},
        action: dialogs[0]?.onPositiveClick,
        close: () => {
          closeCalls += 1
        },
      }),
  }
}

test("failed disable keeps the bucket enabled and dialog open, then retries the same action successfully", async () => {
  const flow = setup()
  const initial = flow.state.analytics
  flow.setResponse(async () => {
    throw new Error("Catalog is not empty")
  })
  assert.equal(await flow.submit(), false)
  assert.equal(flow.state.analytics, initial)
  assert.equal(flow.closeCalls, 0)
  assert.equal(flow.pendingIds.size, 0)
  assert.deepEqual(flow.errors, ["Catalog is not empty"])
  assert.deepEqual(flow.successes, [])

  flow.setResponse(async (bucket) => ({ ...flow.state[bucket], enabled: false }))
  assert.equal(await flow.submit(), true)
  assert.equal(flow.state.analytics.enabled, false)
  assert.equal(flow.state.other.enabled, true)
  assert.equal(flow.closeCalls, 1)
  assert.deepEqual(flow.requests, ["analytics", "analytics"])
  assert.deepEqual(flow.successes, ["Table bucket disabled"])
})

test("pending disable preserves state and prevents duplicate requests until the response arrives", async () => {
  const flow = setup()
  let resolveResponse!: (info: TableBucketInfo) => void
  flow.setResponse(
    () =>
      new Promise((resolve) => {
        resolveResponse = resolve
      }),
  )
  const pending = flow.submit()
  assert.equal(flow.state.analytics.enabled, true)
  assert.equal(flow.closeCalls, 0)
  assert.equal(await flow.submit(), false)
  assert.deepEqual(flow.requests, ["analytics"])
  resolveResponse({ ...flow.state.analytics, enabled: false })
  await pending
  assert.equal(flow.state.analytics.enabled, false)
  assert.equal(flow.closeCalls, 1)
})

for (const [name, overrides] of [
  ["missing management permission", { canManage: false }],
  ["unsupported server capability", { info: { ...bucketInfo(), disableSupported: false } }],
  ["disabled bucket", { info: { ...bucketInfo(), enabled: false } }],
  ["unknown bucket status", { info: undefined }],
  ["missing bucket selection", { bucket: "" }],
] as const) {
  test(`disable with ${name} opens no dialog and sends no request`, () => {
    const flow = setup(overrides)
    assert.deepEqual(flow.dialogs, [])
    assert.deepEqual(flow.requests, [])
    assert.equal(flow.state.analytics.enabled, true)
  })
}

test("disable confirmation names the bucket and warns about lifecycle expiration", () => {
  const flow = setup()
  assert.match(flow.dialogs[0].content ?? "", /^analytics: .*expiration can resume and delete objects/)
  assert.deepEqual(flow.requests, [])
})
