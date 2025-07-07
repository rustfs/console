import { configManager } from '~/utils/config'

export default defineNuxtPlugin({
  name: 'load-site-config',
  async setup(nuxtApp) {
    let finalConfig: any

    // 优先级：localStorage > public/config.json > runtimeConfig
    try {
      // 1. 首先尝试从 localStorage 读取配置
      const localStorageConfig = configManager.loadConfig()
      if (localStorageConfig) {
        finalConfig = { ...useRuntimeConfig().public, ...localStorageConfig }
        console.log('Configuration loaded from localStorage')
      }

      // 2. 如果 localStorage 没有配置，尝试从 public/config.json 加载
      if (!finalConfig) {
        const response = await fetch('/config.json')
        const remoteConfig = await response.json()

        // 获取license
        // 判断是否是开发环境
        if (process.env.NODE_ENV !== 'development') {
          const licenseResponse = await fetch('/license')
          const licenseConfig = await licenseResponse.json()
          remoteConfig.license = licenseConfig
        }

        // 合并 public/runtimeConfig 与 remote 配置，remote 的优先
        finalConfig = { ...useRuntimeConfig().public, ...remoteConfig }
        console.log('Configuration loaded from config.json')
      }

      // 3. 如果都没有，使用 runtimeConfig
      if (!finalConfig) {
        finalConfig = useRuntimeConfig().public
        console.log('Configuration loaded from runtimeConfig')
      }

    } catch (error) {
      console.error('Failed to load configuration:', error)

      // 如果配置加载失败，重定向到登录页而不是抛出错误
      if (process.client) {
        const currentRoute = useRoute()
        if (currentRoute.path !== '/auth/login') {
          await navigateTo('/auth/login')
        }
      }

      // 使用默认配置，避免应用崩溃
      finalConfig = useRuntimeConfig().public
    }

    if (!finalConfig.api.baseURL) {
      // 如果仍然没有 baseURL，重定向到登录页
      if (process.client) {
        const currentRoute = useRoute()
        if (currentRoute.path !== '/auth/login') {
          await navigateTo('/auth/login?showConfig=1')
        }
      }
    }

    return {
      provide: {
        siteConfig: finalConfig
      }
    }
  }
})
