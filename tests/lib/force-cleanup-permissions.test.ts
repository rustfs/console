import test from "node:test"
import assert from "node:assert/strict"
import { CONSOLE_SCOPES } from "../../lib/console-permissions"
import { hasConsolePermission, type ConsolePolicy, type ConsoleStatement } from "../../lib/console-policy-parser"
import { hasConsoleCapability, isForceCleanupTarget } from "../../lib/permission-capabilities"

const context = { bucket: "test-bucket", objectKey: "/folder/中文%2F+/" }
const resource = `arn:aws:s3:::${context.bucket}/${context.objectKey}`
const explicitGrant: ConsoleStatement = {
  Effect: "Allow",
  Action: ["s3:DeleteObject", "s3:ForceDeleteObject"],
  Resource: [resource],
}

function policy(...statements: ConsoleStatement[]): ConsolePolicy {
  return { Version: "2012-10-17", Statement: statements }
}

test("force cleanup accepts an explicit grant for the exact raw prefix", () => {
  assert.equal(hasConsoleCapability(policy(explicitGrant), "objects.forceCleanup", context), true)
  assert.equal(
    hasConsoleCapability(policy(explicitGrant), "objects.forceCleanup", {
      ...context,
      objectKey: context.objectKey.slice(1),
    }),
    false,
  )
  assert.equal(
    hasConsoleCapability(policy(explicitGrant), "objects.forceCleanup", { ...context, bucket: "other-bucket" }),
    false,
  )
})

for (const action of ["s3:*", "*", "s3:Force*", CONSOLE_SCOPES.VIEW_BROWSER, CONSOLE_SCOPES.CONSOLE_ADMIN]) {
  test(`force cleanup is not granted by ${action}`, () => {
    assert.equal(
      hasConsolePermission(
        policy({ Effect: "Allow", Action: [action], Resource: ["*"] }),
        "s3:ForceDeleteObject",
        resource,
      ),
      false,
    )
  })
}

test("force cleanup is not granted by a NotAction-only allow", () => {
  assert.equal(
    hasConsoleCapability(
      policy({ Effect: "Allow", NotAction: ["s3:GetObject"], Resource: ["*"] }),
      "objects.forceCleanup",
      context,
    ),
    false,
  )
})

test("force cleanup still requires the ordinary DeleteObject permission", () => {
  assert.equal(
    hasConsoleCapability(
      policy({ ...explicitGrant, Action: ["s3:ForceDeleteObject"] }),
      "objects.forceCleanup",
      context,
    ),
    false,
  )
})

for (const action of ["s3:*", "*", "s3:Force*", "s3:ForceDeleteObject", "s3:DeleteObject"]) {
  test(`an explicit force cleanup grant is overridden by a ${action} deny`, () => {
    assert.equal(
      hasConsoleCapability(
        policy(explicitGrant, { Effect: "Deny", Action: [action], Resource: [resource] }),
        "objects.forceCleanup",
        context,
      ),
      false,
    )
  })
}

test("force cleanup preserves NotAction exclusion and NotResource scope", () => {
  assert.equal(
    hasConsoleCapability(policy({ ...explicitGrant, NotAction: ["s3:Force*"] }), "objects.forceCleanup", context),
    false,
  )
  assert.equal(
    hasConsoleCapability(
      policy({ ...explicitGrant, Resource: ["*"], NotResource: [resource] }),
      "objects.forceCleanup",
      context,
    ),
    false,
  )
})

test("a NotAction deny still overrides an explicit force cleanup grant", () => {
  assert.equal(
    hasConsoleCapability(
      policy(explicitGrant, { Effect: "Deny", NotAction: ["s3:GetObject"], Resource: [resource] }),
      "objects.forceCleanup",
      context,
    ),
    false,
  )
})

test("a Console scope on the same statement cannot bypass the force cleanup resource", () => {
  assert.equal(
    hasConsolePermission(
      policy({
        ...explicitGrant,
        Action: [...explicitGrant.Action!, CONSOLE_SCOPES.VIEW_BROWSER],
        Resource: ["console"],
      }),
      "s3:ForceDeleteObject",
      resource,
    ),
    false,
  )
})

test("force cleanup accepts only a bucket and a non-root folder prefix", () => {
  for (const objectKey of ["", "/", "///", "file.txt", "folder"]) {
    assert.equal(isForceCleanupTarget({ ...context, objectKey }), false)
    assert.equal(
      hasConsoleCapability(policy({ ...explicitGrant, Resource: ["*"] }), "objects.forceCleanup", {
        ...context,
        objectKey,
      }),
      false,
    )
  }
  assert.equal(isForceCleanupTarget({ objectKey: "folder/" }), false)
  assert.equal(isForceCleanupTarget({ bucket: context.bucket, prefix: "folder/" }), false)
})

test("ordinary deletion retains S3 wildcard grants", () => {
  assert.equal(
    hasConsoleCapability(policy({ Effect: "Allow", Action: ["s3:*"], Resource: ["*"] }), "objects.delete", context),
    true,
  )
})
