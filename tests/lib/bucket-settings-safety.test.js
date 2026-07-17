import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { PutBucketLifecycleConfigurationCommand, S3Client } from "@aws-sdk/client-s3"
import {
  createLatestRequestGate,
  isMissingBucketConfiguration,
  normalizeReplicationRulesForRolelessConfig,
  removeMatchingBucketRule,
} from "../../lib/bucket-configuration.ts"
import {
  buildCurrentVersionExpirationRules,
  buildLifecycleFilter,
  findIncompleteLifecycleTag,
  getBucketVersioningMode,
  hasCompleteLifecycleTags,
  MAX_LIFECYCLE_RULES,
} from "../../lib/bucket-lifecycle.ts"
import { getXmlErrorCode } from "../../lib/error-handler.ts"

const bucketInfoSource = await readFile(new URL("../../components/buckets/info.tsx", import.meta.url), "utf8")
const bucketNewFormSource = await readFile(new URL("../../components/buckets/new-form.tsx", import.meta.url), "utf8")
const lifecycleTabSource = await readFile(
  new URL("../../components/buckets/lifecycle-tab.tsx", import.meta.url),
  "utf8",
)
const replicationTabSource = await readFile(
  new URL("../../components/buckets/replication-tab.tsx", import.meta.url),
  "utf8",
)
const eventsTabSource = await readFile(new URL("../../components/buckets/events-tab.tsx", import.meta.url), "utf8")
const replicationFormSource = await readFile(
  new URL("../../components/replication/new-form.tsx", import.meta.url),
  "utf8",
)
const lifecycleFormSource = await readFile(new URL("../../components/lifecycle/new-form.tsx", import.meta.url), "utf8")
const eventsFormSource = await readFile(new URL("../../components/events/new-form.tsx", import.meta.url), "utf8")
const bucketHookSource = await readFile(new URL("../../hooks/use-bucket.ts", import.meta.url), "utf8")

test("bucket settings distinguish known missing configurations from read failures", () => {
  assert.equal(isMissingBucketConfiguration({ name: "NoSuchBucketPolicy" }, "policy"), true)
  assert.equal(
    isMissingBucketConfiguration({ Code: "ServerSideEncryptionConfigurationNotFoundError" }, "encryption"),
    true,
  )
  assert.equal(isMissingBucketConfiguration({ Error: { Code: "NoSuchCORSConfiguration" } }, "cors"), true)
  assert.equal(isMissingBucketConfiguration({ name: "NoSuchTagSet" }, "tagging"), true)
  assert.equal(isMissingBucketConfiguration({ status: 404 }, "quota"), true)
  assert.equal(isMissingBucketConfiguration({ status: 500 }, "quota"), false)
  assert.equal(isMissingBucketConfiguration({ name: "AccessDenied" }, "policy"), false)
})

test("structured XML error codes survive the normalization boundary", () => {
  const xml = "<Error><Code>NoSuchLifecycleConfiguration</Code><Message>missing</Message></Error>"
  assert.equal(getXmlErrorCode(xml), "NoSuchLifecycleConfiguration")
})

test("fresh rule deletion preserves concurrent additions and rejects ambiguous targets", () => {
  const target = { ID: "rule-a", Status: "Enabled" }
  const concurrent = { ID: "rule-b", Status: "Enabled" }
  assert.deepEqual(removeMatchingBucketRule([target, concurrent], target), [concurrent])
  assert.equal(removeMatchingBucketRule([target, target], target), null)

  const idless = { Status: "Enabled", Filter: { Prefix: "logs/" } }
  assert.deepEqual(removeMatchingBucketRule([idless, concurrent], idless), [concurrent])
  assert.equal(removeMatchingBucketRule([idless, idless], idless), null)
})

test("legacy replication roles are preserved when migrating to roleless rules", () => {
  const rules = [
    { ID: "enabled", Status: "Enabled", Destination: { Bucket: "arn:stale:first", StorageClass: "STANDARD" } },
    { ID: "disabled", Status: "Disabled", Destination: { Bucket: "arn:stale:second" } },
  ]

  const normalized = normalizeReplicationRulesForRolelessConfig(rules, " arn:legacy:target ")
  assert.deepEqual(
    normalized.map((rule) => rule.Destination?.Bucket),
    ["arn:legacy:target", "arn:legacy:target"],
  )
  assert.equal(normalized[0]?.Destination?.StorageClass, "STANDARD")
  assert.equal(rules[0]?.Destination?.Bucket, "arn:stale:first")
  assert.equal(normalizeReplicationRulesForRolelessConfig(rules, ""), rules)
})

test("latest request gate invalidates stale and unmounted responses", () => {
  const gate = createLatestRequestGate()
  const first = gate.begin()
  const second = gate.begin()
  assert.equal(gate.isCurrent(first), false)
  assert.equal(gate.isCurrent(second), true)
  gate.invalidate()
  assert.equal(gate.isCurrent(second), false)
})

