import fs from 'node:fs'
import path from 'node:path'
import fetch from 'node-fetch'
import { translate } from 'google-translate-api-x'

if (!global.fetch) {
  global.fetch = fetch
}

// 读取英文语言包
const enPath = 'i18n/locales/en-US.json'
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'))
const keys = Object.keys(en).sort()

// 语言映射配置
const languages = {
  'zh-CN': { name: '简体中文', target: 'zh-CN' },
  'ja-JP': { name: '日语', target: 'ja' },
  'ko-KR': { name: '韩语', target: 'ko' },
  'de-DE': { name: '德语', target: 'de' },
  'es-ES': { name: '西班牙语', target: 'es' },
  'pt-BR': { name: '葡萄牙语', target: 'pt' },
  'it-IT': { name: '意大利语', target: 'it' },
  'ru-RU': { name: '俄语', target: 'ru' },
  'fr-FR': { name: '法语', target: 'fr' },
  'tr-TR': { name: '土耳其语', target: 'tr' },
  'id-ID': { name: '印尼语', target: 'id' },
}

console.log(`开始同步 ${keys.length} 个键到 ${Object.keys(languages).length} 种语言...`)

// 辅助函数：延迟执行，避免触发频率限制
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function processLanguages() {
  for (const locale of Object.keys(languages)) {
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
    let translatedCount = 0
    const missingKeys = []

    // 1. 保留现有翻译并识别缺失键
    keys.forEach(key => {
      // 如果键不存在，或者值与英文原文相同（说明之前是占位），则需要翻译
      if (!existingTranslations[key] || existingTranslations[key] === en[key]) {
        missingKeys.push(key)
        newTranslations[key] = en[key] // 暂时使用英文占位
        addedCount++
      } else {
        newTranslations[key] = existingTranslations[key]
      }
    })

    // 2. 对缺失键进行翻译
    if (missingKeys.length > 0) {
      console.log(`  发现 ${missingKeys.length} 个缺失的键，正在尝试自动翻译...`)

      for (const key of missingKeys) {
        try {
          // 简单的防速率限制
          await delay(200)

          const sourceText = en[key]
          const res = await translate(sourceText, { to: lang.target })

          if (res && res.text) {
            newTranslations[key] = res.text
            translatedCount++
            process.stdout.write('.')
          } else {
            process.stdout.write('x')
          }
        } catch (error) {
          // 如果是网络错误，尝试重试一次
          try {
            await delay(1000)
            const sourceText = en[key]
            const res = await translate(sourceText, { to: lang.target, forceBatch: false })
            if (res && res.text) {
              newTranslations[key] = res.text
              translatedCount++
              process.stdout.write('.')
            } else {
              console.error(`\n  翻译失败 (重试后): "${key}" -> ${error.message}`)
            }
          } catch (retryError) {
            console.error(`\n  翻译失败: "${key}" -> ${retryError.message}`)
          }
        }
      }
      console.log('') // 换行
    }

    // 3. 保留源文件中没有但目标文件中有的键（可选）
    Object.keys(existingTranslations).forEach(key => {
      if (!en[key]) {
        newTranslations[key] = existingTranslations[key]
      }
    })

    // 4. 按字母顺序排序键
    const sortedTranslations = {}
    Object.keys(newTranslations)
      .sort()
      .forEach(key => {
        sortedTranslations[key] = newTranslations[key]
      })

    // 保存文件
    const content = JSON.stringify(sortedTranslations, null, 2) + '\n'
    fs.writeFileSync(filePath, content, 'utf8')

    if (addedCount > 0) {
      console.log(`  + 新增了 ${addedCount} 个键，其中 ${translatedCount} 个已自动翻译`)
    } else {
      console.log(`  ✓ 已是最新`)
    }
  }

  console.log('\n同步完成！')
}

processLanguages().catch(err => {
  console.error('同步过程中发生错误:', err)
})
