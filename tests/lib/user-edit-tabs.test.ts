import test from "node:test"
import assert from "node:assert/strict"
import { getAvailableUserEditTabs } from "../../lib/user-edit-tabs.js"

test("getAvailableUserEditTabs includes access-keys when the user can manage service accounts", () => {
  assert.deepEqual(
    getAvailableUserEditTabs({
      canEditAccount: true,
      canAssignGroups: true,
      canEditPolicies: true,
      canManageAccessKeys: true,
    }),
    ["account", "groups", "policy", "access-keys"],
  )
})

test("getAvailableUserEditTabs omits access-keys when the user lacks service account permissions", () => {
  assert.deepEqual(
    getAvailableUserEditTabs({
      canEditAccount: true,
      canAssignGroups: true,
      canEditPolicies: true,
      canManageAccessKeys: false,
    }),
    ["account", "groups", "policy"],
  )
})