test("lifecycle payload helpers keep current expiration and delete-marker cleanup in separate rules", () => {
  assert.deepEqual(buildLifecycleFilter("", [{ key: "", value: "" }]), { Prefix: "" })
  assert.deepEqual(buildLifecycleFilter("logs/", []), { Prefix: "logs/" })

  const filter = { Prefix: "logs/" }
  assert.deepEqual(buildCurrentVersionExpirationRules("rule", 30, filter, false), [
    {
      ID: "rule-expiration",
      Status: "Enabled",
      Filter: filter,
      Expiration: { Days: 30 },
    },
  ])
  assert.deepEqual(buildCurrentVersionExpirationRules("rule", 30, filter, true), [
    {
      ID: "rule-expiration",
      Status: "Enabled",
      Filter: filter,
      Expiration: { Days: 30 },
    },
    {
      ID: "rule-delete-marker",
      Status: "Enabled",
      Filter: filter,
      Expiration: { ExpiredObjectDeleteMarker: true },
    },
  ])
})

test("AWS SDK serializes expiration days and delete-marker cleanup as two valid rules", async () => {
  let requestBody = ""
  const client = new S3Client({
    region: "us-east-1",
    endpoint: "http://127.0.0.1:9000",
    credentials: { accessKeyId: "test", secretAccessKey: "test" },
    requestHandler: {
      async handle(request) {
        requestBody = typeof request.body === "string" ? request.body : new TextDecoder().decode(request.body)
        return { response: { statusCode: 200, headers: {}, body: new Uint8Array() } }
      },
    },
  })
  const filter = { Prefix: "logs/" }

  await client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: "test-bucket",
      LifecycleConfiguration: {
        Rules: buildCurrentVersionExpirationRules("rule", 30, filter, true),
      },
    }),
  )
  client.destroy()

  const expirations = [...requestBody.matchAll(/<Expiration>(.*?)<\/Expiration>/g)].map((match) => match[1])
  assert.equal((requestBody.match(/<Rule>/g) ?? []).length, 2)
  assert.deepEqual(expirations, ["<Days>30</Days>", "<ExpiredObjectDeleteMarker>true</ExpiredObjectDeleteMarker>"])
})

test("lifecycle helpers preserve suspended versioning and reject partial tag pairs", () => {
  assert.equal(MAX_LIFECYCLE_RULES, 1000)
  assert.equal(getBucketVersioningMode("Enabled"), "enabled")
  assert.equal(getBucketVersioningMode("Suspended"), "suspended")
  assert.equal(getBucketVersioningMode(undefined), "unversioned")

  assert.equal(findIncompleteLifecycleTag([{ key: "", value: "" }]), -1)
  assert.equal(findIncompleteLifecycleTag([{ key: "env", value: "" }]), 0)
  assert.equal(findIncompleteLifecycleTag([{ key: "", value: "prod" }]), 0)
  assert.equal(hasCompleteLifecycleTags([{ key: "env", value: "prod" }]), true)
  assert.equal(hasCompleteLifecycleTags([{ key: "", value: "" }]), false)

  assert.match(
    lifecycleFormSource,
    /buildCurrentVersionExpirationRules\(baseId, daysValue, filter, expiredDeleteMark\)/,
  )
  assert.match(lifecycleFormSource, /Rules: \[\.\.\.existingRules, \.\.\.newRules\]/)
  assert.match(lifecycleFormSource, /existingRules\.length \+ newRules\.length > MAX_LIFECYCLE_RULES/)
  assert.match(lifecycleFormSource, /const hasVersionHistory = versioningMode !== "unversioned"/)
  assert.match(lifecycleFormSource, /expiredDeleteMark && hasCompleteLifecycleTags\(tags\)/)
  assert.match(lifecycleFormSource, /setExpiredDeleteMark\(checked === true\)/)
})

test("bucket reads fail closed and stale responses cannot update the active bucket", () => {
  assert.match(bucketInfoSource, /Promise\.allSettled/)
  assert.match(bucketInfoSource, /requestVersionRef/)
  assert.match(bucketInfoSource, /readErrors/)
  assert.match(bucketInfoSource, /Unable to load this setting\. Refresh before making changes\./)
  assert.doesNotMatch(bucketInfoSource, /getBucketPolicy\(bucketName\)\.catch\(\(\) => null\)/)
})

test("ordinary versioning updates do not silently enable MFA Delete", () => {
  const versioningBlock = bucketHookSource.slice(
    bucketHookSource.indexOf("const putBucketVersioning"),
    bucketHookSource.indexOf("const getBucketVersioning"),
  )
  assert.match(versioningBlock, /Status:/)
  assert.doesNotMatch(versioningBlock, /MFADelete/)
})

