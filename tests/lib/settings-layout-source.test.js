import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("module switches stay readable and aligned across settings breakpoints", () => {
  const source = fs.readFileSync("app/(dashboard)/settings/page.tsx", "utf8")

  assert.match(source, /max-w-4xl/)
  assert.match(source, /grid-cols-\[minmax\(0,1fr\)_auto\]/)
  assert.match(source, /justify-self-end/)
  assert.match(source, /const \[loadError, setLoadError\]/)
  assert.match(source, /<Alert variant="destructive" role="alert">/)
  assert.match(source, /disabled=\{!canUpdateModuleSwitches \|\| isEnvManaged \|\| Boolean\(loadError\)/)
})

test("OIDC settings use a bounded provider rail before desktop-wide layouts", () => {
  const page = fs.readFileSync("app/(dashboard)/oidc/page.tsx", "utf8")
  const providerList = fs.readFileSync("components/oidc/provider-list.tsx", "utf8")

  assert.match(page, /lg:grid-cols-\[18rem_minmax\(0,1fr\)\]/)
  assert.match(providerList, /max-h-80/)
  assert.match(providerList, /lg:min-h-\[28rem\]/)
  assert.match(providerList, /min-h-0[^\"]*overflow-y-auto/)
})

test("OIDC forms progressively disclose claim mapping without hiding connection fields", () => {
  const source = fs.readFileSync("components/oidc/form.tsx", "utf8")

  assert.match(source, /<details className="space-y-4 border-t pt-4 md:col-span-2">/)
  assert.match(source, /<section[^>]+aria-labelledby="oidc-provider-form-title"/)
  assert.doesNotMatch(source, /className="items-start gap-3 border p-3"/)
  assert.match(source, /\{t\("Advanced Settings"\)\}/)
  assert.match(source, /id="config_url"/)
  assert.match(source, /id="redirect_uri"/)
  assert.match(source, /id="claim_name"/)
  assert.match(source, /id="roles_claim"/)
})

test("long settings dialogs keep headers and actions visible while the form scrolls", () => {
  const files = [
    "components/events-target/new-form.tsx",
    "components/audit-target/new-form.tsx",
    "components/tiers/new-form.tsx",
  ]

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8")

    assert.match(source, /max-h-\[min\(90dvh,52rem\)\]/)
    assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
    assert.match(source, /min-h-0[^\"]*overflow-y-auto/)
    assert.match(source, /<DialogFooter className="border-t bg-muted\/20/)
    assert.match(source, /disablePointerDismissal=\{submitting\}/)
    assert.match(source, /aria-busy=\{submitting\}/)
    assert.match(source, /onClick=\{handleCancel\} disabled=\{submitting\}/)
  }

  for (const file of [files[0], files[2]]) {
    const source = fs.readFileSync(file, "utf8")
    assert.match(source, /disabled=\{!type \|\| submitting\}/)
    assert.doesNotMatch(source, /aria-disabled=\{submitting\}/)
  }
})

test("site replication setup stays inside the viewport with one mobile scroll container", () => {
  const source = fs.readFileSync("components/site-replication/new-form.tsx", "utf8")

  assert.match(source, /max-h-\[min\(94dvh,56rem\)\]/)
  assert.match(source, /min-h-0 overflow-y-auto overscroll-contain/)
  assert.match(source, /lg:grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
  assert.match(source, /lg:min-h-0 lg:overflow-y-auto/)
  assert.match(source, /sticky bottom-0/)
  assert.match(source, /<fieldset key=\{index\} className="overflow-hidden bg-muted\/20">/)
  assert.doesNotMatch(source, /border bg-background\/70 p-4/)
  assert.doesNotMatch(source, /gap-3 border-b bg-background px-5 py-4/)
  assert.doesNotMatch(source, /<ScrollArea/)
})

test("event and audit target toolbars keep every action visible on mobile", () => {
  const files = ["app/(dashboard)/events-target/page.tsx", "app/(dashboard)/audit-target/page.tsx"]

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8")

    assert.match(source, /grid w-full shrink-0 gap-2 sm:grid-cols-\[minmax\(12rem,1fr\)_auto\]/)
    assert.match(source, /grid grid-cols-2 gap-2 sm:flex/)
    assert.match(source, /h-11 w-full sm:h-8/)
  }
})

test("KMS key actions remain visible and identifiable in the scrolling table", () => {
  const source = fs.readFileSync("app/(dashboard)/sse/page.tsx", "utf8")

  assert.match(source, /<TableCaption className="sr-only">/)
  assert.match(source, /<Table className="min-w-\[52rem\]">/)
  assert.match(source, /sticky end-0 z-20 border-s bg-card text-end/)
  assert.match(source, /sticky end-0 z-10 border-s bg-card/)
  assert.match(source, /aria-label=\{`\$\{t\("Actions"\)\}: \$\{getKeyDisplayName\(key\)\}`\}/)
})

test("import and export tasks stay focused and resilient to long filenames", () => {
  const source = fs.readFileSync("app/(dashboard)/import-export/page.tsx", "utf8")

  assert.match(source, /<Page className="max-w-5xl">/)
  assert.match(source, /lg:grid-cols-4/)
  assert.match(source, /min-w-0 flex-1/)
  assert.match(source, /break-all/)
  assert.match(source, /items-stretch/)
  assert.match(source, /w-full sm:w-auto/)
  assert.match(source, /role="alert"/)
  assert.doesNotMatch(source, /<Card className="border-dashed bg-muted\/30 shadow-none">/)
  assert.match(source, /flex items-start justify-between gap-3 bg-muted\/30 p-4/)
})

test("license text uses a bounded readable surface without preserving mobile indentation", () => {
  const source = fs.readFileSync("components/license/article.tsx", "utf8")

  assert.match(source, /<Page className="max-w-5xl">/)
  assert.match(source, /h-\[min\(70dvh,48rem\)\]/)
  assert.match(source, /whitespace-pre-line/)
  assert.match(source, /p-4[^\"]*sm:p-6/)
})

test("KMS key details keep a fixed header and one scrolling body", () => {
  const source = fs.readFileSync("app/(dashboard)/sse/page.tsx", "utf8")

  assert.match(source, /DrawerClose/)
  assert.match(source, /h-dvh overflow-hidden/)
  assert.match(source, /<DrawerHeader className="relative shrink-0 border-b pe-14">/)
  assert.match(source, /min-h-0 flex-1[^\"]*overflow-y-auto overscroll-contain/)
  assert.match(source, /<DrawerDescription className="break-all">/)
  assert.match(source, /h-auto max-w-full whitespace-normal break-all text-start/)
  assert.doesNotMatch(source, /max-h-\[95vh\] overflow-y-auto/)
})
