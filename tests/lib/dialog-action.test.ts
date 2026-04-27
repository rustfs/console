import test from "node:test"
import assert from "node:assert/strict"

import { runDialogAction } from "../../lib/feedback/dialog-action.js"

test("runDialogAction ignores duplicate submissions while the current action is pending", async () => {
  const pendingIds = new Set<string>()
  const pendingSnapshots: string[][] = []
  let actionCalls = 0
  let closeCalls = 0
  let resolveAction: (() => void) | undefined

  const firstRun = runDialogAction({
    dialogId: "dialog-1",
    pendingIds,
    setPendingIds: (nextPendingIds) => {
      pendingSnapshots.push(Array.from(nextPendingIds))
    },
    action: () =>
      new Promise<void>((resolve) => {
        actionCalls += 1
        resolveAction = resolve
      }),
    close: () => {
      closeCalls += 1
    },
  })

  const duplicateRunStarted = await runDialogAction({
    dialogId: "dialog-1",
    pendingIds,
    setPendingIds: () => {},
    action: () => {
      actionCalls += 1
    },
    close: () => {
      closeCalls += 1
    },
  })

  assert.equal(duplicateRunStarted, false)
  assert.equal(actionCalls, 1)
  assert.equal(closeCalls, 0)

  resolveAction?.()
  const firstRunStarted = await firstRun

  assert.equal(firstRunStarted, true)
  assert.equal(closeCalls, 1)
  assert.deepEqual(pendingSnapshots, [["dialog-1"], []])
  assert.equal(pendingIds.size, 0)
})

test("runDialogAction keeps the dialog open when the action explicitly returns false", async () => {
  const pendingIds = new Set<string>()
  const pendingSnapshots: string[][] = []
  let closeCalls = 0

  const started = await runDialogAction({
    dialogId: "dialog-2",
    pendingIds,
    setPendingIds: (nextPendingIds) => {
      pendingSnapshots.push(Array.from(nextPendingIds))
    },
    action: async () => false,
    close: () => {
      closeCalls += 1
    },
  })

  assert.equal(started, true)
  assert.equal(closeCalls, 0)
  assert.deepEqual(pendingSnapshots, [["dialog-2"], []])
  assert.equal(pendingIds.size, 0)
})
