import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const bucketPages = ["components/buckets/list.tsx", "app/(dashboard)/browser/page.tsx"]

for (const file of bucketPages) {
  test(`${file} uses accountinfo as the bucket statistics source`, async () => {
    const source = await readFile(file, "utf8")

    assert.match(source, /getAccountBucketUsage\(userInfo\)/)
    assert.match(source, /fetchUserPolicy\(\)/)
    if (file.includes("app/(dashboard)/browser/page.tsx")) {
      assert.match(source, /useEffect\(\(\) => \{\s*fetchBuckets\(\{ force: true \}\)/)
    }
    assert.doesNotMatch(source, /getDataUsageInfo/)
  })
}
