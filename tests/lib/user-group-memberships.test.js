import test from "node:test"
import assert from "node:assert/strict"

import { buildAddUsersToGroupsRequests } from "../../lib/user-group-memberships.js"

test("buildAddUsersToGroupsRequests creates one atomic add-members request per selected group", () => {
  assert.deepEqual(buildAddUsersToGroupsRequests(["alice", "bob"], ["admins", "auditors"]), [
    {
      group: "admins",
      members: ["alice", "bob"],
      isRemove: false,
      groupStatus: "enabled",
    },
    {
      group: "auditors",
      members: ["alice", "bob"],
      isRemove: false,
      groupStatus: "enabled",
    },
  ])
})

test("buildAddUsersToGroupsRequests ignores blank users and groups", () => {
  assert.deepEqual(buildAddUsersToGroupsRequests([" alice ", ""], [" admins ", ""]), [
    {
      group: "admins",
      members: ["alice"],
      isRemove: false,
      groupStatus: "enabled",
    },
  ])
})

test("buildAddUsersToGroupsRequests removes duplicate users and groups", () => {
  assert.deepEqual(buildAddUsersToGroupsRequests(["alice", " alice "], ["admins", "admins"]), [
    {
      group: "admins",
      members: ["alice"],
      isRemove: false,
      groupStatus: "enabled",
    },
  ])
})
