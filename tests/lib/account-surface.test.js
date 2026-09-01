import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const read = (file) => fs.readFileSync(file, "utf8")

test("the user menu keeps its label and items inside Base UI menu groups", () => {
  const source = read("components/user/dropdown.tsx")
  const content = source.match(/<DropdownMenuContent[\s\S]*<\/DropdownMenuContent>/)?.[0]

  assert.ok(content)

  const groups = [...content.matchAll(/<DropdownMenuGroup>([\s\S]*?)<\/DropdownMenuGroup>/g)].map((match) => match[1])

  assert.equal(groups.length, 2)
  assert.match(groups[0], /<DropdownMenuLabel/)
  assert.match(groups[0], /t\("Profile"\)/)
  assert.match(groups[0], /t\("Security"\)/)
  assert.match(groups[1], /t\("Logout"\)/)
})

test("the profile page distinguishes a failed read from an empty profile", () => {
  const source = read("app/(dashboard)/account/page.tsx")

  // Rendering a read failure as an empty profile would tell the user their
  // account has no policies or groups, which is a different and false claim.
  assert.match(source, /setLoadError/)
  assert.match(source, /t\("Retry"\)/)
  assert.match(source, /Skeleton/)
  // Passive metadata as a definition list, not a grid of bordered cards.
  assert.match(source, /<dl /)
  assert.match(source, /<dt /)
  assert.match(source, /<dd /)
})

test("the profile page explains why a root identity cannot be edited here", () => {
  const source = read("app/(dashboard)/account/page.tsx")

  // A disabled control with no explanation is worse than no control.
  assert.match(source, /credentials_source === "env"/)
  assert.match(source, /RUSTFS_ACCESS_KEY/)
})

test("the security page gates its actions on what the server says is possible", () => {
  const source = read("app/(dashboard)/account/security/page.tsx")

  assert.match(source, /info\?\.mutable\.password \?\? false/)
  assert.match(source, /mfa\?\.enrollment_available \?\? false/)
  assert.match(source, /enrollment_blocked_reason/)
  // Zero remaining codes is a distinct, louder state than running low.
  assert.match(source, /recovery_codes_remaining === 0/)
  assert.match(source, /recoveryCodesRunningLow/)
})

test("recovery codes cannot be dismissed before they are stored", () => {
  const panel = read("components/account/recovery-codes-panel.tsx")

  // The server keeps only hashes, so this is the one time the values exist
  // anywhere the user can read them.
  assert.match(panel, /disabled=\{!saved \|\| pending\}/)
  assert.match(panel, /setSaved\(true\)/)
})

test("the setup flow keeps the recovery codes in the dialog that produced them", () => {
  const source = read("components/account/mfa-setup-dialog.tsx")

  // Nested dialogs are ruled out by the design guide, and a parent closing
  // underneath the codes would orphan them.
  assert.match(source, /if \(!nextOpen && step === "codes"\) return/)
  assert.match(source, /showCloseButton=\{step !== "codes"\}/)
  assert.match(source, /RecoveryCodesPanel/)
})

test("the setup dialog never persists the shared secret", () => {
  const source = read("components/account/mfa-setup-dialog.tsx")

  // A TOTP secret in browser storage defeats the second factor.
  assert.doesNotMatch(source, /localStorage/)
  assert.doesNotMatch(source, /sessionStorage/)
  assert.doesNotMatch(source, /useLocalStorage/)
})

test("turning off the second factor requires both factors and names the account", () => {
  const source = read("components/account/mfa-disable-dialog.tsx")

  assert.match(source, /disableMfa\(code, password\)/)
  assert.match(source, /autoComplete="current-password"/)
  assert.match(source, /\{account\} will be protected by its password alone/)
  assert.match(source, /variant="destructive"/)
})

test("the login flow keeps long-term credentials out of storage", () => {
  const authContext = read("contexts/auth-context.tsx")

  // The credentials for the second call live in component state only; only the
  // resulting STS session is persisted.
  assert.match(authContext, /storeStsCredentials/)
  assert.match(authContext, /completeLoginWithSecondFactor/)
  assert.doesNotMatch(authContext, /setStore\(\{[\s\S]*secretAccessKey/)
})

test("a demand for a second factor is not reported as a failed login", () => {
  const page = read("app/(auth)/auth/login/page.tsx")

  assert.match(page, /outcome\.status === "mfa-required"/)
  assert.match(page, /setPendingMfa/)
  // The success/failure toast must not fire on the mfa-required branch.
  assert.match(page, /setMfaError\(""\)\n\s*return/)
})

test("the challenge probe cannot become an enumeration oracle", () => {
  const source = read("lib/mfa-challenge.ts")

  // It is signed with the caller's own key, so a caller only learns about the
  // identity whose secret it already holds.
  assert.match(source, /new AwsClient\(/)
  assert.match(source, /accessKeyId: credentials\.accessKeyId/)
  // An older server, or any failure, must not silently skip the factor: it
  // falls through to AssumeRole, which fails closed on its own.
  assert.match(source, /response\.status === 404 \|\| response\.status === 501/)
  assert.match(source, /return \{ required: false \}/)
})

test("the second factor rides AssumeRole's own fields", () => {
  const source = read("lib/sts.ts")

  // SerialNumber/TokenCode are part of the STS API, so the SDK sends them
  // unchanged and a script can authenticate the same way.
  assert.match(source, /SerialNumber: secondFactor\.challenge/)
  assert.match(source, /TokenCode: secondFactor\.code/)
})

test("the account pages stay reachable for every authenticated identity", () => {
  const permissions = read("lib/console-permissions.ts")
  const routeMeta = read("lib/dashboard-route-meta.ts")

  // Self-service must not require a console scope: a user who cannot list
  // policies still has to be able to change their own password. A future
  // PAGE_PERMISSIONS entry for /account would silently lock them out.
  assert.doesNotMatch(permissions, /"\/account"/)
  assert.doesNotMatch(routeMeta, /"\/account"/)
})
