import test from "node:test"
import assert from "node:assert/strict"
import { hasConsoleCapability } from "../../lib/permission-capabilities"
import type { ConsolePolicy } from "../../lib/console-policy-parser"

const context = { bucket: "preview-bucket", objectKey: "folder/fred" }
const policy = (action: string): ConsolePolicy => ({
  Version: "2012-10-17",
  Statement: [{ Effect: "Allow", Action: [action], Resource: ["arn:aws:s3:::preview-bucket/folder/fred"] }],
})

test("current-object read permission allows ordinary preview downloads", () => {
  assert.equal(hasConsoleCapability(policy("s3:GetObject"), "objects.download", context), true)
})

test("current-object read permission does not allow selected-version downloads", () => {
  assert.equal(hasConsoleCapability(policy("s3:GetObject"), "objects.version.download", context), false)
})

test("selected-version downloads use version read permission without requiring current-object read", () => {
  assert.equal(hasConsoleCapability(policy("s3:GetObjectVersion"), "objects.version.download", context), true)
})

test("version download permission is scoped to the selected object", () => {
  assert.equal(
    hasConsoleCapability(policy("s3:GetObjectVersion"), "objects.version.download", {
      ...context,
      objectKey: "private/fred",
    }),
    false,
  )
})

test("an explicit version-read denial overrides a wildcard object-read grant", () => {
  const denied: ConsolePolicy = {
    Version: "2012-10-17",
    Statement: [
      { Effect: "Allow", Action: ["s3:GetObject*"], Resource: ["arn:aws:s3:::preview-bucket/*"] },
      { Effect: "Deny", Action: ["s3:GetObjectVersion"], Resource: ["arn:aws:s3:::preview-bucket/folder/fred"] },
    ],
  }
  assert.equal(hasConsoleCapability(denied, "objects.version.download", context), false)
})
