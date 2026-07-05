import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const manifest = JSON.parse(fs.readFileSync("app/manifest.webmanifest", "utf8"))

test("web manifest asset URLs resolve relative to the app base path", () => {
  assert.equal(manifest.start_url, ".")

  for (const icon of manifest.icons) {
    assert.doesNotMatch(icon.src, /^\//)
  }
})
