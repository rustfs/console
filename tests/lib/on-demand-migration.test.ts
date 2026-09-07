import test from "node:test"
import assert from "node:assert/strict"
import {
  buildOnDemandMigrationConfig,
  createOnDemandMigrationFormValues,
  getOnDemandMigrationServerField,
  getOnDemandMigrationErrorKind,
  isOnDemandMigrationRouteMissing,
  isOnDemandMigrationBackfillActive,
  ODM_REDACTED_SECRET,
  validateOnDemandMigrationForm,
} from "../../lib/on-demand-migration"
import type { OnDemandMigrationConfig } from "../../types/on-demand-migration"
import type { ConsolePolicy } from "../../lib/console-policy-parser"
import { hasConsoleCapability } from "../../lib/permission-capabilities"

const fixtureConfig: OnDemandMigrationConfig = {
  version: 1,
  enabled: true,
  source: {
    provider: "minio",
    endpoint: "https://source.example.com:9000",
    region: "us-east-1",
    bucket: "legacy-photos",
    path_style: "auto",
    credentials: { access_key: "AKIASOURCE", secret_key: ODM_REDACTED_SECRET, session_token: ODM_REDACTED_SECRET },
    tls: { skip_verify: false, ca_cert_pem: null },
  },
  filter: { prefix: null, source_prefix: "photos/" },
  policy: {
    head: "proxy",
    range_get: "serve_and_backfill",
    source_error: "propagate",
    list_through: false,
    respect_local_delete_marker: true,
    preserve_etag: true,
    copy_tags: false,
    emit_events: true,
    negative_cache_ttl_secs: 30,
    inline_max_bytes: 16777216,
    multipart_part_size_bytes: 67108864,
    max_concurrent_pulls: 8,
    pull_queue_capacity: 1024,
    source_timeout: { connect_ms: 5000, first_byte_ms: 15000, idle_ms: 30000 },
    bandwidth_limit_bytes_per_sec: null,
  },
}

test("editing a redacted configuration always starts with empty write-only secrets", () => {
  const values = createOnDemandMigrationFormValues(fixtureConfig)
  assert.equal(values.accessKey, "AKIASOURCE")
  assert.equal(values.secretKey, "")
  assert.equal(values.sessionToken, "")
})

test("the S3 payload reproduces the server wire shape without REDACTED", () => {
  const values = createOnDemandMigrationFormValues(fixtureConfig)
  values.secretKey = "new-secret"
  values.sessionToken = "new-token"
  const payload = buildOnDemandMigrationConfig(values)

  assert.equal(payload.source.credentials?.secret_key, "new-secret")
  assert.equal(payload.source.credentials?.session_token, "new-token")
  assert.equal(JSON.stringify(payload).includes(ODM_REDACTED_SECRET), false)
  assert.equal(payload.policy.inline_max_bytes, 16777216)
  assert.deepEqual(payload, {
    ...fixtureConfig,
    source: {
      ...fixtureConfig.source,
      credentials: {
        access_key: "AKIASOURCE",
        secret_key: "new-secret",
        session_token: "new-token",
      },
    },
  })
})

test("native Azure and GCS payloads use only their server-defined credential blocks", () => {
  const azure = createOnDemandMigrationFormValues()
  azure.provider = "azure"
  azure.bucket = "photos"
  azure.azureAccount = "storage-account"
  azure.azureSecret = "c2VjcmV0LWtleQ=="
  const azurePayload = buildOnDemandMigrationConfig(azure)
  assert.equal(azurePayload.source.region, "auto")
  assert.equal(azurePayload.source.credentials, null)
  assert.deepEqual(azurePayload.source.azure, {
    account: "storage-account",
    account_key: "c2VjcmV0LWtleQ==",
    sas_token: null,
  })
  assert.equal(azurePayload.source.gcs, undefined)

  const gcs = createOnDemandMigrationFormValues()
  gcs.provider = "gcs_native"
  gcs.bucket = "photos"
  gcs.serviceAccountJson = '{"type":"service_account","client_email":"a@example.com","private_key":"key"}'
  const gcsPayload = buildOnDemandMigrationConfig(gcs)
  assert.equal(gcsPayload.source.credentials, null)
  assert.deepEqual(gcsPayload.source.gcs, { service_account_json: gcs.serviceAccountJson })
  assert.equal(gcsPayload.source.azure, undefined)
})

