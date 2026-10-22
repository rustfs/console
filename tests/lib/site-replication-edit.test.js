import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

const loadEditHelpers = () => import(new URL("../../lib/site-replication-edit.ts", import.meta.url).href)

test("site replication endpoint change ignores case, whitespace, and trailing slashes", async () => {
  const { siteReplicationEndpointChanged } = await loadEditHelpers()

  assert.equal(siteReplicationEndpointChanged("http://10.0.0.1:9000", " HTTP://10.0.0.1:9000/ "), false)
  assert.equal(siteReplicationEndpointChanged("http://10.0.0.1:9000", "http://10.0.1.1:9000"), true)
  assert.equal(siteReplicationEndpointChanged("http://10.0.0.1:9000", "https://10.0.0.1:9000"), true)
})

test("site replication edit without an endpoint change needs no resync", async () => {
  const { siteReplicationResyncAdvice } = await loadEditHelpers()

  assert.equal(
    siteReplicationResyncAdvice({
      isLocal: false,
      previousEndpoint: "http://10.0.0.2:9000",
      nextEndpoint: "http://10.0.0.2:9000/",
    }),
    "none",
  )
})

test("moving a peer site asks this site to resync toward it", async () => {
  const { siteReplicationResyncAdvice } = await loadEditHelpers()

  assert.equal(
    siteReplicationResyncAdvice({
      isLocal: false,
      previousEndpoint: "http://10.0.0.2:9000",
      nextEndpoint: "http://192.168.0.2:9000",
    }),
    "resync-peer",
  )
})

test("moving the current site asks the peer sites to resync toward it", async () => {
  const { siteReplicationResyncAdvice } = await loadEditHelpers()

  assert.equal(
    siteReplicationResyncAdvice({
      isLocal: true,
      previousEndpoint: "http://10.0.0.1:9000",
      nextEndpoint: "http://192.168.0.1:9000",
    }),
    "resync-from-peers",
  )
})

test("site replication overview lets managers edit the current site but not resync or remove it", async () => {
  const source = await readFile(new URL("../../app/(dashboard)/site-replication/page.tsx", import.meta.url), "utf8")

  assert.match(source, /if \(isLocal && !canManageSites\)/)
  assert.match(source, /canResyncSites && !isLocal/)
  assert.match(source, /canRemoveSites && !isLocal/)
  assert.match(source, /isLocal=\{/)
  assert.match(source, /siteReplicationResyncAdvice\(/)
})
