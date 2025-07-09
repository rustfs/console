import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
const isDev = process.env.NODE_ENV === 'development'

const appName = process.env.APP_NAME || 'RustFS'
const appDescription = process.env.APP_DESCRIPTION || 'RustFS is a distributed file system written in Rust.'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  css: ['~/assets/css/tailwind.css', '~/assets/css/overrides.css'],
  compatibilityDate: '2025-04-13',
  devtools: { enabled: true },
  app: {
    head: {
      title: appName,
      meta: [
        { name: 'description', content: appDescription },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // <link rel="icon" type = "image/png" sizes = "32x32" href = "/favicon-32x32.png" >
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        // <link rel="icon" type = "image/png" sizes = "16x16" href = "/favicon-16x16.png" >
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        // <link rel="apple-touch-icon" sizes = "180x180" href = "/apple-touch-icon.png" >
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
    }
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@pinia/nuxt', '@nuxt/icon', 'nuxtjs-naive-ui', '@vueuse/nuxt', '@nuxt/image'
  ],
  // Nuxt automatically reads the files in the plugins/ directory
  plugins: [],
  runtimeConfig: {
    public: {
      session: {
        // 临时凭证有效期
        durationSeconds: Number(process.env.SESSION_DURATION_SECONDS) || 3600 * 12
      },

      // 下面部分修改的时候记得同步修改 public/config.json
      // admin API 请求基础 URL
      api: {
        baseURL: process.env.API_BASE_URL || ''
      },

      // 对象存储配置
      s3: {
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT || process.env.API_BASE_URL || ''
      },

      // 版本信息
      release: {
        version: process.env.VERSION || 'dev-0.0.0',
        date: process.env.RELEASE_DATE || new Date().toISOString().slice(0, 10)
      },

      // 授权信息
      license: {
        // "name": "Apache-2.0",
        // "expired": 4102329600
      }
    }
  },
  i18n: {
    defaultLocale: 'en',
    strategy: 'no_prefix',
    locales: [
      {
        code: 'en',
        iso: 'en-US',
        name: 'English',
        file: 'en-US.json'
      },
      {
        code: 'zh',
        iso: 'zh-CN',
        name: '中文',
        file: 'zh-CN.json'
      }
    ],
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: true
    },
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
  },
})