test("validation follows current RustFS provider and numeric bounds", () => {
  const values = createOnDemandMigrationFormValues()
  values.provider = "aws"
  values.region = "auto"
  values.bucket = "bad bucket/name"
  values.accessKey = ""
  values.secretKey = ""
  values.inlineMaxBytes = "268435457"

  const issues = validateOnDemandMigrationForm(values)
  assert.deepEqual(
    new Set(issues.map((issue) => issue.field)),
    new Set(["region", "bucket", "accessKey", "secretKey", "inlineMaxBytes"]),
  )
})

test("validation does not treat empty zero-based numeric fields as zero", () => {
  const values = createOnDemandMigrationFormValues()
  values.bucket = "photos"
  values.accessKey = "access"
  values.secretKey = "secret"
  values.negativeCacheTtlSecs = ""
  values.inlineMaxBytes = ""

  const fields = validateOnDemandMigrationForm(values).map((issue) => issue.field)
  assert.equal(fields.includes("negativeCacheTtlSecs"), true)
  assert.equal(fields.includes("inlineMaxBytes"), true)
})

test("validation rejects credential shapes and bandwidth values that JSON cannot preserve exactly", () => {
  const gcs = createOnDemandMigrationFormValues()
  gcs.provider = "gcs_native"
  gcs.bucket = "archive"
  gcs.serviceAccountJson = JSON.stringify({
    type: "service_account",
    client_email: 123,
    private_key: true,
  })
  assert.ok(validateOnDemandMigrationForm(gcs).some((issue) => issue.field === "serviceAccountJson"))

  const s3 = createOnDemandMigrationFormValues()
  s3.bucket = "archive"
  s3.accessKey = "access"
  s3.secretKey = "secret"
  s3.bandwidthLimitBytesPerSec = "9007199254740992"
  assert.ok(validateOnDemandMigrationForm(s3).some((issue) => issue.field === "bandwidthLimitBytesPerSec"))
})

test("config construction preserves server-significant prefix and credential bytes", () => {
  const values = createOnDemandMigrationFormValues()
  values.bucket = "photos"
  values.accessKey = " access "
  values.secretKey = " secret "
  values.sessionToken = " token "
  values.localPrefix = " local/ "
  values.sourcePrefix = " source/ "

  const payload = buildOnDemandMigrationConfig(values)
  assert.deepEqual(payload.source.credentials, {
    access_key: " access ",
    secret_key: " secret ",
    session_token: " token ",
  })
  assert.deepEqual(payload.filter, { prefix: " local/ ", source_prefix: " source/ " })
})

test("server validation messages map to the matching form field", () => {
  assert.equal(getOnDemandMigrationServerField("source endpoint is invalid: endpoint must not have a path"), "endpoint")
  assert.equal(
    getOnDemandMigrationServerField("policy.source_timeout.first_byte_ms = 1 is outside 100..=600000"),
    "firstByteTimeoutMs",
  )
  assert.equal(getOnDemandMigrationServerField("source endpoint and bucket refer to this bucket"), "endpoint")
})

test("only pending and running backfills are active", () => {
  assert.equal(isOnDemandMigrationBackfillActive("pending"), true)
  assert.equal(isOnDemandMigrationBackfillActive("running"), true)
  assert.equal(isOnDemandMigrationBackfillActive("paused"), false)
  assert.equal(isOnDemandMigrationBackfillActive("completed_with_failures"), false)
})

test("ODM errors preserve the server distinction between state, validation, and compatibility", () => {
  assert.equal(getOnDemandMigrationErrorKind({ status: 400, code: "OnDemandMigrationDisabled" }), "module_disabled")
  assert.equal(
    getOnDemandMigrationErrorKind({ status: 501, code: "OnDemandMigrationBackendNotCompiled" }),
    "backend_not_compiled",
  )
  assert.equal(getOnDemandMigrationErrorKind({ status: 403, code: "AccessDenied" }), "access_denied")
  assert.equal(
    getOnDemandMigrationErrorKind({ status: 403, code: "AccessDenied", message: "license entitlement denied" }),
    "license_denied",
  )
  assert.equal(isOnDemandMigrationRouteMissing({ status: 404, code: "NoSuchConfiguration" }), false)
  assert.equal(isOnDemandMigrationRouteMissing({ status: 404, code: "NoSuchBucket" }), false)
  assert.equal(isOnDemandMigrationRouteMissing({ status: 404, code: "NoSuchKey" }), true)
})

test("read and write migration permissions remain independent admin actions", () => {
  const readOnly: ConsolePolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["admin:GetBucketOnDemandMigration"],
        Resource: ["arn:aws:s3:::photos"],
      },
    ],
  }

  assert.equal(hasConsoleCapability(readOnly, "bucket.onDemandMigration.view"), true)
  assert.equal(hasConsoleCapability(readOnly, "bucket.onDemandMigration.edit"), false)
})
