import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("object info loads legal hold with the dedicated object lock API", () => {
  const hookSource = fs.readFileSync("hooks/use-object.ts", "utf8")
  const componentSource = fs.readFileSync("components/object/info.tsx", "utf8")

  assert.equal(hookSource.includes("GetObjectLegalHoldCommand"), true)
  assert.equal(componentSource.includes("objectApi.getObjectLegalHold(key)"), true)
})

test("object info retention confirm uses an explicit click handler", () => {
  const source = fs.readFileSync("components/object/info.tsx", "utf8")

  assert.equal(source.includes('type="datetime-local"'), false)
  assert.equal(source.includes("legalHoldEnabled: lockStatus"), true)
  assert.equal(source.includes("<DateTimePicker"), true)
  assert.equal(source.includes("portalContainer={retentionDialogContentRef}"), true)
  assert.match(source, /onClick=\{\(\) => void submitRetention\(\)\}/)
  assert.match(source, /objectApi\.putObjectRetention\(resolvedObjectKey/)
})

test("object info tag add uses the resolved object key and an explicit click handler", () => {
  const source = fs.readFileSync("components/object/info.tsx", "utf8")

  assert.match(source, /objectApi\.putObjectTags\(resolvedObjectKey/)
  assert.match(source, /onSubmit=\{\(e\) => \{\s*e\.preventDefault\(\)\s*void submitTagForm\(\)\s*\}\}/)
  assert.match(source, /onClick=\{\(\) => void submitTagForm\(\)\}/)
})

test("object info drawer stays open while the tag dialog is open", () => {
  const source = fs.readFileSync("components/object/info.tsx", "utf8")

  assert.equal(source.includes("modal={false}"), false)
  assert.equal(source.includes("modal={!showTagView && !showRetentionView}"), false)
  assert.match(source, /<Dialog open=\{showTagView\} onOpenChange=\{setShowTagView\} disablePointerDismissal>/)
  assert.match(
    source,
    /<Dialog open=\{showRetentionView\} onOpenChange=\{setShowRetentionView\} disablePointerDismissal>/,
  )
})

test("object info closes the versions dialog before opening a version preview", () => {
  const source = fs.readFileSync("components/object/info.tsx", "utf8")

  assert.match(source, /setShowVersions\(false\)\s+onPreview\(\{ key, data \}\)/)
})
