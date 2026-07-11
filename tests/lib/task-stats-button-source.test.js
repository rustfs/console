import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("task stats drawer trigger renders the button as its child", () => {
  const source = fs.readFileSync("components/tasks/stats-button.tsx", "utf8")

  assert.match(source, /<DrawerTrigger\s+asChild>/)
})

test("task controls separate cancellation from record cleanup", () => {
  const itemSource = fs.readFileSync("components/tasks/item.tsx", "utf8")
  const panelSource = fs.readFileSync("components/tasks/panel.tsx", "utf8")
  const statsSource = fs.readFileSync("components/tasks/stats-button.tsx", "utf8")

  assert.match(itemSource, /taskManager\.cancelTask\(task\.id\)/)
  assert.match(itemSource, /taskManager\.removeFinishedTask\(task\.id\)/)
  assert.match(statsSource, /taskManager\.clearFinishedTasks\(\)/)
  assert.match(panelSource, /value="canceled"/)
})
