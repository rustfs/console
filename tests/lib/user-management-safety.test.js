import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const read = (file) => fs.readFileSync(file, "utf8")

test("group editor clears stale records and blocks writes until the current group loads", () => {
  const source = read("components/user-group/edit-form.tsx")

  assert.match(source, /const \[loadedName, setLoadedName\] = React\.useState\(""\)/)
  assert.match(source, /const \[loadError, setLoadError\] = React\.useState\(""\)/)
  assert.match(source, /let cancelled = false/)
  assert.match(source, /setGroup\(\{ name: targetName, members: \[\], status: "enabled" \}\)/)
  assert.match(source, /group\.name === row\?\.name/)
  assert.match(source, /const isCurrentGroup = loadedName === group\.name && group\.name === row\?\.name/)
  assert.match(source, /disabled=\{loading \|\| Boolean\(loadError\) \|\| statusUpdating/)
  assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
  assert.match(source, /min-h-0[^\"]*overflow-y-auto overscroll-contain/)
})

test("user editor rejects stale loads and stages status until Save", () => {
  const source = read("components/user/edit-form.tsx")

  assert.match(source, /const \[loadedAccessKey, setLoadedAccessKey\] = React\.useState\(""\)/)
  assert.match(source, /const \[loadError, setLoadError\] = React\.useState\(""\)/)
  assert.match(source, /let cancelled = false/)
  assert.match(source, /setGroupsList\(\[\]\)/)
  assert.match(source, /setPoliciesList\(\[\]\)/)
  assert.match(source, /const isCurrentUserLoaded = loadedAccessKey === user\.accessKey/)
  assert.match(source, /user\.accessKey === row\?\.accessKey/)
  assert.match(source, /user\.status !== originalStatus/)
  assert.match(source, /await changeUserStatus\(user\.accessKey, \{ status: user\.status \}\)/)
  assert.match(source, /const isAccessKeysTab = activeTab === "access-keys"/)
  assert.match(source, /isAccessKeysTab \? t\("Close"\) : t\("Cancel"\)/)
  assert.match(source, /!isAccessKeysTab && !loadError/)
  assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
})

test("nested user access key dialogs use one scroll container and fail closed while loading", () => {
  const source = read("components/user/edit/access-keys.tsx")

  assert.equal((source.match(/grid-rows-\[auto_minmax\(0,1fr\)_auto\]/g) ?? []).length, 2)
  assert.equal((source.match(/<form\s+className="contents"\s+onSubmit=/g) ?? []).length, 2)
  assert.equal((source.match(/min-h-0[^\"]*overflow-y-auto overscroll-contain p-4/g) ?? []).length, 2)
  assert.match(source, /const \[parentPolicyError, setParentPolicyError\] = React\.useState\(""\)/)
  assert.match(source, /const \[formOwner, setFormOwner\] = React\.useState\(""\)/)
  assert.match(source, /accessKey !== row\?\.accessKey/)
  assert.match(source, /const \[loadError, setLoadError\] = React\.useState\(""\)/)
  assert.match(
    source,
    /if \(!accessKey \|\| accessKey !== row\?\.accessKey \|\| loading \|\| loadError \|\| submitting\) return/,
  )
  assert.match(source, /Boolean\(loadError\) \|\| accessKey !== row\?\.accessKey/)
  assert.doesNotMatch(source, /max-h-\[(?:80|60)vh\]/)
})

test("user access key list resets ownership state and ignores late responses", () => {
  const source = read("components/user/edit/access-keys.tsx")

  assert.match(source, /const requestVersionRef = React\.useRef\(0\)/)
  assert.match(source, /const activeUserRef = React\.useRef\(userName\)/)
  assert.match(source, /requestId !== requestVersionRef\.current/)
  assert.match(source, /activeUserRef\.current !== targetUser/)
  assert.match(source, /setData\(\[\]\)/)
  assert.match(source, /setSearchTerm\(""\)/)
  assert.match(source, /setEditRow\(null\)/)
  assert.match(source, /const \[loadedUserName, setLoadedUserName\] = React\.useState\(""\)/)
  assert.match(source, /const \[loadError, setLoadError\] = React\.useState\(""\)/)
})
