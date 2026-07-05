import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("object versions restore copies a source version back to the current object key", () => {
  const hookSource = fs.readFileSync("hooks/use-object.ts", "utf8")
  const componentSource = fs.readFileSync("components/object/versions.tsx", "utf8")
  const permissionSource = fs.readFileSync("lib/permission-capabilities.ts", "utf8")

  assert.match(hookSource, /const restoreObjectVersion = useCallback/)
  assert.match(hookSource, /CopySource: encodeObjectCopySource\(bucket, key, versionId\)/)
  assert.match(hookSource, /MetadataDirective: "COPY"/)
  assert.match(hookSource, /TaggingDirective: "COPY"/)
  assert.match(componentSource, /restoreObjectVersion\(objectKey, versionId\)/)
  assert.match(componentSource, /canCapability\("objects\.version\.restore", objectContext\)/)
  assert.match(componentSource, /!row\.original\.IsLatest/)
  assert.match(permissionSource, /"objects\.version\.restore": \[\{ actions: \["s3:GetObject", "s3:PutObject"\]/)
})

test("object versions dialog is wide, sortable by date and size, and shows summary statistics", () => {
  const source = fs.readFileSync("components/object/versions.tsx", "utf8")

  assert.match(source, /2xl:w-\[80vw\]/)
  assert.match(source, /count: versions\.length/)
  assert.match(source, /totalSize: versions\.reduce/)
  assert.match(source, /accessorFn: \(row\) => \(row\.LastModified \? new Date\(row\.LastModified\)\.getTime\(\) : 0\)/)
  assert.match(source, /accessorFn: \(row\) => row\.Size \?\? 0/)
})
