import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

const loadHelpers = () => import(new URL("../../lib/site-replication-local-site.ts", import.meta.url).href)

// Both sites return the same list, sorted by deployment ID (issue #7072).
const SHARED_SITES = [
  { name: "site-b", deploymentId: "deployment-a-peer" },
  { name: "site-a", deploymentId: "deployment-b-local" },
]

test("local site is taken from the server deployment ID, not list position", async () => {
  const { resolveSiteReplicationLocalSite } = await loadHelpers()

  const onSiteA = resolveSiteReplicationLocalSite({
    serverDeploymentId: "deployment-b-local",
    localName: "site-a",
    peers: SHARED_SITES,
  })
  assert.deepEqual(onSiteA, { deploymentId: "deployment-b-local", source: "server", ambiguousName: false })

  const onSiteB = resolveSiteReplicationLocalSite({
    serverDeploymentId: "deployment-a-peer",
    localName: "site-b",
    peers: SHARED_SITES,
  })
  assert.deepEqual(onSiteB, { deploymentId: "deployment-a-peer", source: "server", ambiguousName: false })
})

test("local site falls back to a unique site name match when the server ID is unavailable", async () => {
  const { resolveSiteReplicationLocalSite } = await loadHelpers()

  const resolved = resolveSiteReplicationLocalSite({
    serverDeploymentId: "",
    localName: " site-a ",
    peers: SHARED_SITES,
  })
  assert.deepEqual(resolved, { deploymentId: "deployment-b-local", source: "name", ambiguousName: false })
})

test("local site stays unresolved instead of guessing when names are missing or duplicated", async () => {
  const { resolveSiteReplicationLocalSite } = await loadHelpers()

  const duplicated = resolveSiteReplicationLocalSite({
    serverDeploymentId: null,
    localName: "shared",
    peers: [
      { name: "shared", deploymentId: "deployment-1" },
      { name: "shared", deploymentId: "deployment-2" },
    ],
  })
  assert.deepEqual(duplicated, { deploymentId: "", source: "none", ambiguousName: true })

  const missing = resolveSiteReplicationLocalSite({
    serverDeploymentId: undefined,
    localName: "",
    peers: SHARED_SITES,
  })
  assert.deepEqual(missing, { deploymentId: "", source: "none", ambiguousName: false })

  const unknownName = resolveSiteReplicationLocalSite({
    serverDeploymentId: undefined,
    localName: "site-c",
    peers: SHARED_SITES,
  })
  assert.deepEqual(unknownName, { deploymentId: "", source: "none", ambiguousName: false })
})

test("server deployment ID is read from wrapped and bare admin info payloads", async () => {
  const { extractServerDeploymentId } = await loadHelpers()

  assert.equal(extractServerDeploymentId({ info: { deploymentID: " deployment-b-local " } }), "deployment-b-local")
  assert.equal(extractServerDeploymentId({ deploymentID: "deployment-a-peer" }), "deployment-a-peer")
  assert.equal(extractServerDeploymentId({ info: {} }), "")
  assert.equal(extractServerDeploymentId(null), "")
  assert.equal(extractServerDeploymentId("deployment-x"), "")
})

test("site replication overview no longer picks the local site by position", async () => {
  const source = await readFile(new URL("../../app/(dashboard)/site-replication/page.tsx", import.meta.url), "utf8")

  assert.match(source, /resolveSiteReplicationLocalSite/)
  assert.doesNotMatch(source, /Object\.keys\(status\?\.metrics\.metrics \?\? \{\}\)\[0\]/)
  assert.doesNotMatch(source, /sites\[0\]/)
})
