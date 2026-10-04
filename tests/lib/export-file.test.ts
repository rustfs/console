import test from "node:test"
import assert from "node:assert/strict"
import { downloadUrl } from "../../lib/export-file"

test("downloadUrl creates and clicks a browser download link", () => {
  const clicked: { href?: string; download?: string; rel?: string; removed: boolean } = { removed: false }
  const originalDocument = globalThis.document
  const link = {
    href: "",
    download: "",
    rel: "",
    style: { display: "" },
    click() {
      clicked.href = link.href
      clicked.download = link.download
      clicked.rel = link.rel
    },
    remove() {
      clicked.removed = true
    },
  }

  globalThis.document = {
    createElement: () => link as unknown as HTMLAnchorElement,
    body: { appendChild: () => link },
  } as unknown as Document

  try {
    downloadUrl("https://storage.example/object?signature=test", "报告.pdf")
  } finally {
    globalThis.document = originalDocument
  }

  assert.equal(clicked.href, "https://storage.example/object?signature=test")
  assert.equal(clicked.download, "报告.pdf")
  assert.equal(clicked.rel, "noopener")
  assert.equal(clicked.removed, true)
})
