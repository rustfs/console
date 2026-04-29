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

test("getLocaleFile resolves normalized locales to bundled locale files", () => {
  assert.equal(getLocaleFile("en-US"), "en-US")
  assert.equal(getLocaleFile("zh_CN"), "zh-CN")
  assert.equal(getLocaleFile("pt-BR"), "pt-BR")
})

test("isRtlLocale detects right-to-left languages after normalization", () => {
  assert.equal(isRtlLocale("ar-MA"), true)
  assert.equal(isRtlLocale("ar"), true)
  assert.equal(isRtlLocale("en-US"), false)
})
