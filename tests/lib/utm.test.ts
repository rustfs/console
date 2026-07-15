import test from "node:test"
import assert from "node:assert/strict"
import { withUtm } from "../../lib/utm"

test("withUtm appends utm params to a bare external URL", () => {
  assert.equal(
    withUtm("https://www.rustfs.com"),
    "https://www.rustfs.com/?utm_source=rustfs-console&utm_medium=referral",
  )
})

test("withUtm sets utm_content when a placement is given", () => {
  assert.equal(
    withUtm("https://www.rustfs.com", "login-hero"),
    "https://www.rustfs.com/?utm_source=rustfs-console&utm_medium=referral&utm_content=login-hero",
  )
})

test("withUtm preserves existing query params", () => {
  assert.equal(
    withUtm("https://docs.rustfs.com/?ref=console", "sidebar"),
    "https://docs.rustfs.com/?ref=console&utm_source=rustfs-console&utm_medium=referral&utm_content=sidebar",
  )
})

test("withUtm inserts params before the hash fragment", () => {
  assert.equal(
    withUtm("https://docs.rustfs.com/guide#install"),
    "https://docs.rustfs.com/guide?utm_source=rustfs-console&utm_medium=referral#install",
  )
})

test("withUtm keeps percent-encoded param values byte-identical", () => {
  assert.equal(
    withUtm("https://example.com/page.php?sign=AbC%253D&style=2"),
    "https://example.com/page.php?sign=AbC%253D&style=2&utm_source=rustfs-console&utm_medium=referral",
  )
})

test("withUtm leaves URLs that already carry utm params unchanged", () => {
  assert.equal(
    withUtm("https://www.rustfs.com/?utm_source=partner", "sidebar"),
    "https://www.rustfs.com/?utm_source=partner",
  )
})

test("withUtm leaves relative URLs unchanged", () => {
  assert.equal(withUtm("/browser", "sidebar"), "/browser")
})

test("withUtm leaves non-http protocols unchanged", () => {
  assert.equal(withUtm("mailto:hello@rustfs.com"), "mailto:hello@rustfs.com")
})
