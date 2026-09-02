import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const source = fs.readFileSync(".github/workflows/quality.yml", "utf8")
const formattingJob = source.match(/  formatting:\n[\s\S]*?(?=\n  typescript:)/)?.[0] ?? ""

test("formatting CI checks Prettier without running lint fixes", () => {
  assert.match(formattingJob, /- name: 💅 Check Prettier formatting\n\s+run: pnpm run format:check/)
  assert.doesNotMatch(formattingJob, /pnpm run lint/)
  assert.doesNotMatch(formattingJob, /Auto-fix formatting/)
})
