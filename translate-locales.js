import fs from 'node:fs'
import path from 'node:path'

// 读取英文语言包
const enPath = 'i18n/locales/en-US.json'
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
const keys = Object.keys(en).sort()

// 语言映射配置
const languages = {
  'zh-CN': { name: '简体中文' },
  'ja-JP': { name: '日语' },
  'ko-KR': { name: '韩语' },
  'de-DE': { name: '德语' },
  'es-ES': { name: '西班牙语' },
  'pt-BR': { name: '葡萄牙语' },
  'it-IT': { name: '意大利语' },
  'ru-RU': { name: '俄语' },
  'fr-FR': { name: '法语' },
  'tr-TR': { name: '土耳其语' },
  'id-ID': { name: '印尼语' },
}

console.log(`开始同步 ${keys.length} 个键到 ${Object.keys(languages).length} 种语言...`)

Object.keys(languages).forEach(locale => {
  const lang = languages[locale]
  const filePath = `i18n/locales/${locale}.json`

  console.log(`\n处理 ${lang.name} (${locale})...`)

  let existingTranslations = {}
  try {
    if (fs.existsSync(filePath)) {
      existingTranslations = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    }
  } catch (e) {
    console.warn(`无法读取 ${filePath}，将创建新文件`)
  }

  const newTranslations = {}
  let addedCount = 0
  let missingCount = 0

  keys.forEach(key => {
    if (existingTranslations[key]) {
      // 保留现有翻译
      newTranslations[key] = existingTranslations[key]
    } else {
      // 缺失键，使用英文占位
      newTranslations[key] = en[key]
      addedCount++
    }
  })

  // 保留源文件中没有但目标文件中有的键（可选）
  Object.keys(existingTranslations).forEach(key => {
    if (!en[key]) {
      newTranslations[key] = existingTranslations[key]
    }
  })

  // 保存文件
  const content = JSON.stringify(newTranslations, null, 2) + '\n'
  fs.writeFileSync(filePath, content, 'utf8')

  if (addedCount > 0) {
    console.log(`  + 新增了 ${addedCount} 个缺失的键 (使用英文填充)`)
  } else {
    console.log(`  ✓ 已是最新`)
  }
})

console.log('\n同步完成！')
