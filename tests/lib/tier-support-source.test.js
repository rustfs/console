import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("tier picker hides Huawei and Tencent without filtering existing rows", () => {
  const newFormSource = fs.readFileSync("components/tiers/new-form.tsx", "utf8")
  const configSource = fs.readFileSync("lib/tier-config.ts", "utf8")
  const pageSource = fs.readFileSync("app/(dashboard)/tiers/page.tsx", "utf8")
  const hookSource = fs.readFileSync("hooks/use-tiers.ts", "utf8")

  assert.equal(newFormSource.includes("Huawei OBS"), false)
  assert.equal(newFormSource.includes("huaweiyun.svg"), false)
  assert.equal(newFormSource.includes("Tencent COS"), false)
  assert.equal(newFormSource.includes("tenxunyun.svg"), false)
  assert.equal(configSource.includes('labelKey: "Aliyun OSS"'), false)
  assert.equal(configSource.includes('labelKey: "Minio"'), false)
  assert.equal(configSource.includes('labelKey: "Alibaba Cloud"'), true)
  assert.equal(configSource.includes('labelKey: "MinIO"'), true)
  assert.equal(pageSource.includes("row.huaweicloud"), true)
  assert.equal(pageSource.includes("row.tencent"), true)
  assert.equal(hookSource.includes("huaweicloud?: TierConfig"), true)
  assert.equal(hookSource.includes("tencent?: TierConfig"), true)
  assert.equal(hookSource.includes("UNSUPPORTED_TIER_TYPES"), false)
})

test("Wasabi is supported by tier rows and all name-based actions", () => {
  const newFormSource = fs.readFileSync("components/tiers/new-form.tsx", "utf8")
  const pageSource = fs.readFileSync("app/(dashboard)/tiers/page.tsx", "utf8")
  const hookSource = fs.readFileSync("hooks/use-tiers.ts", "utf8")

  assert.match(hookSource, /wasabi\?: TierConfig/)
  assert.match(pageSource, /case "wasabi":\s+return row\.wasabi/)
  assert.match(pageSource, /getConfig\(row\.original\)/)
  assert.match(pageSource, /getConfig\(row\)\?\.name/)
  assert.match(pageSource, /TIER_PROVIDERS\.find/)
  assert.match(pageSource, /className=\{provider \? undefined : "capitalize"\}/)
  assert.match(newFormSource, /buildTierPayload\(type,/)
  assert.match(newFormSource, /selectedOption\?\.labelKey/)
})

test("Wasabi form keeps failures in context and protects duplicate submissions", () => {
  const source = fs.readFileSync("components/tiers/new-form.tsx", "utf8")

  assert.match(source, /const \[saveError, setSaveError\]/)
  assert.match(source, /if \(submittingRef\.current\) return/)
  assert.match(source, /setSaveError\(errorMessage\)/)
  assert.match(source, /role="alert"/)
  assert.match(source, /document\.getElementById\(firstErrorId\)\?\.focus\(\)/)
  const failureHandler = source.slice(source.indexOf("} catch (error)"), source.indexOf("} finally"))
  assert.doesNotMatch(failureHandler, /resetForm\(\)/)
  assert.match(source, /grid grid-cols-1 gap-4 md:grid-cols-2/)
  assert.match(source, /focus-visible:ring-1 focus-visible:ring-ring\/50/)
  assert.match(source, /setFocusTarget\("name"\)/)
  assert.match(source, /setFocusTarget\(previousType\)/)
  assert.match(source, /autoFocus=\{focusTarget === item\.value\}/)
  assert.match(source, /autoFocus=\{focusTarget === "name"\}/)
  assert.match(source, /const clearProviderErrors = \(\) =>/)
  assert.equal(source.match(/clearProviderErrors\(\)/g)?.length, 2)
  assert.match(source, /aria-describedby="tier-endpoint-preview-description"/)
  assert.match(source, /<FieldDescription id="tier-endpoint-preview-description">/)
})

test("Wasabi required fields expose native semantics while preserving custom validation", () => {
  const source = fs.readFileSync("components/tiers/new-form.tsx", "utf8")
  const requiredFields = ["tier-name", "tier-region", "tier-access-key", "tier-secret-key", "tier-bucket"]

  assert.match(source, /<form[\s\S]*?noValidate/)
  for (const id of requiredFields) {
    const controlStart = source.indexOf(`id="${id}"`)
    const controlEnd = source.indexOf("/>", controlStart)

    assert.notEqual(controlStart, -1, `${id} should exist`)
    assert.match(source.slice(controlStart, controlEnd), /\brequired(?:=|\s|$)/, `${id} should be marked required`)
  }
})

test("Lifecycle reads Wasabi aliases dynamically and requires an explicit selection", () => {
  const source = fs.readFileSync("components/lifecycle/new-form.tsx", "utf8")

  assert.match(source, /item\[item\.type\]/)
  assert.doesNotMatch(source, /tierOptions\[0\]\.value/)
  assert.match(source, /selectedTierType === "wasabi"/)
  assert.doesNotMatch(source, /newRule\.wasabi|payload\.wasabi/)
})
