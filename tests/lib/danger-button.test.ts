import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

// The working tree is CRLF on Windows, so normalize before matching line-anchored patterns.
const read = (file: string) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")

const css = read("styles/rustfs-tokens.css")
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

function luminance(value: string): number {
  const token = value.match(/var\((--[a-z0-9-]+)\)/)?.[1]
  const hex = token ? css.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`))?.[1] : value.trim()
  assert.ok(hex && /^#[0-9a-fA-F]{6}$/.test(hex), `unresolved color: ${value}`)
  const channels = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

test("filled destructive actions have accessible label contrast in both themes", () => {
  const light = DANGER_FILL_PAIR.exec(css.slice(0, css.indexOf(".dark {")))
  const dark = DANGER_FILL_PAIR.exec(css.slice(css.indexOf(".dark {")))
  for (const [theme, pair] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    assert.ok(pair, `${theme} theme must define both destructive colors`)
    const [a, b] = [luminance(pair[1]), luminance(pair[2])].sort((a, b) => b - a)
    assert.ok((a + 0.05) / (b + 0.05) >= 4.5, `${theme} destructive action must meet WCAG AA`)
  }
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
