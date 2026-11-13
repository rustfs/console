import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const localeDir = path.resolve("i18n/locales")
const navigationLabels = {
  "Data Management": "数据管理",
  "Cluster Management": "集群管理",
  "Security and Compliance": "安全合规",
  Administration: "管理中心",
  "Pool Management": "存储池管理",
  "Bucket navigation": "存储桶导航",
  "Main navigation": "主导航",
  "Encryption & Keys": "加密与密钥",
  Decommission: "退役",
}

function readLocale(file) {
  return JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8"))
}

test("every locale translates the reorganized navigation without falling back to English", () => {
  const enUS = readLocale("en-US.json")
  const localeFiles = fs.readdirSync(localeDir).filter((file) => file.endsWith(".json"))

  for (const file of localeFiles) {
    const locale = readLocale(file)
    for (const key of Object.keys(navigationLabels)) {
      assert.equal(typeof locale[key], "string", `${file}: ${key}`)
      assert.ok(locale[key].trim(), `${file}: ${key}`)
      if (file !== "en-US.json") assert.notEqual(locale[key], enUS[key], `${file}: ${key}`)
    }
  }
})

test("Chinese navigation names identify their task and scope", () => {
  const zhCN = readLocale("zh-CN.json")

  for (const [key, label] of Object.entries(navigationLabels)) {
    assert.equal(zhCN[key], label, key)
  }
  assert.equal(zhCN.Operations, "运维")
})

test("navigation grouping leaves the existing data volume labels unchanged", () => {
  assert.equal(readLocale("en-US.json").Data, "Data")
  assert.equal(readLocale("zh-CN.json").Data, "数据量")
  assert.equal(readLocale("zh-TW.json").Data, "資料量")
})

test("navigation changes preserve existing feature labels", () => {
  const zhCN = readLocale("zh-CN.json")
  const labels = {
    Security: "安全",
    Encryption: "加密",
    "Access Keys": "访问密钥",
    Policies: "策略",
    "Import/Export": "导入 / 导出",
    "Running Status": "运行状态",
    "Event Destinations": "事件目标",
    "Audit Targets": "审计目标",
  }

  for (const [key, label] of Object.entries(labels)) {
    assert.equal(zhCN[key], label, key)
  }
})
