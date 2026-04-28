import test from "node:test"
import assert from "node:assert/strict"

import { buildAddUsersToGroupsRequests } from "../../lib/user-group-memberships.js"

test("buildAddUsersToGroupsRequests creates one add-members request per selected user and group", () => {
  assert.deepEqual(buildAddUsersToGroupsRequests(["alice", "bob"], ["admins", "auditors"]), [
    {
      group: "admins",
      members: ["alice"],
      isRemove: false,
      groupStatus: "enabled",
    },
    {
      group: "auditors",
      members: ["alice"],
      isRemove: false,
      groupStatus: "enabled",
    },
    {
      group: "admins",
      members: ["bob"],
      isRemove: false,
      groupStatus: "enabled",
    },
    {
      group: "auditors",
      members: ["bob"],
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
