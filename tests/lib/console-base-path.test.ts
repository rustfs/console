import test from "node:test"
import type { TestContext } from "node:test"
import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { AwsClient } from "../../lib/aws4fetch"
import { checkServerHealth, fetchVersionConfigFromServer } from "../../lib/config-helpers"
import { getLoginRoute } from "../../lib/routes"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/rustfs/console"
const serverHost = "https://console.example.com"

function stubGlobal(t: TestContext, name: string, value: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name)
  Object.defineProperty(globalThis, name, { configurable: true, value })
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, name, previous)
    else Reflect.deleteProperty(globalThis, name)
  })
}

test("console health checks use the configured base path", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 200 }))

  const result = await checkServerHealth(serverHost)

  assert.equal(result.url, `${serverHost}${basePath}/health`)
  assert.equal(fetchMock.mock.calls[0].arguments[0], result.url)
  assert.equal(fetchMock.mock.calls[0].arguments[1]?.method, "HEAD")
})

test("console health checks retain the root health fallback", async (t) => {
  const requests: string[] = []
  t.mock.method(globalThis, "fetch", async (input: unknown) => {
    requests.push(String(input))
    return new Response(null, { status: requests.length === 1 ? 404 : 200 })
  })

  const result = await checkServerHealth(serverHost)

  assert.equal(result.healthy, true)
  assert.deepEqual(requests, [`${serverHost}${basePath}/health`, `${serverHost}/health`])
})

test("console version requests use the configured base path", async (t) => {
  stubGlobal(t, "window", {})
  stubGlobal(t, "localStorage", {
    getItem: (key: string) =>
      key === "auth.permanent" ? JSON.stringify({ AccessKeyId: "test-access", SecretAccessKey: "test-secret" }) : null,
  })
  const fetchMock = t.mock.method(AwsClient.prototype, "fetch", async () => Response.json({ version: "test" }))

  assert.deepEqual(await fetchVersionConfigFromServer(serverHost), { version: "test" })
  assert.equal(fetchMock.mock.calls[0].arguments[0], `${serverHost}${basePath}/version`)
})

test("console login links retain the configured base path", (t) => {
  stubGlobal(t, "window", { location: { pathname: `${basePath}/buckets/` } })
  assert.equal(getLoginRoute(), `${basePath}/auth/login`)
})

test("static export preparation puts assets under the configured base path", (t) => {
  const directory = mkdtempSync(join(tmpdir(), "console-base-path-"))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  mkdirSync(join(directory, "out", "_next"), { recursive: true })
  writeFileSync(join(directory, "out", "index.html"), "<html>console</html>")
  writeFileSync(join(directory, "out", "_next", "app.js"), "console.log('asset')")

  execFileSync(
    process.execPath,
    [fileURLToPath(new URL("../../scripts/prepare-static-basepath.js", import.meta.url))],
    {
      cwd: directory,
      env: { ...process.env, NEXT_PUBLIC_BASE_PATH: basePath },
    },
  )

  const exportedPath = join(directory, "out", basePath.slice(1))
  assert.equal(readFileSync(join(exportedPath, "index.html"), "utf8"), "<html>console</html>")
  assert.equal(readFileSync(join(exportedPath, "_next", "app.js"), "utf8"), "console.log('asset')")
})
