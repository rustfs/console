import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const loadStateModule = () => import(new URL("../../lib/event-destinations-state.ts", import.meta.url).href)

test("target-list notify state accepts only literal booleans", async () => {
  const { readTargetListNotifyState } = await loadStateModule()

  for (const [value, expected] of [
    [true, true],
    [false, false],
    [undefined, undefined],
    [null, undefined],
    ["true", undefined],
    [1, undefined],
  ] as const) {
    assert.deepEqual(readTargetListNotifyState({ notify_enabled: value }), {
      present: true,
      value: expected,
    })
  }
})

test("target-list notify state falls back only when the field is absent", async () => {
  const { readTargetListNotifyState, resolveEventDestinationsNotifyState } = await loadStateModule()
  let fallbackCalls = 0

  assert.deepEqual(readTargetListNotifyState({ notification_endpoints: [] }), {
    present: false,
    value: undefined,
  })
  assert.equal(
    await resolveEventDestinationsNotifyState({ notification_endpoints: [] }, async () => {
      fallbackCalls += 1
      return { notify_enabled: true }
    }),
    true,
  )
  assert.equal(
    await resolveEventDestinationsNotifyState({ notify_enabled: null }, async () => {
      fallbackCalls += 1
      return { notify_enabled: true }
    }),
    undefined,
  )
  assert.equal(fallbackCalls, 1)
})

test("module-switch authorization and network failures remain unknown", async () => {
  const { resolveEventDestinationsNotifyState } = await loadStateModule()

  for (const failure of [new Error("403"), new Error("network unavailable")]) {
    assert.equal(
      await resolveEventDestinationsNotifyState({}, async () => {
        throw failure
      }),
      undefined,
    )
  }
  assert.equal(await resolveEventDestinationsNotifyState({}, async () => ({ notify_enabled: "true" })), undefined)
})

test("destination writes require trusted notify and list state", async () => {
  const { canManageEventDestinations } = await loadStateModule()
  const trusted = {
    notifyEnabled: true,
    loading: false,
    loadFailed: false,
    notifyFailed: false,
  }

  assert.equal(canManageEventDestinations(trusted), true)
  assert.equal(canManageEventDestinations({ ...trusted, notifyEnabled: false }), false)
  assert.equal(canManageEventDestinations({ ...trusted, notifyEnabled: undefined }), false)
  assert.equal(canManageEventDestinations({ ...trusted, loading: true }), false)
  assert.equal(canManageEventDestinations({ ...trusted, loadFailed: true }), false)
  assert.equal(canManageEventDestinations({ ...trusted, notifyFailed: true }), false)
})

test("list failure preserves trusted data and successful retry recovers", async () => {
  const { applyEventDestinationsLoadResult, initialEventDestinationsState } = await loadStateModule()
  const loaded = applyEventDestinationsLoadResult(initialEventDestinationsState, {
    ok: true,
    data: [{ account_id: "primary" }],
    notifyEnabled: true,
  })
  const failed = applyEventDestinationsLoadResult(loaded, { ok: false })
  const recovered = applyEventDestinationsLoadResult(failed, {
    ok: true,
    data: [{ account_id: "recovered" }],
    notifyEnabled: true,
  })

  assert.deepEqual(failed, {
    data: [{ account_id: "primary" }],
    loadFailed: true,
    notifyEnabled: undefined,
    notifyFailed: false,
  })
  assert.deepEqual(recovered, {
    data: [{ account_id: "recovered" }],
    loadFailed: false,
    notifyEnabled: true,
    notifyFailed: false,
  })
})

test("invalid or unavailable notify state remains unknown after a successful list", async () => {
  const { applyEventDestinationsLoadResult, initialEventDestinationsState } = await loadStateModule()

  assert.deepEqual(
    applyEventDestinationsLoadResult(initialEventDestinationsState, {
      ok: true,
      data: [{ account_id: "primary" }],
      notifyEnabled: undefined,
    }),
    {
      data: [{ account_id: "primary" }],
      loadFailed: false,
      notifyEnabled: undefined,
      notifyFailed: true,
    },
  )
})

test("destination page blocks duplicate refresh and does not render a failed first load as empty", async () => {
  const source = await readFile(new URL("../../app/(dashboard)/events-target/page.tsx", import.meta.url), "utf8")

  assert.match(source, /if \(loadingRef\.current\) return/)
  assert.match(source, /onClick=\{loadData\} disabled=\{loading\}/)
  assert.match(source, /data\.length > 0 \|\| !loadFailed/)
  assert.match(source, /useState\(true\)/)
})
