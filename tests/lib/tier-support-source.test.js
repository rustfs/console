import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("tier UI no longer offers Huawei or Tencent storage support", () => {
  const newFormSource = fs.readFileSync("components/tiers/new-form.tsx", "utf8")
  const pageSource = fs.readFileSync("app/(dashboard)/tiers/page.tsx", "utf8")
  const hookSource = fs.readFileSync("hooks/use-tiers.ts", "utf8")

  assert.equal(newFormSource.includes("Huawei OBS"), false)
  assert.equal(newFormSource.includes("huaweiyun.svg"), false)
  assert.equal(newFormSource.includes("Tencent COS"), false)
  assert.equal(newFormSource.includes("tenxunyun.svg"), false)
  assert.equal(newFormSource.includes('labelKey: "Aliyun OSS"'), false)
  assert.equal(newFormSource.includes('labelKey: "Minio"'), false)
  assert.equal(newFormSource.includes('labelKey: "Alibaba Cloud"'), true)
  assert.equal(newFormSource.includes('labelKey: "MinIO"'), true)
  assert.equal(pageSource.includes("row.huaweicloud"), false)
  assert.equal(pageSource.includes("row.tencent"), false)
  assert.equal(hookSource.includes("huaweicloud?: TierConfig"), false)
  assert.equal(hookSource.includes("tencent?: TierConfig"), false)
  assert.equal(hookSource.includes('UNSUPPORTED_TIER_TYPES = new Set(["huaweicloud", "tencent"])'), true)
})
