import test from "node:test"
import assert from "node:assert/strict"

const loadErrorHandler = () => import(new URL("../../lib/error-handler.ts", import.meta.url).href)

test("getServiceErrorMessage prefers a specific error code over UnknownError", async () => {
  const { getServiceErrorMessage } = await loadErrorHandler()
  const error = {
    name: "UnknownError",
    message: "UnknownError",
    Error: {
      Code: "InvalidBucketName",
      Message: "The specified bucket is not valid.",
    },
  }

  assert.equal(getServiceErrorMessage(error), "InvalidBucketName")
})

test("getServiceErrorMessage falls back to a specific nested message when the code is generic", async () => {
  const { getServiceErrorMessage } = await loadErrorHandler()
  const error = {
    name: "UnknownError",
    message: "UnknownError",
    Error: {
      Code: "UnknownError",
      Message: "Bucket names cannot contain Chinese characters.",
    },
  }

  assert.equal(getServiceErrorMessage(error), "Bucket names cannot contain Chinese characters.")
})

test("getServiceErrorMessage keeps plain Error messages intact", async () => {
  const { getServiceErrorMessage } = await loadErrorHandler()
  assert.equal(getServiceErrorMessage(new Error("network timeout")), "network timeout")
})

test("getXmlErrorMessage extracts an error code when the XML has no message", async () => {
  const { getXmlErrorMessage } = await loadErrorHandler()
  const xml = '<?xml version="1.0" encoding="UTF-8"?><Error><Code>InvalidBucketName</Code></Error>'

  assert.equal(getXmlErrorMessage(xml), "InvalidBucketName")
})
