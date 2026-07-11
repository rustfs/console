import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("credential changes invalidate stale permission requests and S3 task managers", () => {
  const permissionsSource = fs.readFileSync("hooks/use-permissions.tsx", "utf8")
  const taskContextSource = fs.readFileSync("contexts/task-context.tsx", "utf8")

  assert.match(permissionsSource, /requestEpochRef\.current \+= 1/)
  assert.match(permissionsSource, /requestEpoch !== requestEpochRef\.current/)
  assert.match(taskContextSource, /setManagerState\(null\)/)
  assert.match(taskContextSource, /return \(\) => manager\.dispose\(\)/)
})

test("tier deletion is non-forced by default", () => {
  const source = fs.readFileSync("hooks/use-tiers.ts", "utf8")

  assert.match(source, /tier\/\$\{encodeURIComponent\(name\)\}\?force=false/)
  assert.doesNotMatch(source, /removeTiers[\s\S]*?force=true/)
})

test("destructive batch actions refresh after partial failures", () => {
  for (const file of ["app/(dashboard)/users/page.tsx", "app/(dashboard)/access-keys/page.tsx"]) {
    const source = fs.readFileSync(file, "utf8")
    assert.match(source, /Promise\.allSettled/)
    assert.match(source, /failures\.length === 0/)
  }
})
