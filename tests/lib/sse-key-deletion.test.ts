import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import {
  buildImmediateKeyDeletionRequest,
  isImmediateKeyDeletionConfirmed,
  isKeyPendingDeletion,
} from "../../lib/sse/key-deletion"

const page = fs.readFileSync("app/(dashboard)/sse/page.tsx", "utf8")
const hook = fs.readFileSync("hooks/use-sse.ts", "utf8")

test("only a key scheduled for deletion counts as pending deletion", () => {
  assert.equal(isKeyPendingDeletion("PendingDeletion"), true)
  assert.equal(isKeyPendingDeletion("pendingdeletion"), true)
  for (const status of ["Active", "Enabled", "Disabled", "Deleted", "", null, undefined]) {
    assert.equal(isKeyPendingDeletion(status), false, String(status))
  }
})

test("immediate deletion is confirmed only by the exact key ID", () => {
  assert.equal(isImmediateKeyDeletionConfirmed("key-a", "key-a"), true)
  for (const typed of ["", "key-A", "key-a ", " key-a", "key-ab"]) {
    assert.equal(isImmediateKeyDeletionConfirmed("key-a", typed), false, JSON.stringify(typed))
  }
  assert.equal(isImmediateKeyDeletionConfirmed("", ""), false)
})

test("immediate deletion request carries the typed confirmation in the body", () => {
  assert.deepEqual(buildImmediateKeyDeletionRequest("key-a", "key-a"), {
    key_id: "key-a",
    force_immediate: true,
    confirm_key_id: "key-a",
  })
})

test("immediate deletion is sent as a JSON body and never as a query string", () => {
  assert.match(
    hook,
    /api\.delete\("\/kms\/keys\/delete", \{\s*body: buildImmediateKeyDeletionRequest\(keyId, confirmKeyId\),/,
  )
  assert.doesNotMatch(hook, /queryParams\.append\("force_immediate"/)
})

test("Delete Immediately is offered only for keys pending deletion and needs the typed key ID", () => {
  const offers = [...page.matchAll(/setPendingKeyAction\(\{ type: "forceDelete", key \}\)/g)]
  assert.equal(offers.length, 2)
  assert.match(page, /\{isPendingDeletion \? \(\s*<Button\s+type="button"\s+variant="destructive"/)
  assert.match(
    page,
    /\{isPendingDeletion && \(\s*<>[\s\S]*?type: "cancelDeletion"[\s\S]*?<DropdownMenuSeparator \/>[\s\S]*?type: "forceDelete"[\s\S]*?<\/>\s*\)\}/,
  )
  assert.match(page, /id="confirmKeyId"/)
  assert.match(page, /!isImmediateKeyDeletionConfirmed\(pendingKeyAction\.key\.key_id, confirmKeyId\)/)
  assert.match(page, /forceDeleteKey\(pendingKeyAction\.key\.key_id, confirmKeyId\)/)
  assert.match(page, /setConfirmKeyId\(""\)\s+setPendingKeyActionState\(action\)/)
})
