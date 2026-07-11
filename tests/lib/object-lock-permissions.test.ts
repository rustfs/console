import test from "node:test"
import assert from "node:assert/strict"

import { CONSOLE_SCOPES } from "../../lib/console-permissions"
import type { ConsolePolicy } from "../../lib/console-policy-parser"
import { hasConsoleCapability } from "../../lib/permission-capabilities"

const browserPolicy: ConsolePolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Action: [CONSOLE_SCOPES.VIEW_BROWSER],
      Resource: ["console"],
    },
  ],
}

test("browser console scope allows editing object lock controls", () => {
  const context = { bucket: "locked-bucket", objectKey: "folder/object.txt" }

  assert.equal(hasConsoleCapability(browserPolicy, "objects.legalHold.edit", context), true)
  assert.equal(hasConsoleCapability(browserPolicy, "objects.retention.edit", context), true)
})

test("an explicit deny overrides an implied browser capability", () => {
  const policy: ConsolePolicy = {
    ...browserPolicy,
    Statement: [
      ...browserPolicy.Statement,
      {
        Effect: "Deny",
        Action: ["s3:PutObjectRetention"],
        Resource: ["arn:aws:s3:::locked-bucket/folder/*"],
      },
    ],
  }

  assert.equal(
    hasConsoleCapability(policy, "objects.retention.edit", {
      bucket: "locked-bucket",
      objectKey: "folder/object.txt",
    }),
    false,
  )
})
