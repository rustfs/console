import tailwindcss from '@tailwindcss/vite'
const appName = process.env.APP_NAME || 'RustFS'
const baseUrl = (process.env.BASE_URL || '/rustfs/console/').replace(/\/$/, '')
const appDescription = process.env.APP_DESCRIPTION || 'RustFS is a distributed file system written in Rust.'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false,
  css: ['~/assets/css/tailwind.css', '~/assets/css/overrides.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    baseURL: baseUrl,

    head: {
      title: appName,
      meta: [{ name: 'description', content: appDescription }],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: baseUrl + '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: baseUrl + '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: baseUrl + '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: baseUrl + '/apple-touch-icon.png' },
        { rel: 'manifest', href: baseUrl + '/site.webmanifest' },
      ],
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
    },
  },

  modules: ['shadcn-nuxt', '@nuxtjs/i18n', '@pinia/nuxt', '@nuxt/icon', '@vueuse/nuxt', '@nuxt/image'],
  // Nuxt automatically reads the files in the plugins/ directory
  plugins: [],
  runtimeConfig: {
    public: {
      session: {
        // 临时凭证有效期
        durationSeconds: Number(process.env.SESSION_DURATION_SECONDS) || 3600 * 12,
      },

      // 服务器地址
      serverHost: process.env.SERVER_HOST || '',

      // admin API 请求基础 URL
      api: {
        baseURL: process.env.API_BASE_URL || '',
      },

      // 对象存储配置
      s3: {
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT || process.env.API_BASE_URL || '',
      },

      // 版本信息
      release: {
        version: process.env.VERSION || '',
        date: process.env.RELEASE_DATE || new Date().toISOString().slice(0, 10),
      },

      // 授权信息
      license: {
        // "name": "Apache-2.0",
        // "expired": 4102329600
      },
    },
  },
  i18n: {
    defaultLocale: 'en',
    strategy: 'no_prefix',
    locales: [
      {
        code: 'en',
        iso: 'en-US',
        name: 'English',
        file: 'en-US.json',
      },
      {
        code: 'zh',
        iso: 'zh-CN',
        name: '中文',
        file: 'zh-CN.json',
      },
      {
        code: 'ja',
        iso: 'ja-JP',
        name: '日本語',
        file: 'ja-JP.json',
      },
      {
        code: 'ko',
        iso: 'ko-KR',
        name: '한국어',
        file: 'ko-KR.json',
      },
      {
        code: 'de',
        iso: 'de-DE',
        name: 'Deutsch',
        file: 'de-DE.json',
      },
      {
        code: 'fr',
        iso: 'fr-FR',
        name: 'Français',
        file: 'fr-FR.json',
      },
      {
        code: 'es',
        iso: 'es-ES',
        name: 'Español',
        file: 'es-ES.json',
      },
      {
        code: 'pt',
        iso: 'pt-BR',
        name: 'Português',
        file: 'pt-BR.json',
      },
      {
        code: 'it',
        iso: 'it-IT',
        name: 'Italiano',
        file: 'it-IT.json',
      },
      {
        code: 'ru',
        iso: 'ru-RU',
        name: 'Русский',
        file: 'ru-RU.json',
      },
      {
        code: 'tr',
        iso: 'tr-TR',
        name: 'Türkçe',
        file: 'tr-TR.json',
      },
      {
        code: 'id',
        iso: 'id-ID',
        name: 'Bahasa Indonesia',
        file: 'id-ID.json',
      },
    ],
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: true,
    },
  },
  typescript: {
    typeCheck: true,
  },
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: './components/ui',
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
