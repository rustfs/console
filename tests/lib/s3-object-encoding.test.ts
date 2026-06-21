import test from "node:test"
import assert from "node:assert/strict"

const loadS3ObjectEncoding = () => import(new URL("../../lib/s3-object-encoding.ts", import.meta.url).href)

test("decodeS3UrlEncodedObjectList restores control-character object keys", async () => {
  const { decodeS3UrlEncodedObjectList } = await loadS3ObjectEncoding()
  const response = decodeS3UrlEncodedObjectList({
    EncodingType: "url",
    Prefix: "bad%2F",
    Delimiter: "%2F",
    StartAfter: "%04bad-prefix%2Fbefore.txt",
    Contents: [{ Key: "%04bad-prefix%2Fobject.txt" }],
    CommonPrefixes: [{ Prefix: "normal%2F" }],
  })

  assert.equal(response.StartAfter, "\x04bad-prefix/before.txt")
  assert.equal(response.Contents?.[0]?.Key, "\x04bad-prefix/object.txt")
  assert.equal(response.CommonPrefixes?.[0]?.Prefix, "normal/")
  assert.equal(response.Prefix, "bad/")
  assert.equal(response.Delimiter, "/")
})

test("decodeS3UrlEncodedObjectVersions restores encoded key markers", async () => {
  const { decodeS3UrlEncodedObjectVersions } = await loadS3ObjectEncoding()
  const response = decodeS3UrlEncodedObjectVersions({
    EncodingType: "url",
    Prefix: "%04bad-prefix%2F",
    KeyMarker: "%04bad-prefix%2Ffrom.txt",
    NextKeyMarker: "%04bad-prefix%2Fnext.txt",
    Versions: [{ Key: "%04bad-prefix%2Fobject.txt" }],
    DeleteMarkers: [{ Key: "%04bad-prefix%2Fdeleted.txt" }],
  })

  assert.equal(response.Prefix, "\x04bad-prefix/")
  assert.equal(response.KeyMarker, "\x04bad-prefix/from.txt")
  assert.equal(response.NextKeyMarker, "\x04bad-prefix/next.txt")
  assert.equal(response.Versions?.[0]?.Key, "\x04bad-prefix/object.txt")
  assert.equal(response.DeleteMarkers?.[0]?.Key, "\x04bad-prefix/deleted.txt")
})

test("S3 URL decoding leaves malformed values unchanged", async () => {
  const { decodeS3UrlEncodedObjectList } = await loadS3ObjectEncoding()
  const response = decodeS3UrlEncodedObjectList({
    EncodingType: "url",
    Contents: [{ Key: "%E0%A4%A" }],
  })

  assert.equal(response.Contents?.[0]?.Key, "%E0%A4%A")
})
