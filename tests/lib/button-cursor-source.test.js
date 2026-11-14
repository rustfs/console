import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const css = fs.readFileSync("app/globals.css", "utf8").replace(/\r\n/g, "\n")

test("enabled buttons show a pointer cursor like links do", () => {
  assert.match(
    css,
    /@layer base \{[\s\S]*:is\(button, \[role="button"\]\):not\(:disabled, \[aria-disabled="true"\]\) \{\s*cursor: pointer;/,
  )
})
