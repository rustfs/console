import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

const globalsCssUrl = new URL("../../app/globals.css", import.meta.url)

const SCRIPT_FALLBACKS = ["latin", "han", "kana", "hangul", "arabic"] as const

function readStack(source: string, token: string): string {
  const stack = source.match(new RegExp(`${token}:([^;]+);`))?.[1]
  assert.ok(stack, `missing ${token} declaration`)
  return stack
}

test("font stacks name script faces before the generic family", async () => {
  const source = await readFile(globalsCssUrl, "utf8")

  for (const token of ["--font-sans", "--font-heading", "--font-mono"]) {
    const stack = readStack(source, token)
    const fallbackIndex = stack.indexOf("var(--font-fallback)")
    const genericIndex = stack.search(/(sans-serif|monospace)\s*$/)

    assert.ok(fallbackIndex >= 0, `${token} must list var(--font-fallback)`)
    assert.ok(genericIndex > fallbackIndex, `${token} must place script faces before its generic family`)
  }
})

test("every supported script has a concrete fallback face", async () => {
  const source = await readFile(globalsCssUrl, "utf8")

  for (const script of SCRIPT_FALLBACKS) {
    const faces = readStack(source, `--font-${script}`)
    assert.match(faces, /"[^"]+"/, `--font-${script} must name at least one concrete family`)
  }

  const fallback = readStack(source, "--font-fallback")
  for (const script of SCRIPT_FALLBACKS) {
    assert.ok(fallback.includes(`var(--font-${script})`), `--font-fallback must include --font-${script}`)
  }
})

test("Japanese and Korean prefer their own faces over Chinese ones", async () => {
  const source = await readFile(globalsCssUrl, "utf8")

  const kanaFirst = readStack(source, "--font-fallback")
  assert.ok(source.includes(":root:lang(ja)"), "missing Japanese language override")

  const jaStack = source.match(/:root:lang\(ja\)\s*\{[\s\S]*?\}/)?.[0]
  assert.ok(jaStack)
  assert.ok(jaStack.indexOf("var(--font-kana)") < jaStack.indexOf("var(--font-han)"))

  const koStack = source.match(/:root:lang\(ko\)\s*\{[\s\S]*?\}/)?.[0]
  assert.ok(koStack)
  assert.ok(koStack.indexOf("var(--font-hangul)") < koStack.indexOf("var(--font-han)"))

  assert.ok(kanaFirst.includes("var(--font-han)"))
  assert.ok(kanaFirst.includes("var(--font-hangul)"))
})

test("the document root applies the sans stack so the fallback is always active", async () => {
  const source = await readFile(globalsCssUrl, "utf8")
  assert.match(source, /html\s*\{\s*@apply font-sans;/)
})
