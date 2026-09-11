import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const dashboardLayoutUrl = new URL("../../app/(dashboard)/layout.tsx", import.meta.url)
const browserContentUrl = new URL("../../app/(dashboard)/browser/content.tsx", import.meta.url)
const objectListUrl = new URL("../../components/object/list.tsx", import.meta.url)

test("object browser content cannot force the dashboard wider than the sidebar inset", async () => {
  const [layout, browserContent, objectList] = await Promise.all([
    readFile(dashboardLayoutUrl, "utf8"),
    readFile(browserContentUrl, "utf8"),
    readFile(objectListUrl, "utf8"),
  ])

  assert.match(layout, /<SidebarInset className="min-w-0">/)
  assert.doesNotMatch(browserContent + objectList, /min-w-\[40vw\]/)
  assert.match(objectList, /flex flex-nowrap items-center gap-2/)
  assert.match(objectList, /<DropdownMenuContent align="end">/)
})
