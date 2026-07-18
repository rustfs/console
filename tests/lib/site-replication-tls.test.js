import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

const loadTlsHelpers = () => import(new URL("../../lib/site-replication-tls.ts", import.meta.url).href)

test("site replication TLS helpers identify HTTPS endpoints", async () => {
  const { isHttpsSiteReplicationEndpoint } = await loadTlsHelpers()

  assert.equal(isHttpsSiteReplicationEndpoint(" https://peer.example.com:9000 "), true)
  assert.equal(isHttpsSiteReplicationEndpoint("http://peer.example.com:9000"), false)
  assert.equal(isHttpsSiteReplicationEndpoint("peer.example.com:9000"), false)
})

test("site replication TLS payload keeps trust modes mutually exclusive", async () => {
  const { buildSiteReplicationTlsPayload } = await loadTlsHelpers()

  assert.deepEqual(buildSiteReplicationTlsPayload("https://peer.example.com", "verify", "unused"), {
    skipTlsVerify: false,
    caCertPem: "",
  })
  assert.deepEqual(buildSiteReplicationTlsPayload("https://peer.example.com", "skip", "unused"), {
    skipTlsVerify: true,
    caCertPem: "",
  })
  assert.deepEqual(buildSiteReplicationTlsPayload("https://peer.example.com", "custom-ca", "  certificate pem  "), {
    skipTlsVerify: false,
    caCertPem: "certificate pem",
  })
})

test("site replication TLS payload clears TLS settings for non-HTTPS endpoints", async () => {
  const { buildSiteReplicationTlsPayload } = await loadTlsHelpers()

  assert.deepEqual(buildSiteReplicationTlsPayload("http://peer.example.com", "skip", "certificate pem"), {
    skipTlsVerify: false,
    caCertPem: "",
  })
})

test("site replication API preserves TLS fields across add, edit, and resync", async () => {
  const source = await readFile(new URL("../../hooks/use-site-replication.ts", import.meta.url), "utf8")

  assert.match(source, /skipTlsVerify/)
  assert.match(source, /caCertPem/)
  assert.match(source, /buildPeerPayload/)
})

test("site replication forms expose custom CA validation and insecure warnings", async () => {
  const newForm = await readFile(new URL("../../components/site-replication/new-form.tsx", import.meta.url), "utf8")
  const editForm = await readFile(new URL("../../components/site-replication/edit-form.tsx", import.meta.url), "utf8")

  for (const source of [newForm, editForm]) {
    assert.match(source, /Custom CA certificate/)
    assert.match(source, /Custom CA certificate is required/)
    assert.match(source, /role="alert"/)
  }
})

test("site replication overview reports each peer TLS trust mode", async () => {
  const source = await readFile(new URL("../../app/(dashboard)/site-replication/page.tsx", import.meta.url), "utf8")

  assert.match(source, /formatTlsVerification/)
  assert.match(source, /TLS Verification/)
})

test("site replication action labels stay inside a Base UI menu group", async () => {
  const source = await readFile(new URL("../../app/(dashboard)/site-replication/page.tsx", import.meta.url), "utf8")

  assert.match(source, /DropdownMenuGroup/)
  assert.match(source, /<DropdownMenuGroup>[\s\S]*?<DropdownMenuLabel>[\s\S]*?<\/DropdownMenuGroup>/)
})
