import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("auth surfaces use dynamic viewport height and mobile touch targets", () => {
  const login = fs.readFileSync("components/auth/login-form.tsx", "utf8")
  const config = fs.readFileSync("app/(auth)/config/page.tsx", "utf8")

  for (const source of [login, config]) {
    assert.match(source, /min-h-dvh/)
    assert.match(source, /h-11/)
  }

  assert.match(login, /<h1[^>]*className="font-heading text-4xl font-semibold leading-tight tracking-tight"/)
  assert.match(login, /required/)
  assert.match(login, /hidden lg:block/)
  assert.match(login, /lg:grid-cols-\[1.05fr_1fr\]/)
  assert.match(login, /w-full max-w-sm space-y-8/)
  assert.doesNotMatch(login, /lg:w-7\/12/)
})

test("login secret fields provide accessible reveal controls", () => {
  const login = fs.readFileSync("components/auth/login-form.tsx", "utf8")
  const secretFields = login.match(/<SecretKeyInput/g) ?? []

  assert.equal(secretFields.length, 2)
  assert.match(login, /type=\{visible \? "text" : "password"\}/)
  assert.match(login, /const visibilityLabel = visible \? t\("Hide key"\) : t\("Show key"\)/)
  assert.match(login, /<InputGroupButton[\s\S]*?type="button"[\s\S]*?aria-label=\{visibilityLabel\}/)
})

test("status toolbars keep mobile touch targets without stretching desktop controls", () => {
  const page = fs.readFileSync("app/(dashboard)/status/page.tsx", "utf8")
  const servers = fs.readFileSync("app/(dashboard)/_components/performance-server-list.tsx", "utf8")

  assert.match(page, /className="min-h-11 sm:min-h-0"/)
  assert.match(servers, /min-h-11 whitespace-normal shadow-none sm:min-h-0/)
  assert.match(servers, /min-h-11 w-full shadow-none sm:min-h-0 sm:w-\[230px\]/)
  assert.doesNotMatch(servers, /h-auto min-h-11 whitespace-normal py-2/)
})

test("top navigation keeps the account avatar inside its trigger with visible inset", () => {
  const source = fs.readFileSync("components/user/dropdown.tsx", "utf8")

  assert.match(source, /<Button variant="ghost" size=\{isCollapsed \? "icon" : "default"\}/)
  assert.match(
    source,
    /className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted"/,
  )
  assert.match(source, /width=\{24\}/)
  assert.match(source, /height=\{24\}/)
  assert.doesNotMatch(source, /className="flex h-8 w-8 items-center justify-center overflow-hidden/)
})

test("the account menu names the signed-in identity and its authority", () => {
  const source = fs.readFileSync("components/user/dropdown.tsx", "utf8")

  // A menu that opens on an avatar with no name answers neither "who am I" nor
  // "with what authority", which is the gap this menu existed with before.
  assert.match(source, /const accountName = resolveAccountDisplayName\(\{/)
  assert.match(source, /access_key: accountIdentity\?\.account_name \?\? ""/)
  assert.match(source, /const roleLabel = isAdmin \? t\("Administrator"\) : t\("User"\)/)
  assert.match(source, /\{accountName \|\| t\("Unknown user"\)\}/)
  assert.match(source, /t\("Profile"\)/)
  assert.match(source, /t\("Security"\)/)

  // Password management used to be hidden from administrators because the
  // backend rejected the call it made. Both are fixed, so the gate must be gone.
  assert.doesNotMatch(source, /!isAdmin &&/)
})

test("bucket rule actions share the page header with bucket navigation", () => {
  const surfaces = [
    ["app/(dashboard)/events/page.tsx", "components/buckets/events-tab.tsx"],
    ["app/(dashboard)/replication/page.tsx", "components/buckets/replication-tab.tsx"],
    ["app/(dashboard)/lifecycle/page.tsx", "components/buckets/lifecycle-tab.tsx"],
  ]

  for (const [pageFile, tabFile] of surfaces) {
    const page = fs.readFileSync(pageFile, "utf8")
    const tab = fs.readFileSync(tabFile, "utf8")

    assert.match(page, /renderHeader=\{\(actions\) => \(/)
    assert.match(page, /<BucketScopedHeader[\s\S]*bucketName=\{bucketName\}[\s\S]*actions=\{actions\}/)
    assert.match(tab, /renderHeader\?: \(actions: React\.ReactNode\) => React\.ReactNode/)
    assert.match(tab, /renderHeader \? \([\s\S]*renderHeader\(actions\)/)
  }
})

test("shared page headers wrap actions into reachable rows on narrow screens", () => {
  const source = fs.readFileSync("components/page-header.tsx", "utf8")

  assert.doesNotMatch(source, /sticky/)
  const styles = fs.readFileSync("styles/console.css", "utf8")
  assert.doesNotMatch(source, /overflow-x-auto|flex-nowrap/)
  assert.match(source, /flex-wrap/)
  assert.match(styles, /\.page-actions \[data-slot="button"\][\s\S]*min-height: 2.75rem/)
  assert.match(styles, /\.page-heading :where\(h1\)[\s\S]*font-family: var\(--font-heading\)/)
})

test("data table pagination uses a mobile grid and announces page changes", () => {
  const source = fs.readFileSync("components/data-table/data-table-pagination.tsx", "utf8")

  assert.match(source, /grid-cols-2/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /h-10/)
})

test("data table headers expose sorting semantics and avoid nested horizontal scrollers", () => {
  const source = fs.readFileSync("components/data-table/data-table.tsx", "utf8")

  assert.match(source, /scope="col"/)
  assert.match(source, /aria-sort=/)
  assert.doesNotMatch(source, /w-full overflow-x-auto border/)
})

test("upload progress uses one drop-zone frame and an announced status strip", () => {
  const source = fs.readFileSync("components/object/upload-picker.tsx", "utf8")

  assert.match(source, /border-t bg-muted\/30 p-3" role="status" aria-live="polite"/)
  assert.match(source, /aria-label=\{t\("Reading Folder Files"\)\}/)
  assert.match(source, /aria-label=\{t\("Adding to Upload Queue"\)\}/)
  assert.doesNotMatch(source, /space-y-2 border border-dashed p-3/)
})
