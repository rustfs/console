import test from "node:test"
import assert from "node:assert/strict"
import { configManager } from "../../lib/config"
import { createDefaultConfig } from "../../lib/config-helpers"

const PREFIX_ENV = "NEXT_PUBLIC_API_PREFIX"
const HOST_ENV = "NEXT_PUBLIC_SERVER_HOST"

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => T): T {
  const prev: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(vars)) {
    prev[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  try {
    return fn()
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

test("config: backward-compat — empty prefix yields the original URLs", () => {
  configManager.clearCache()
  withEnv(
    { [PREFIX_ENV]: "", [HOST_ENV]: "https://app.example.com" },
    () => {
      const cfg = configManager.loadRuntimeConfig()
      assert.ok(cfg)
      assert.equal(cfg.s3.endpoint, "https://app.example.com")
      assert.equal(cfg.api.baseURL, "https://app.example.com/rustfs/admin/v3")
    },
  )
})

test("config: loadRuntimeConfig adds the prefix to api.baseURL only (s3.endpoint stays clean)", () => {
  configManager.clearCache()
  withEnv(
    { [PREFIX_ENV]: "/rustfs/api", [HOST_ENV]: "https://app.example.com" },
    () => {
      const cfg = configManager.loadRuntimeConfig()
      assert.ok(cfg)
      assert.equal(cfg.api.baseURL, "https://app.example.com/rustfs/api/rustfs/admin/v3")
      assert.equal(cfg.s3.endpoint, "https://app.example.com")
    },
  )
})

test("config: createDefaultConfig adds the prefix to api.baseURL only (browser-fallback path)", () => {
  withEnv({ [PREFIX_ENV]: "/rustfs/api" }, () => {
    const cfg = createDefaultConfig("https://app.example.com")
    assert.equal(cfg.api.baseURL, "https://app.example.com/rustfs/api/rustfs/admin/v3")
    assert.equal(cfg.s3.endpoint, "https://app.example.com")
  })
})

test("config: createDefaultConfig with empty prefix yields the original URLs", () => {
  withEnv({ [PREFIX_ENV]: "" }, () => {
    const cfg = createDefaultConfig("https://app.example.com")
    assert.equal(cfg.api.baseURL, "https://app.example.com/rustfs/admin/v3")
    assert.equal(cfg.s3.endpoint, "https://app.example.com")
  })
})

test("config: trailing slash on the prefix is normalized away", () => {
  withEnv({ [PREFIX_ENV]: "/rustfs/api/" }, () => {
    const cfg = createDefaultConfig("https://app.example.com")
    assert.equal(cfg.api.baseURL, "https://app.example.com/rustfs/api/rustfs/admin/v3")
  })
})
