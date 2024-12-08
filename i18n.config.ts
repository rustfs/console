import en from '~/locales/en-US.json'
import zh from '~/locales/zh-CN.json'
export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  locales: [
    { code: 'en', language: 'en-US' },
    { code: 'zh', language: 'zh-CN' }
  ],
  defaultLocale: 'en',
  messages: { en, zh }
}))
