import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const dashboardLayoutUrl = new URL("../../app/(dashboard)/layout.tsx", import.meta.url)
const browserContentUrl = new URL("../../app/(dashboard)/browser/content.tsx", import.meta.url)
const objectListUrl = new URL("../../components/object/list.tsx", import.meta.url)

test("object browser source guards responsive and accessible row actions", async () => {
  const [layout, browserContent, objectList] = await Promise.all([
    readFile(dashboardLayoutUrl, "utf8"),
    readFile(browserContentUrl, "utf8"),
    readFile(objectListUrl, "utf8"),
  ])

  const rowActionsSource = objectList.match(
    /id: "actions",[\s\S]*?<DropdownMenuContent[\s\S]*?<\/DropdownMenuContent>/,
  )?.[0]

  assert.match(layout, /<SidebarInset className="min-w-0">/)
  assert.doesNotMatch(browserContent + objectList, /min-w-\[40vw\]/)
  assert.match(objectList, /flex flex-nowrap items-center gap-2 lg:flex-wrap lg:justify-end/)
  assert.ok(rowActionsSource)
  assert.match(rowActionsSource, /className="size-11 lg:size-8"/)
  assert.match(rowActionsSource, /className="w-max min-w-40 max-w-\[calc\(100vw-2rem\)\]"/)
  assert.match(rowActionsSource, /!canPreview[\s\S]*!canDelete[\s\S]*return null/)
  assert.match(rowActionsSource, /aria-label=\{`\$\{t\("Actions"\)\}: \$\{displayKey\(key\)\}`\}/)
  assert.match(rowActionsSource, /openRenameDialog\(key, getRowActionTrigger\(row\.id\)\)/)
  assert.match(rowActionsSource, /openDeleteDialog\(\[key\], getRowActionTrigger\(row\.id\)\)/)
  assert.equal(objectList.includes("returnFocus={returnFocusToAction}"), true)
  assert.match(objectList, /deleteDialogKeys\.length === 1[\s\S]*<bdi>\{deleteDialogKeys\[0\]\}<\/bdi>/)
})
