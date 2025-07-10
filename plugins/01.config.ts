import { configManager } from '~/utils/config'
import { logger } from '~/utils/logger'

export default defineNuxtPlugin({
  name: 'load-site-config',
  async setup(nuxtApp) {
    let finalConfig: any

    try {
      // 使用 configManager 加载配置（优先使用当前host）
      const config = await configManager.loadConfig()
      if (config) {
        finalConfig = { ...useRuntimeConfig().public, ...config }
        logger.log('Configuration loaded from configManager')
      } else {
        // 如果 configManager 没有配置，使用 runtimeConfig
        finalConfig = useRuntimeConfig().public
        logger.log('Configuration loaded from runtimeConfig')
      }
    } catch (error) {
      logger.error('Failed to load configuration:', error)

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

    if (!finalConfig.api?.baseURL && !finalConfig.serverHost) {
      // 如果仍然没有 baseURL 或 serverHost，重定向到登录页
      if (process.client) {
        const currentRoute = useRoute()
        if (currentRoute.path !== '/auth/login') {
          await navigateTo('/auth/login')
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
