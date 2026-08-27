import assert from "node:assert/strict"
import test from "node:test"
import {
  buildTableCatalogPath,
  displayNamespace,
  encodeNamespaceSegments,
  isCatalogIdentifierValid,
  tableBucketCatalogPath,
  tableCatalogBasePath,
  tableCatalogPath,
  viewCatalogPath,
  viewsCatalogPath,
} from "../../lib/table-catalog-paths"

test("table catalog paths use the Iceberg namespace separator", () => {
  assert.equal(encodeNamespaceSegments(["analytics", "reporting"]), "analytics%1Freporting")
  assert.equal(displayNamespace(["analytics", "reporting"]), "analytics.reporting")
  assert.equal(
    tableCatalogPath("warehouse", ["analytics", "reporting"], "events"),
    "/iceberg/v1/warehouse/namespaces/analytics%1Freporting/tables/events",
  )
})

test("view catalog paths share the encoded namespace route", () => {
  assert.equal(
    viewsCatalogPath("warehouse", ["analytics", "reporting"]),
    "/iceberg/v1/warehouse/namespaces/analytics%1Freporting/views",
  )
  assert.equal(
    viewCatalogPath("warehouse", ["analytics", "reporting"], "recent.events"),
    "/iceberg/v1/warehouse/namespaces/analytics%1Freporting/views/recent.events",
  )
})

test("table catalog paths preserve a configured reverse-proxy prefix", () => {
  const previous = process.env.NEXT_PUBLIC_API_PREFIX
  process.env.NEXT_PUBLIC_API_PREFIX = "/console/"

  try {
    assert.equal(buildTableCatalogPath("config"), "/console/iceberg/v1/config")
    assert.equal(tableBucketCatalogPath("warehouse"), "/console/iceberg/v1/buckets/warehouse")
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_PREFIX
    else process.env.NEXT_PUBLIC_API_PREFIX = previous
  }
})

test("table catalog base path removes only the REST version suffix", () => {
  assert.equal(tableCatalogBasePath("/iceberg/v1"), "/iceberg")
  assert.equal(tableCatalogBasePath("/custom/catalog"), "/custom/catalog")
})

test("catalog identifiers follow the server's lowercase boundary rules", () => {
  assert.equal(isCatalogIdentifierValid("events"), true)
  assert.equal(isCatalogIdentifierValid("events_v2"), true)
  assert.equal(isCatalogIdentifierValid("events-"), false)
  assert.equal(isCatalogIdentifierValid("-events"), false)
  assert.equal(isCatalogIdentifierValid("Events"), false)
})
