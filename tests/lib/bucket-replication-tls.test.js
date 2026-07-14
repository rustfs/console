import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

const loadTlsHelpers = () => import(new URL("../../lib/bucket-replication-tls.ts", import.meta.url).href)

test("bucket replication TLS payload defaults to certificate verification", async () => {
  const { buildBucketReplicationTlsPayload } = await loadTlsHelpers()

  assert.deepEqual(buildBucketReplicationTlsPayload(true, "verify", "unused"), {
    skipTlsVerify: false,
    caCertPem: "",
  })
})

test("bucket replication TLS payload enables exactly one custom trust mode", async () => {
  const { buildBucketReplicationTlsPayload } = await loadTlsHelpers()

  assert.deepEqual(buildBucketReplicationTlsPayload(true, "skip", "unused"), {
    skipTlsVerify: true,
    caCertPem: "",
  })
  assert.deepEqual(buildBucketReplicationTlsPayload(true, "custom-ca", "  certificate pem  "), {
    skipTlsVerify: false,
    caCertPem: "certificate pem",
  })
})

test("bucket replication TLS payload clears TLS-only settings for HTTP targets", async () => {
  const { buildBucketReplicationTlsPayload } = await loadTlsHelpers()

  assert.deepEqual(buildBucketReplicationTlsPayload(false, "skip", "certificate pem"), {
    skipTlsVerify: false,
    caCertPem: "",
  })
})

test("bucket replication form submits custom TLS fields and exposes accessible validation", async () => {
  const source = await readFile(new URL("../../components/replication/new-form.tsx", import.meta.url), "utf8")

  assert.match(source, /buildBucketReplicationTlsPayload/)
  assert.match(source, /skipTlsVerify/)
  assert.match(source, /caCertPem/)
  assert.match(source, /replication-ca-certificate-error/)
  assert.match(source, /role="alert"/)
})