test("rule pages reread authoritative configuration and provide mobile-first summaries", () => {
  assert.match(lifecycleTabSource, /removeMatchingBucketRule/)
  assert.match(replicationTabSource, /removeMatchingBucketRule/)
  assert.match(eventsTabSource, /Configuration changed\. Refresh and try again\./)
  assert.match(lifecycleTabSource, /md:hidden/)
  assert.match(replicationTabSource, /md:hidden/)
  assert.match(eventsTabSource, /md:hidden/)
  assert.match(lifecycleTabSource, /loadError/)
  assert.match(replicationTabSource, /loadError/)
  assert.match(eventsTabSource, /loadError/)
})

test("replication creation rereads rules and never removes an uncertain remote target", () => {
  const targetIndex = replicationFormSource.indexOf("await setRemoteReplicationTarget")
  const secondReadIndex = replicationFormSource.indexOf("await getBucketReplication", targetIndex)
  const putIndex = replicationFormSource.indexOf("await putBucketReplication")
  assert.ok(targetIndex >= 0)
  assert.ok(secondReadIndex > targetIndex)
  assert.ok(putIndex > secondReadIndex)
  assert.doesNotMatch(replicationFormSource, /deleteRemoteReplicationTarget/)
  assert.doesNotMatch(replicationFormSource, /Destination\?\.Bucket !== targetResponse/)
  assert.match(replicationFormSource, /normalizeReplicationRulesForRolelessConfig/)
  assert.match(replicationFormSource, /Role: ""/)
  assert.match(replicationTabSource, /Role: role/)
  assert.match(replicationTabSource, /remaining\.length > 0 &&[\s\S]{0,80}!role &&/)
  assert.doesNotMatch(replicationTabSource, /Replication configuration Role is missing/)
})

test("bucket setting controls expose names, field errors, and unresolved dependency states", () => {
  assert.match(bucketInfoSource, /aria-label=\{t\("Versioning"\)\}/)
  assert.match(bucketInfoSource, /bucket-policy-error/)
  assert.match(bucketInfoSource, /bucket-quota-error/)
  assert.match(bucketInfoSource, /bucket-retention-error/)
  assert.match(bucketInfoSource, /kmsKeyError/)
  assert.match(bucketInfoSource, /setKmsReloadVersion/)

  assert.match(lifecycleFormSource, /Unable to load versioning status\./)
  assert.match(lifecycleFormSource, /Unable to load storage tiers\./)
  assert.match(lifecycleFormSource, /aria-invalid=\{Boolean\(fieldErrors\.days\)\}/)

  assert.match(eventsFormSource, /Unable to load event targets\./)
  assert.match(eventsFormSource, /setArnReloadVersion/)

  assert.match(replicationFormSource, /aria-invalid=\{Boolean\(fieldErrors\.endpoint\)\}/)
  assert.match(replicationFormSource, /aria-invalid=\{Boolean\(fieldErrors\.timecheck\)\}/)

  assert.match(eventsFormSource, /<fieldset[\s\S]{0,120}aria-describedby=\{eventsError/)
  assert.match(eventsFormSource, /if \(isChecked\) setEventsError\(""\)/)
  assert.match(eventsFormSource, /if \(value\) setResourceNameError\(""\)/)

  const lifecycleReset = lifecycleFormSource.slice(
    lifecycleFormSource.indexOf("const resetForm"),
    lifecycleFormSource.indexOf("const addTag"),
  )
  assert.match(lifecycleReset, /setStorageType\(""\)/)
  assert.doesNotMatch(lifecycleReset, /\[tiers\]/)
})

test("bucket forms preserve semantic groups without nested framing", () => {
  assert.match(bucketNewFormSource, /<fieldset className="space-y-4 border-t pt-4">/)
  assert.match(bucketNewFormSource, /aria-label=\{t\("Quota Unit"\)\}/)
  assert.match(bucketNewFormSource, /aria-label=\{t\("Retention Mode"\)\}/)
  assert.doesNotMatch(bucketNewFormSource, /<div className="space-y-4 border p-4">/)
  assert.doesNotMatch(bucketInfoSource, /quotaFormEnabled[\s\S]{0,120}<div className="space-y-4 border p-4">/)
  assert.match(eventsFormSource, /<div className="bg-muted\/20 p-4">/)
  assert.doesNotMatch(eventsFormSource, /<div className="border p-4">/)
})

test("mobile rule toolbars stack controls instead of forcing two columns", () => {
  for (const source of [lifecycleTabSource, replicationTabSource, eventsTabSource]) {
    assert.doesNotMatch(source, /grid-cols-2[^\n]*items-center[^\n]*justify-between/)
    assert.match(source, /flex-col[^\n]*sm:flex-row/)
  }
})
