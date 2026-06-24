import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("top nav breadcrumb handles clicks on the rendered breadcrumb link", () => {
  const source = fs.readFileSync("components/top-nav-breadcrumb.tsx", "utf8")

  assert.equal(source.includes('import Link from "next/link"'), true)
  assert.equal(source.includes("<BreadcrumbLink"), true)
  assert.equal(source.includes("<Link href={item.href}>{item.label}</Link>"), true)
  assert.equal(source.includes("router.push(item.href!)"), false)
  assert.equal(source.includes("render={"), true)
})
