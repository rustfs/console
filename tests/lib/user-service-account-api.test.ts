import test from "node:test"
import assert from "node:assert/strict"
import {
  buildCreateUserServiceAccountRequest,
  buildListUserServiceAccountsRequest,
} from "../../lib/user-service-account-api.js"

test("buildListUserServiceAccountsRequest targets the shared list endpoint with a user query", () => {
  assert.deepEqual(buildListUserServiceAccountsRequest("testuser"), {
    url: "/list-service-accounts",
    params: { user: "testuser" },
  })
})

test("buildCreateUserServiceAccountRequest targets the shared create endpoint with targetUser in the body", () => {
  assert.deepEqual(
    buildCreateUserServiceAccountRequest("testuser", {
      accessKey: "svc-test",
      secretKey: "secret123",
      name: "svc",
    }),
    {
      url: "/add-service-account",
      body: {
        targetUser: "testuser",
        accessKey: "svc-test",
        secretKey: "secret123",
        name: "svc",
      },
    },
  )
})
