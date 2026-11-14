import test from "node:test"
import assert from "node:assert/strict"
import { tableCatalogPermissionContext } from "../../components/table-catalog/permission-context"

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

test("bucket configuration actions have no invented object scope", () => {
  assert.deepEqual(tableCatalogPermissionContext("warehouse"), { bucket: "warehouse" })
})
