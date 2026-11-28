import assert from "node:assert/strict"
import test from "node:test"
import { createHlsPreviewSource } from "../../lib/hls-preview"

const objectKey = "media + 视频/index.m3u8"
const manifestUrl =
  "https://s3.example.test/s3/private/media%20%2B%20%E8%A7%86%E9%A2%91/index.m3u8?versionId=old&X-Amz-Signature=private"

test("the player resolves relative HLS resources without exposing the manifest signature", async () => {
  const signed: [string, string | undefined][] = []
  const source = createHlsPreviewSource(manifestUrl, "private", objectKey, async (key, versionId) => {
    signed.push([key, versionId])
    return "https://s3.example.test/s3/private/signed?X-Amz-Signature=object"
  })

  assert.equal(source.url, manifestUrl.split("&")[0])
  await source.request(source.url, {})
  await source.request("index.m3u8?versionId=another-version", {})
  await source.request("variant/level.m3u8", {})
  await source.request("../segments/a%2Bb+%2525.ts?versionId=segment-version&X-Amz-Signature=untrusted", {})
  assert.deepEqual(signed, [
    [objectKey, "old"],
    [objectKey, "another-version"],
    ["media + 视频/variant/level.m3u8", undefined],
    ["segments/a+b+%25.ts", "segment-version"],
  ])
})

test("HLS requests preserve the byte range and abort signal and reject redirects", async () => {
  const source = createHlsPreviewSource(manifestUrl, "private", objectKey, async () => manifestUrl)
  const controller = new AbortController()
  const request = await source.request("video.ts", { headers: { Range: "bytes=53-99" }, signal: controller.signal })

  assert.equal(request.headers.get("Range"), "bytes=53-99")
  assert.equal(request.url, manifestUrl)
  assert.equal(request.redirect, "error")
  assert.equal(request.credentials, "omit")
  controller.abort()
  assert.equal(request.signal.aborted, true)
})

test("HLS never signs requests outside the preview bucket or with ambiguous traversal", async () => {
  const source = createHlsPreviewSource(manifestUrl, "private", objectKey, async () => {
    assert.fail("Unexpected signing request")
  })
  for (const url of [
    "https://other.example.test/s3/private/video.ts",
    "https://user@s3.example.test/s3/private/video.ts",
    "/s3/private-other/video.ts",
    "../../other-bucket/video.ts",
    "/s3/private/%2E%2E%2Fother-bucket/video.ts",
    "/s3/private/",
  ]) {
    await assert.rejects(source.request(url, {}), /outside the preview bucket|Invalid HLS object key/)
  }
  assert.throws(() => createHlsPreviewSource(manifestUrl, "other-bucket", objectKey, async () => ""), /Invalid HLS/)
})

test("HLS skips signing after the caller cancels a request", async () => {
  const source = createHlsPreviewSource(manifestUrl, "private", objectKey, async () => {
    assert.fail("Unexpected signing request")
  })
  await assert.rejects(source.request("video.ts", { signal: AbortSignal.abort() }), { name: "AbortError" })
})
