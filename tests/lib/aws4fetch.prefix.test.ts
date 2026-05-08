import test from "node:test"
import assert from "node:assert/strict"
import { AwsV4Signer } from "../../lib/aws4fetch"

const baseOpts = {
  accessKeyId: "AKID",
  secretAccessKey: "SECRET",
  service: "s3",
  region: "us-east-1",
}

const PREFIX_ENV = "NEXT_PUBLIC_API_PREFIX"

function withEnv<T>(value: string | undefined, fn: () => T): T {
  const prev = process.env[PREFIX_ENV]
  if (value === undefined) delete process.env[PREFIX_ENV]
  else process.env[PREFIX_ENV] = value
  try {
    return fn()
  } finally {
    if (prev === undefined) delete process.env[PREFIX_ENV]
    else process.env[PREFIX_ENV] = prev
  }
}

test("AwsV4Signer: backward-compat — signs the full pathname when prefix is empty", () => {
  withEnv("", () => {
    const s = new AwsV4Signer({ ...baseOpts, url: "https://example.com/foo/bar" })
    assert.equal(s.encodedPath, "/foo/bar")
  })
})

test("AwsV4Signer: strips the prefix from the canonical path when set (root)", () => {
  withEnv("/rustfs/api", () => {
    const s = new AwsV4Signer({ ...baseOpts, url: "https://example.com/rustfs/api/" })
    assert.equal(s.encodedPath, "/")
  })
})

test("AwsV4Signer: strips the prefix from a path-style bucket+key URL", () => {
  withEnv("/rustfs/api", () => {
    const s = new AwsV4Signer({
      ...baseOpts,
      url: "https://example.com/rustfs/api/mybucket/key.txt",
    })
    assert.equal(s.encodedPath, "/mybucket/key.txt")
  })
})

test("AwsV4Signer: does NOT strip when the request path doesn't start with the prefix", () => {
  withEnv("/rustfs/api", () => {
    const s = new AwsV4Signer({ ...baseOpts, url: "https://example.com/other/path" })
    assert.equal(s.encodedPath, "/other/path")
  })
})

test("AwsV4Signer: preserves this.url (wire URL) untouched even when prefix is stripped from signing", () => {
  withEnv("/rustfs/api", () => {
    const s = new AwsV4Signer({
      ...baseOpts,
      url: "https://example.com/rustfs/api/foo?Action=ListBuckets",
    })
    assert.equal(s.url.pathname, "/rustfs/api/foo")
    assert.equal(s.url.search, "?Action=ListBuckets")
  })
})

test("AwsV4Signer: normalizes a trailing slash on the prefix", () => {
  withEnv("/rustfs/api/", () => {
    const s = new AwsV4Signer({
      ...baseOpts,
      url: "https://example.com/rustfs/api/mybucket",
    })
    assert.equal(s.encodedPath, "/mybucket")
  })
})
