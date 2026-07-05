import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

const routesSource = fs.readFileSync("lib/routes.ts", "utf8")
const oidcSource = fs.readFileSync("lib/oidc.ts", "utf8")

test("safe redirects normalize the configured base path before router navigation", () => {
  assert.match(routesSource, /function stripBasePath\(path: string\): string/)
  assert.match(routesSource, /if \(path === BASE_PATH\) return "\/"/)
  assert.match(routesSource, /path\.startsWith\(`\$\{BASE_PATH\}\/`\)/)
  assert.match(routesSource, /const appPath = stripBasePath\(trimmed\)/)
  assert.match(routesSource, /return appPath/)
})

test("OIDC callback continues to validate redirect paths through the shared route guard", () => {
  assert.match(oidcSource, /import \{ isSafeRedirectPath \} from "@\/lib\/routes"/)
  assert.match(oidcSource, /redirect: isSafeRedirectPath\(params\.get\("redirect"\) \?\? "", "\/"\)/)
})
