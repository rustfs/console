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
  assert.equal(source.includes("!showRetentionView && onOpenChange(nextOpen)"), true)
  assert.match(source, /onClick=\{\(\) => void submitRetention\(\)\}/)
  assert.match(source, /objectApi\.putObjectRetention\(resolvedObjectKey/)
})
