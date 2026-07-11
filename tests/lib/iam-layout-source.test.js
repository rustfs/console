import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const read = (file) => fs.readFileSync(file, "utf8")

test("access key dialogs keep fixed headers and actions around one scrolling body", () => {
  for (const file of ["components/access-keys/new-item.tsx", "components/access-keys/edit-item.tsx"]) {
    const source = read(file)

    assert.match(source, /max-h-\[min\(90dvh,52rem\)\]/)
    assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
    assert.match(source, /gap-0 overflow-hidden p-0/)
    assert.match(source, /<DialogHeader className="border-b px-4 py-3 pe-12">/)
    assert.match(source, /<form\s+className="contents"\s+onSubmit=/)
    assert.match(source, /min-h-0[^\"]*overflow-y-auto overscroll-contain p-4/)
    assert.match(source, /<DialogFooter className="border-t bg-muted\/20 px-4 py-3">/)
    assert.doesNotMatch(source, /max-h-\[(?:80|60)vh\]/)
  }
})

test("access key creation exposes expiry guidance and associated field errors", () => {
  const source = read("components/access-keys/new-item.tsx")

  assert.match(source, /<FieldDescription id="create-expiry-description">/)
  assert.match(source, /aria-describedby="create-expiry-description"/)
  assert.match(source, /aria-describedby=\{errors\.accessKey \? "create-access-key-error" : undefined\}/)
  assert.match(source, /<FieldError id="create-access-key-error">/)
  assert.match(source, /type="submit"/)
})

test("access key editing clears stale state and blocks submission until loading succeeds", () => {
  const source = read("components/access-keys/edit-item.tsx")

  assert.match(source, /const \[loading, setLoading\] = React\.useState\(false\)/)
  assert.match(source, /const \[loadError, setLoadError\] = React\.useState\(""\)/)
  assert.match(source, /setAccesskey\(currentAccessKey\)/)
  assert.match(source, /let cancelled = false/)
  assert.match(source, /if \(!accesskey \|\| loading \|\| loadError\) return/)
  assert.match(source, /disabled=\{loading \|\| submitting\}/)
  assert.match(source, /disabled=\{loading \|\| submitting \|\| Boolean\(loadError\)\}/)
  assert.match(source, /aria-busy=\{loading \|\| submitting\}/)
})

test("policy editor keeps the form fixed while the policy textarea scrolls within the viewport", () => {
  const source = read("components/policies/form.tsx")

  assert.match(source, /const isEditing = Boolean\(policy\?\.name\)/)
  assert.match(source, /isEditing \? t\("Edit Policy"\) : t\("New Policy"\)/)
  assert.match(source, /disabled=\{isEditing \|\| submitting\}/)
  assert.match(source, /sm:max-w-3xl/)
  assert.match(source, /max-h-\[min\(90dvh,52rem\)\]/)
  assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
  assert.match(source, /<form\s+className="contents"\s+onSubmit=/)
  assert.match(source, /flex min-h-0 flex-col gap-4 overflow-hidden p-4/)
  assert.match(source, /<Field className="flex min-h-0 flex-1 flex-col">/)
  assert.match(source, /<FieldContent className="flex min-h-0 flex-1">/)
  assert.match(source, /min-h-\[12rem\] flex-1 resize-none overflow-y-auto font-mono text-xs/)
  assert.match(source, /<FieldError id="policy-content-error">/)
  assert.match(source, /aria-describedby=\{errors\.content \? "policy-content-error" : undefined\}/)
  assert.doesNotMatch(source, /space-y-4 overflow-y-auto overscroll-contain p-4/)
  assert.doesNotMatch(source, /min-h-\[24rem\] resize-y/)
  assert.doesNotMatch(source, /max-h-\[(?:80|60)vh\]/)
  assert.doesNotMatch(source, /<DialogTitle>\{t\("Policy Original"\)\}<\/DialogTitle>/)
})

test("IAM multi-selectors expose their current selection and listbox semantics", () => {
  for (const file of [
    "components/user/selector.tsx",
    "components/user/edit/groups.tsx",
    "components/user-group/policies.tsx",
  ]) {
    const source = read(file)

    assert.match(source, /CommandList[^>]+role="listbox"[^>]+aria-label=/)
    assert.match(source, /aria-multiselectable="true"/)
    assert.match(source, /CommandInput[^>]+aria-label=/)
    assert.match(source, /MultiSelectCommandItem/)
    assert.match(source, /aria-label=\{.*\$\{/s)
  }

  const itemSource = read("components/user/multi-select-command-item.tsx")
  assert.match(itemSource, /MutationObserver/)
  assert.match(itemSource, /setAttribute\("aria-selected", String\(selected\)\)/)
})

test("IAM edit controls restore focus after switching between view and edit modes", () => {
  for (const file of ["components/user-group/members.tsx", "components/user-group/policies.tsx"]) {
    const source = read(file)

    assert.match(source, /editButtonRef = React\.useRef<HTMLButtonElement>/)
    assert.match(source, /editHeadingRef = React\.useRef<HTMLHeadingElement>/)
    assert.match(source, /editHeadingRef\.current\?\.focus\(\)/)
    assert.match(source, /editButtonRef\.current\?\.focus\(\)/)
    assert.match(source, /tabIndex=\{-1\}/)
    assert.match(source, /previousEditStatus === null/)
  }
})

test("IAM group tables expose localized captions through the shared table primitive", () => {
  const tableSource = read("components/data-table/data-table.tsx")
  assert.match(tableSource, /caption\?: string/)
  assert.match(tableSource, /<caption className="sr-only">\{caption\}<\/caption>/)

  assert.match(read("components/user-group/members.tsx"), /DataTable table=\{table\} caption=\{t\("Members"\)\}/)
  assert.match(read("components/user-group/policies.tsx"), /DataTable table=\{table\} caption=\{t\("Policies"\)\}/)
})
