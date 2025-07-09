import { configManager } from '~/utils/config'

export default defineNuxtPlugin({
  name: 'load-site-config',
  async setup(nuxtApp) {
    let finalConfig: any

    try {
      // 使用 configManager 加载配置（内部优先级：config.json > localStorage > runtimeconfig）
      const userConfig = await configManager.loadConfig()
      if (userConfig) {
        finalConfig = { ...useRuntimeConfig().public, ...userConfig }
        console.log('Configuration loaded from configManager')
      } else {
        // 如果 configManager 没有配置，使用 runtimeConfig
        finalConfig = useRuntimeConfig().public
        console.log('Configuration loaded from runtimeConfig')
      }

      // 如果有 public/config.json，尝试获取额外的信息（如 license）
      if (await configManager.hasPublicConfig()) {
        try {
          const response = await fetch('/config.json')
          const publicConfig = await response.json()

          // 保留 license 和其他额外信息
          if (publicConfig.license) {
            finalConfig.license = publicConfig.license
          }
          if (publicConfig.release) {
            finalConfig.release = publicConfig.release
          }
          if (publicConfig.doc) {
            finalConfig.doc = publicConfig.doc
          }

          // 获取 license 信息（如果不是开发环境）
          if (process.env.NODE_ENV !== 'development') {
            try {
              const licenseResponse = await fetch('/license')
              const licenseConfig = await licenseResponse.json()
              finalConfig.license = licenseConfig
            } catch (licenseError) {
              console.warn('Failed to load license info:', licenseError)
            }
          }
        } catch (error) {
          console.warn('Failed to load additional config info:', error)
        }
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
