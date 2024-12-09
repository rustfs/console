import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
const isDev = process.env.NODE_ENV === 'development'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  css: ['~/assets/css/tailwind.css'],
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@nuxt/icon',
    'nuxtjs-naive-ui',
    '@vueuse/nuxt'
  ],
  plugins: ['~/plugins/api.ts', '~/plugins/s3.ts'],
  runtimeConfig: {
    public: {
      api: {
        baseURL: process.env.API_BASE_URL || ''
      },
      // 临时配置，后续登录后从本地存储中获取
      s3: {
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT || process.env.API_BASE_URL || '',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        sessionToken: process.env.S3_SESSION_TOKEN || ''
      }
    },
  },
  i18n: {
    vueI18n: './i18n.config.ts'
  },
  typescript: {
    typeCheck: true
  },
  vite: {
    plugins: [
      AutoImport({
        imports: [
          {
            'naive-ui': [
              'useDialog',
              'useMessage',
              'useNotification',
              'useLoadingBar'
            ]
          }
        ]
      }),
      Components({
        resolvers: [NaiveUiResolver()]
      })
    ]
  }
})
