import test from "node:test"
import assert from "node:assert/strict"
import { CONSOLE_SCOPES, PAGE_PERMISSIONS } from "../../lib/console-permissions"
import { hasConsolePermission, type ConsolePolicy } from "../../lib/console-policy-parser"
import { hasConsoleCapability } from "../../lib/permission-capabilities"
import { getFirstAccessibleDashboardRoute } from "../../lib/dashboard-route-meta"

function policy(allow: string[], deny: string[] = []): ConsolePolicy {
  return {
    Version: "2012-10-17",
    Statement: [
      { Effect: "Allow", Action: allow, Resource: ["*"] },
      { Effect: "Deny", Action: deny, Resource: ["*"] },
    ],
  }
}

test("recovery route explicitly requires its page scope", () => {
  assert.deepEqual(PAGE_PERMISSIONS["/recovery"], [CONSOLE_SCOPES.VIEW_RECOVERY])
})

const recoveryCapabilities = ["recovery.mrf", "recovery.jobs.view", "recovery.readiness.view"] as const

for (const [action, capability] of [
  ["admin:Heal", "recovery.mrf"],
  ["admin:DescribeBatchJob", "recovery.jobs.view"],
  ["admin:ServerInfo", "recovery.readiness.view"],
] as const) {
  test(`${action} permits its own recovery entry without all administration permissions`, () => {
    const operator = policy([action])
    assert.equal(hasConsolePermission(operator, CONSOLE_SCOPES.VIEW_RECOVERY), true)
    assert.deepEqual(
      recoveryCapabilities.map((entry) => hasConsoleCapability(operator, entry)),
      recoveryCapabilities.map((entry) => entry === capability),
    )
  })
}

test("the Recovery page scope alone grants navigation without backend capabilities", () => {
  const navigationOnly = policy([CONSOLE_SCOPES.VIEW_RECOVERY])
  assert.equal(hasConsolePermission(navigationOnly, CONSOLE_SCOPES.VIEW_RECOVERY), true)
  assert.deepEqual(
    recoveryCapabilities.map((capability) => hasConsoleCapability(navigationOnly, capability)),
    [false, false, false],
  )
})

test("the Recovery page scope does not elevate a job observer to MRF or readiness access", () => {
  const observer = policy([CONSOLE_SCOPES.VIEW_RECOVERY, "admin:DescribeBatchJob"])
  assert.equal(hasConsolePermission(observer, CONSOLE_SCOPES.VIEW_RECOVERY), true)
  assert.deepEqual(
    recoveryCapabilities.map((capability) => hasConsoleCapability(observer, capability)),
    [false, true, false],
  )
})

test("an explicit backend deny remains effective alongside the Recovery page scope", () => {
  const observer = policy([CONSOLE_SCOPES.VIEW_RECOVERY, "admin:DescribeBatchJob"], ["admin:DescribeBatchJob"])
  assert.equal(hasConsolePermission(observer, CONSOLE_SCOPES.VIEW_RECOVERY), true)
  assert.deepEqual(
    recoveryCapabilities.map((capability) => hasConsoleCapability(observer, capability)),
    [false, false, false],
  )
})

test("an explicit Recovery scope deny hides navigation without redefining backend grants", () => {
  const operator = policy(["admin:Heal"], [CONSOLE_SCOPES.VIEW_RECOVERY])
  assert.equal(hasConsolePermission(operator, CONSOLE_SCOPES.VIEW_RECOVERY), false)
  assert.equal(hasConsoleCapability(operator, "recovery.mrf"), true)
})

test("the admin wildcard retains all recovery capabilities", () => {
  const administrator = policy(["admin:*"])
  assert.equal(hasConsolePermission(administrator, CONSOLE_SCOPES.VIEW_RECOVERY), true)
  assert.deepEqual(
    recoveryCapabilities.map((capability) => hasConsoleCapability(administrator, capability)),
    [true, true, true],
  )
})

test("job observers can view results but cannot invoke MRF actions", () => {
  const observer = policy(["admin:DescribeBatchJob"])
  assert.deepEqual(
    [
      hasConsoleCapability(observer, "recovery.jobs.view"),
      hasConsoleCapability(observer, "recovery.mrf"),
      hasConsoleCapability(observer, "recovery.readiness.view"),
    ],
    [true, false, false],
  )
})

test("MRF deny remains effective when an independent results capability keeps the page visible", () => {
  const observer = policy(["admin:Heal", "admin:DescribeBatchJob"], ["admin:Heal"])
  assert.equal(hasConsolePermission(observer, CONSOLE_SCOPES.VIEW_RECOVERY), true)
  assert.equal(hasConsoleCapability(observer, "recovery.mrf"), false)
})

test("denying all recovery capabilities hides the page", () => {
  assert.equal(
    hasConsolePermission(
      policy(["admin:*"], ["admin:Heal", "admin:DescribeBatchJob", "admin:ServerInfo"]),
      CONSOLE_SCOPES.VIEW_RECOVERY,
    ),
    false,
  )
})

test("a recovery-only operator has a usable post-login route", () => {
  const operator = policy(["admin:Heal"])
  assert.equal(
    getFirstAccessibleDashboardRoute({
      isAdmin: false,
      canAccessPath: (path) => (PAGE_PERMISSIONS[path] ?? []).some((scope) => hasConsolePermission(operator, scope)),
    }),
    "/recovery",
  )
})

test("ordinary object readers do not gain recovery administration", () => {
  assert.equal(hasConsolePermission(policy(["s3:GetObject"]), CONSOLE_SCOPES.VIEW_RECOVERY), false)
})
