import test from "node:test"
import assert from "node:assert/strict"

import { DEFAULT_LOCALE, getLocaleFile, isRtlLocale, normalizeLocale } from "../../lib/i18n-config.js"

test("normalizeLocale accepts supported, browser, and legacy locale values", () => {
  assert.equal(DEFAULT_LOCALE, "en")
  assert.equal(normalizeLocale("en-US"), "en")
  assert.equal(normalizeLocale("zh_CN"), "zh")
  assert.equal(normalizeLocale("zhCN"), "zh")
  assert.equal(normalizeLocale("pt-BR"), "pt")
  assert.equal(normalizeLocale("pt_BR"), "pt")
  assert.equal(normalizeLocale("ar-MA"), "ar")
  assert.equal(normalizeLocale("unknown"), "en")
})

test("normalizeLocale routes Traditional Chinese variants to zh-TW", () => {
  assert.deepEqual(["zh-TW", "zh_TW", "zh-Hant", "zh-Hant-TW", "zh-HK", "zh-MO"].map(normalizeLocale), [
    "zh-TW",
    "zh-TW",
    "zh-TW",
    "zh-TW",
    "zh-TW",
    "zh-TW",
  ])
})

test("normalizeLocale keeps Simplified Chinese variants on zh", () => {
  assert.deepEqual(["zh", "zh-CN", "zh-Hans", "zh-SG"].map(normalizeLocale), ["zh", "zh", "zh", "zh"])
})

test("getLocaleFile resolves normalized locales to bundled locale files", () => {
  assert.equal(getLocaleFile("en-US"), "en-US")
  assert.equal(getLocaleFile("zh_CN"), "zh-CN")
  assert.equal(getLocaleFile("zh-TW"), "zh-TW")
  assert.equal(getLocaleFile("pt-BR"), "pt-BR")
})

test("isRtlLocale detects right-to-left languages after normalization", () => {
  assert.equal(isRtlLocale("ar-MA"), true)
  assert.equal(isRtlLocale("ar"), true)
  assert.equal(isRtlLocale("en-US"), false)
})
