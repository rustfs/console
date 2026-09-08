import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const hookSource = fs.readFileSync("hooks/use-on-demand-migration.ts", "utf8")
const configSource = fs.readFileSync("components/on-demand-migration/config-dialog.tsx", "utf8")
const backfillSource = fs.readFileSync("components/on-demand-migration/backfill-dialog.tsx", "utf8")
const managementSource = fs.readFileSync("components/on-demand-migration/management.tsx", "utf8")
const settingsRowSource = fs.readFileSync("components/on-demand-migration/settings-row.tsx", "utf8")

test("on-demand migration hook follows the frozen RustFS admin route family", () => {
  assert.match(hookSource, /`\/on-demand-migration\/\$\{encodeURIComponent\(bucket\)\}`/)
  assert.match(hookSource, /params: dryRun \? \{ "dry-run": "true" \}/)
  assert.match(hookSource, /params: \{ op: "start" \}/)
  assert.match(hookSource, /params: \{ op: "cancel" \}/)
})

test("native Azure and GCS are first-class provider forms", () => {
  assert.match(configSource, /value === "azure"/)
  assert.match(configSource, /values\.provider === "gcs_native"/)
  assert.match(configSource, /["']azureAccount["']/)
  assert.match(configSource, /["']serviceAccountJson["']/)
  assert.doesNotMatch(configSource, /public source|anonymous source|roadmap/i)
})

test("migration dialogs keep actions visible while their bodies scroll", () => {
  for (const source of [configSource, backfillSource]) {
    assert.match(source, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/)
    assert.match(source, /min-h-0 space-y-5 overflow-y-auto/)
    assert.match(source, /<DialogFooter className="border-t/)
  }
})

test("status and backfill views avoid invented progress values", () => {
  assert.match(managementSource, /typeof ratio === "number" && Number\.isFinite\(ratio\)/)
  assert.match(managementSource, /: "—"/)
  assert.match(backfillSource, /no completion percentage is shown/)
  assert.doesNotMatch(managementSource, /<Progress/)
  assert.doesNotMatch(backfillSource, /<Progress/)
})

test("older servers and missing read permission hide the bucket settings row", () => {
  assert.match(settingsRowSource, /isOnDemandMigrationRouteMissing\(error\)/)
  assert.match(settingsRowSource, /if \(hidden\) return null/)
  assert.match(settingsRowSource, /canCapability\("bucket\.onDemandMigration\.view"\)/)
})

test("write dialogs link to license settings only for an explicit server license denial", () => {
  for (const source of [configSource, backfillSource]) {
    assert.match(source, /errorKind === "license_denied"/)
    assert.match(source, /<Link href="\/license">/)
  }
})
