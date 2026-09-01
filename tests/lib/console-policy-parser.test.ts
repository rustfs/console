import test from "node:test"
import assert from "node:assert/strict"

import { CONSOLE_SCOPES } from "../../lib/console-permissions"
import { hasConsolePermission, type ConsolePolicy } from "../../lib/console-policy-parser"

const maintainerPolicy: ConsolePolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Action: ["s3:*"],
      Resource: ["arn:aws:s3:::*"],
    },
    {
      Effect: "Deny",
      Action: ["s3:DeleteObject"],
      Resource: ["arn:aws:s3:::*"],
    },
  ],
}

test("a denied browser capability does not hide the Browser page", () => {
  assert.equal(hasConsolePermission(maintainerPolicy, CONSOLE_SCOPES.VIEW_BROWSER), true)
})

test("a denied browser capability remains unavailable", () => {
  assert.equal(hasConsolePermission(maintainerPolicy, "s3:DeleteObject", "arn:aws:s3:::test/object.txt"), false)
})

test("an explicit Browser scope deny hides the Browser page", () => {
  const policy: ConsolePolicy = {
    ...maintainerPolicy,
    Statement: [
      ...maintainerPolicy.Statement,
      {
        Effect: "Deny",
        Action: [CONSOLE_SCOPES.VIEW_BROWSER],
        Resource: ["console"],
      },
    ],
  }

  assert.equal(hasConsolePermission(policy, CONSOLE_SCOPES.VIEW_BROWSER), false)
})

test("a Console scope wildcard deny hides the Browser page", () => {
  const policy: ConsolePolicy = {
    ...maintainerPolicy,
    Statement: [
      ...maintainerPolicy.Statement,
      {
        Effect: "Deny",
        Action: ["console:*"],
        Resource: ["console"],
      },
    ],
  }

  assert.equal(hasConsolePermission(policy, CONSOLE_SCOPES.VIEW_BROWSER), false)
})

test("a global S3 wildcard deny hides the Browser page", () => {
  const policy: ConsolePolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["s3:*"],
        Resource: ["*"],
      },
      {
        Effect: "Deny",
        Action: ["s3:*"],
        Resource: ["arn:aws:s3:::*"],
      },
    ],
  }

  assert.equal(hasConsolePermission(policy, CONSOLE_SCOPES.VIEW_BROWSER), false)
})

test("a bucket-scoped S3 wildcard deny does not hide the Browser page", () => {
  const policy: ConsolePolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["s3:*"],
        Resource: ["arn:aws:s3:::*"],
      },
      {
        Effect: "Deny",
        Action: ["s3:*"],
        Resource: ["arn:aws:s3:::restricted/*"],
      },
    ],
  }

  assert.equal(hasConsolePermission(policy, CONSOLE_SCOPES.VIEW_BROWSER), true)
})

test("an admin wildcard deny hides the Users page", () => {
  const policy: ConsolePolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["admin:*"],
      },
      {
        Effect: "Deny",
        Action: ["admin:*"],
      },
    ],
  }

  assert.equal(hasConsolePermission(policy, CONSOLE_SCOPES.VIEW_USERS), false)
})

test("multiple denies that cover all Users capabilities hide the page", () => {
  const policy: ConsolePolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["admin:*"],
      },
      {
        Effect: "Deny",
        Action: ["admin:ListUsers", "admin:CreateUser", "admin:GetUser"],
      },
      {
        Effect: "Deny",
        Action: ["admin:EnableUser", "admin:DisableUser", "admin:DeleteUser"],
      },
    ],
  }

  assert.equal(hasConsolePermission(policy, CONSOLE_SCOPES.VIEW_USERS), false)
})

test("a total deny for one service does not hide a mixed-service page", () => {
  const policy: ConsolePolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["kms:*"],
      },
      {
        Effect: "Deny",
        Action: ["admin:*"],
      },
    ],
  }

  assert.equal(hasConsolePermission(policy, CONSOLE_SCOPES.VIEW_SSE_SETTINGS), true)
})
