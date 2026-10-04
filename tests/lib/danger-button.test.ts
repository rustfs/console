import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

// The working tree is CRLF on Windows, so normalize before matching line-anchored patterns.
const read = (file: string) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")

const css = read("app/globals.css")
const dangerButton = read("components/danger-button.ts")
const dialogHost = read("components/dialog-host.tsx")
const objectList = read("components/object/list.tsx")

const DANGER_USAGES = [
  ["components/dialog-host.tsx", dialogHost],
  ["components/object/list.tsx", objectList],
  ["app/(dashboard)/sse/page.tsx", read("app/(dashboard)/sse/page.tsx")],
]

test("destructive label color is a registered theme token", () => {
  assert.match(css, /--color-destructive-foreground: var\(--destructive-foreground\)/)
  assert.match(css, /:root \{[^}]*--destructive-foreground:/s)
  assert.match(css, /\.dark \{[^}]*--destructive-foreground:/s)
})

const DANGER_FILL_PAIR =
  /--destructive:\s*([^;]+);\s*\n\s*(?:\/\*[^*]*\*\/\s*\n\s*)?--destructive-foreground:\s*([^;]+);/

const oklchLightness = (value: string) => Number(/oklch\(([\d.]+)/.exec(value)?.[1])

test("destructive label is a light neutral on the light-theme fill and a dark one on the dark-theme fill", () => {
  const light = DANGER_FILL_PAIR.exec(css.slice(0, css.indexOf(".dark {")))
  assert.ok(light, "light theme must pair --destructive with --destructive-foreground")

  const dark = DANGER_FILL_PAIR.exec(css.slice(css.indexOf(".dark {")))
  assert.ok(dark, "dark theme must pair --destructive with --destructive-foreground")

  assert.ok(
    oklchLightness(light[2]) > 0.9,
    "light theme destructive fill needs a near-white label so the filled button stays readable",
  )
  assert.ok(
    oklchLightness(dark[1]) > oklchLightness(dark[2]),
    "the dark theme lightens --destructive for tinted text, so its filled button needs a dark label",
  )
})

test("every filled danger button reads its label from the destructive-foreground token", () => {
  assert.match(dangerButton, /bg-destructive text-destructive-foreground/)
  assert.match(dangerButton, /hover:bg-destructive\/95/)
  assert.doesNotMatch(dangerButton, /hover:bg-destructive\/85/)
  assert.doesNotMatch(dangerButton, /\btext-white\b/)

  for (const [file, source] of DANGER_USAGES) {
    assert.match(source, /DANGER_BUTTON_CLASS/, `${file} must use the shared danger button class`)
  }
})

test("no filled danger button pairs a solid fill with a hardcoded label color", () => {
  const solidFillLabel = /(?:bg-destructive\b[^"'\s]*)[^\n]{0,80}?\btext-(?!destructive\b)[a-z]/
  for (const [file, source] of DANGER_USAGES) {
    assert.doesNotMatch(source, solidFillLabel, `${file} must not set a label color beside a solid danger fill`)
  }
})

test("the soft destructive button variant is never given a filled label color", () => {
  assert.doesNotMatch(dialogHost, /variant: "destructive"/)
  assert.doesNotMatch(objectList, /variant="destructive"[\s\S]{0,120}?text-white/)
})
