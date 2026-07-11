import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const read = (file) => fs.readFileSync(file, "utf8")

test("add-to-group dialog exposes loading failures and retries only failed groups", () => {
  const source = read("components/user/add-to-group-form.tsx")

  assert.match(source, /const \[loadError, setLoadError\] = React\.useState\(""\)/)
  assert.match(source, /let cancelled = false/)
  assert.match(source, /Promise\.allSettled/)
  assert.match(source, /setGroups\(failedGroups\)/)
  assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
  assert.match(source, /min-h-0[^\"]*overflow-y-auto overscroll-contain/)
  assert.match(source, /!groups\.length/)
})

test("user selector distinguishes loading, failure, and empty states", () => {
  const source = read("components/user/selector.tsx")

  assert.match(source, /const \[loading, setLoading\] = React\.useState\(false\)/)
  assert.match(source, /const \[loadError, setLoadError\] = React\.useState\(""\)/)
  assert.match(source, /const \[loadVersion, setLoadVersion\] = React\.useState\(0\)/)
  assert.match(source, /let cancelled = false/)
  assert.match(source, /setUsers\(\[\]\)/)
  assert.match(source, /if \(disabled\) setOpen\(false\)/)
  assert.match(source, /aria-busy=\{loading\}/)
  assert.match(source, /w-\(--anchor-width\) max-w-\(--available-width\)/)
})

test("member editor applies additive changes before destructive removals and locks submission", () => {
  const source = read("components/user-group/members.tsx")

  assert.match(source, /const \[submitting, setSubmitting\] = React\.useState\(false\)/)
  assert.match(source, /const addedMembers =/)
  assert.match(source, /const removedMembers =/)
  assert.ok(source.indexOf("members: addedMembers") < source.indexOf("members: removedMembers"))
  assert.match(source, /disabled=\{submitting\}/)
  assert.match(source, /setSearchTerm\(""\)/)
  assert.match(source, /\{!editStatus \? <DataTable table=\{table\} caption=\{t\("Members"\)\} \/> : null\}/)
})

test("policy editor rejects stale group work and exposes policy loading failures", () => {
  const source = read("components/user-group/policies.tsx")

  assert.match(source, /const activeGroupRef = React\.useRef/)
  assert.match(source, /const \[loading, setLoading\] = React\.useState\(false\)/)
  assert.match(source, /const \[loadError, setLoadError\] = React\.useState\(""\)/)
  assert.match(source, /let cancelled = false/)
  assert.match(source, /activeGroupRef\.current !== targetName/)
  assert.match(source, /setSearchTerm\(""\)/)
  assert.match(source, /aria-busy=\{loading \|\| submitting\}/)
  assert.match(source, /\{!editStatus \? <DataTable table=\{table\} caption=\{t\("Policies"\)\} \/> : null\}/)
})
