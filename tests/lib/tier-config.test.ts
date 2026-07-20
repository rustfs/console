import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { TIER_PROVIDERS, WASABI_REGIONS, buildTierPayload, getWasabiEndpoint } from "../../lib/tier-config"

test("Wasabi is the strict first provider without becoming a default selection", () => {
  assert.deepEqual(
    TIER_PROVIDERS.map(({ value, labelKey }) => [value, labelKey]),
    [
      ["wasabi", "Wasabi"],
      ["rustfs", "RustFS"],
      ["minio", "MinIO"],
      ["s3", "AWS S3"],
      ["aliyun", "Alibaba Cloud"],
      ["azure", "Azure Blob"],
      ["gcs", "Google Cloud Storage"],
      ["r2", "Cloudflare R2"],
    ],
  )
})

test("Wasabi payload matches the backend contract exactly", () => {
  const payload = buildTierPayload("wasabi", {
    name: "ARCHIVE",
    endpoint: "https://must-not-be-sent.example",
    accessKey: "access-key",
    secretKey: "secret-key",
    bucket: "archive",
    prefix: "cold/",
    region: " EU-CENTRAL-1 ",
    storageClass: "STANDARD",
    creds: "ignored",
  })

  assert.deepEqual(payload, {
    type: "wasabi",
    wasabi: {
      name: "ARCHIVE",
      region: "eu-central-1",
      accessKey: "access-key",
      secretKey: "secret-key",
      bucket: "archive",
      prefix: "cold/",
    },
  })
  assert.equal("endpoint" in payload.wasabi, false)
  assert.equal("storageClass" in payload.wasabi, false)
})

test("Wasabi endpoint preview follows the selected or custom region", () => {
  assert.equal(getWasabiEndpoint("us-east-1"), "https://s3.wasabisys.com")
  assert.equal(getWasabiEndpoint("ap-southeast-2"), "https://s3.ap-southeast-2.wasabisys.com")
  assert.equal(getWasabiEndpoint(" EU-CENTRAL-1 "), "https://s3.eu-central-1.wasabisys.com")
  assert.equal(getWasabiEndpoint("future-region-1"), "https://s3.future-region-1.wasabisys.com")
  assert.equal(getWasabiEndpoint(""), "")
  assert.ok(WASABI_REGIONS.includes("us-east-1"))
})

test("Wasabi SVG variants are self-contained official marks for light and dark surfaces", () => {
  const sources = ["public/svg/wasabi.svg", "public/svg/wasabi-dark.svg"].map((path) => fs.readFileSync(path, "utf8"))

  for (const source of sources) {
    assert.doesNotMatch(source, /<script|\b(?:href|src)=/i)
    assert.match(source, /fill="#00ce3e"/)
    assert.match(source, /Official Wasabi logomark path/)
  }
  assert.equal(sources[0].match(/<path[^>]*\sd="([^"]+)"/)?.[1], sources[1].match(/<path[^>]*\sd="([^"]+)"/)?.[1])
})
