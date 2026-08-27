import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const hookSource = fs.readFileSync(new URL("../../hooks/use-table-catalog.ts", import.meta.url), "utf8")
const viewDialogSource = fs.readFileSync(
  new URL("../../components/table-catalog/view-dialog.tsx", import.meta.url),
  "utf8",
)
const namespaceDialogSource = fs.readFileSync(
  new URL("../../components/table-catalog/namespace-dialog.tsx", import.meta.url),
  "utf8",
)
const tableDetailSource = fs.readFileSync(
  new URL("../../components/table-catalog/table-detail-dialog.tsx", import.meta.url),
  "utf8",
)
const tableDialogSource = fs.readFileSync(
  new URL("../../components/table-catalog/table-dialog.tsx", import.meta.url),
  "utf8",
)
const pageSource = fs.readFileSync(new URL("../../app/(dashboard)/table-catalog/page.tsx", import.meta.url), "utf8")

test("table catalog hook exposes the first-phase namespace, table, and view operations", () => {
  for (const method of [
    "getNamespace",
    "updateNamespaceProperties",
    "commitTable",
    "listViews",
    "createView",
    "loadView",
    "replaceView",
    "dropView",
  ]) {
    assert.match(hookSource, new RegExp(`const ${method} = useCallback`), method)
  }
  assert.match(hookSource, /body\["partition-spec"\]/)
  assert.match(hookSource, /"view-version": payload\.viewVersion/)
  assert.match(hookSource, /requirements: payload\.requirements \?\? \[\]/)
  assert.doesNotMatch(hookSource, /exportTableCatalog|importTableCatalog|catalog\/export|catalog\/import/)
})

test("namespace create and update permissions remain distinct", () => {
  assert.match(namespaceDialogSource, /canCreate\?\: boolean/)
  assert.match(namespaceDialogSource, /const canSubmit = editing \? canUpdate : canCreate/)
  assert.match(pageSource, /canCreate=\{canCreateNamespace\}/)
})

test("table creation fails closed when the create permission is missing", () => {
  assert.match(tableDialogSource, /canCreate\?\: boolean/)
  assert.match(tableDialogSource, /if \(submittingRef\.current \|\| !canCreate\) return/)
  assert.match(pageSource, /canCreate=\{canCreateTable\}/)
})

test("table catalog sends bucket setup to the existing bucket CRUD page", () => {
  assert.match(pageSource, /render=\{<Link href="\/browser" \/>\}/)
})

test("table catalog invalidates child loads when the workspace changes", () => {
  assert.match(pageSource, /const requestId = \+\+tableRequestId\.current/)
  assert.match(pageSource, /const requestId = \+\+viewRequestId\.current/)
  assert.match(pageSource, /tableRequestId\.current \+= 1/)
  assert.match(pageSource, /viewRequestId\.current \+= 1/)
  assert.match(pageSource, /activeTab === "tables"/)
})

test("table bucket mutations fail closed when status reads fail", () => {
  assert.match(pageSource, /delete next\[name\]/)
  assert.match(pageSource, /delete next\[bucket\]/)
})

test("view editing uses standard Iceberg view commit updates", () => {
  assert.match(viewDialogSource, /action: "add-view-version"/)
  assert.match(viewDialogSource, /action: "set-current-view-version"/)
  assert.match(viewDialogSource, /action: "remove-properties"/)
  assert.match(viewDialogSource, /type: "assert-view-uuid"/)
  assert.match(viewDialogSource, /Boolean\(loadError\)/)
  assert.doesNotMatch(viewDialogSource, /Export catalog|Download JSON|import catalog/i)
  assert.doesNotMatch(tableDetailSource, /Export catalog|Download JSON|import catalog/i)
})

test("metadata commits can be retried without publishing an ambiguous duplicate", () => {
  const commitSource = fs.readFileSync(
    new URL("../../components/table-catalog/table-commit-dialog.tsx", import.meta.url),
    "utf8",
  )
  assert.match(commitSource, /commitIdRef\.current \?\? newCommitId\(\)/)
  assert.match(commitSource, /expectedMetadataLocation: table\.metadataLocation/)
  assert.match(viewDialogSource, /expectedMetadataLocation: originalMetadataLocation/)
})

test("table detail keeps metadata usable when optional references are unavailable", () => {
  assert.match(tableDetailSource, /Promise\.allSettled\(/)
  assert.match(tableDetailSource, /Snapshot references are unavailable\./)
  assert.match(tableDetailSource, /You do not have permission to delete tables\./)
  assert.doesNotMatch(pageSource, /Export catalog|Import catalog|Run diagnostics/i)
})

test("table catalog page stays within the first-phase CRUD scope", () => {
  assert.doesNotMatch(pageSource, /value="connect"|PyIceberg example|connectionSnippet/)
  assert.match(pageSource, /setWorkspaceRefreshVersion/)
})
