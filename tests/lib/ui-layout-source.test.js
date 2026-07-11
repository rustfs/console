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

  assert.match(login, /<h1[^>]*className="sr-only"/)
  assert.match(login, /required/)
  assert.match(login, /hidden lg:block lg:w-1\/2/)
  assert.match(login, /bg-card lg:w-1\/2/)
  assert.match(login, /w-full max-w-sm space-y-7/)
  assert.doesNotMatch(login, /lg:w-7\/12/)
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
    /className="flex size-6 items-center justify-center overflow-hidden rounded-full border bg-muted"/,
  )
  assert.match(source, /width=\{24\}/)
  assert.match(source, /height=\{24\}/)
  assert.doesNotMatch(source, /className="flex h-8 w-8 items-center justify-center overflow-hidden/)
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
    assert.match(page, /<span>\{t\("Buckets"\)\}<\/span>[\s\S]*\{actions\}/)
    assert.match(tab, /renderHeader\?: \(actions: React\.ReactNode\) => React\.ReactNode/)
    assert.match(tab, /renderHeader \? \([\s\S]*renderHeader\(actions\)/)
  }
})

test("shared page headers stay compact and scroll naturally on narrow screens", () => {
  const source = fs.readFileSync("components/page-header.tsx", "utf8")

  assert.match(source, /lg:sticky/)
  assert.match(source, /overflow-x-auto/)
  assert.match(source, /flex-nowrap/)
  assert.match(source, /\[&_h1\]:font-heading/)
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
