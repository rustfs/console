import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("top nav breadcrumb handles clicks on the rendered breadcrumb link", () => {
  const source = fs.readFileSync("components/top-nav-breadcrumb.tsx", "utf8")

  assert.equal(source.includes('import Link from "next/link"'), false)
  assert.equal(source.includes("<BreadcrumbLink"), true)
  assert.equal(source.includes("href={item.href}"), true)
  assert.equal(source.includes("router.push(item.href!)"), true)
  assert.equal(source.includes("render={"), false)
})
