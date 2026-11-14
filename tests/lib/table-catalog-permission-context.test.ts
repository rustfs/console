import test from "node:test"
import assert from "node:assert/strict"
import {
  tableCatalogPermissionContext,
  tableWarehouseLocationPermissionContext,
} from "../../components/table-catalog/permission-context"

test("a table action uses the same namespace and table resource as the backend", () => {
  assert.deepEqual(tableCatalogPermissionContext("warehouse", ["sales", "quarter"], "orders"), {
    bucket: "warehouse",
    objectKey: "namespaces/sales/quarter/tables/orders",
  })
})

test("view actions do not share the table resource namespace", () => {
  assert.deepEqual(tableCatalogPermissionContext("warehouse", ["sales"], "orders", "views"), {
    bucket: "warehouse",
    objectKey: "namespaces/sales/views/orders",
  })
})

test("a dotted namespace segment remains distinct from multiple namespace segments", () => {
  assert.notDeepEqual(
    tableCatalogPermissionContext("warehouse", ["sales.quarter"]),
    tableCatalogPermissionContext("warehouse", ["sales", "quarter"]),
  )
})

test("bucket configuration actions explicitly declare the known warehouse root", () => {
  assert.deepEqual(tableCatalogPermissionContext("warehouse"), { bucket: "warehouse", objectKey: "" })
})

test("parent namespace scopes preserve names equal to table or view path markers", () => {
  assert.deepEqual(tableCatalogPermissionContext("warehouse", ["sales", "tables", "orders"]), {
    bucket: "warehouse",
    objectKey: "namespaces/sales/tables/orders",
  })
  assert.deepEqual(tableCatalogPermissionContext("warehouse", ["sales", "views", "orders"]), {
    bucket: "warehouse",
    objectKey: "namespaces/sales/views/orders",
  })
})

test("warehouse claim scopes use the raw S3 prefix without URL decoding", () => {
  assert.deepEqual(tableWarehouseLocationPermissionContext("warehouse", "s3://warehouse/data%2F2026/path/"), {
    bucket: "warehouse",
    objectKey: "data%2F2026/path",
  })
})

for (const location of [
  "https://warehouse/data",
  "s3://other/data",
  "s3://warehouse/",
  "s3://warehouse/a//b",
  "s3://warehouse/a/../b",
  "s3://warehouse/a\\b",
]) {
  test(`invalid warehouse location cannot produce an authorization scope: ${location}`, () => {
    assert.equal(tableWarehouseLocationPermissionContext("warehouse", location), null)
  })
}
