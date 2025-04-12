export default defineNuxtPlugin({
  name: 'load-site-config',
  async setup(nuxtApp) {
    let finalConfig: any

    // 客户端：尝试从 public/config.json 动态加载配置
    try {
      const response = await fetch('/config.json')
      const remoteConfig = await response.json()
      // 获取license
      const licenseResponse = await fetch('/license')
      const licenseConfig = await licenseResponse.json()
      remoteConfig.license = licenseConfig

      // 合并 public/runtimeConfig 与 remote 配置，remote 的优先
      finalConfig = { ...useRuntimeConfig().public, ...remoteConfig }
    } catch (error) {
      finalConfig = useRuntimeConfig().public
    }

    if (!finalConfig.api.baseURL) {
      throw new Error('API URL is not defined in the configuration.')
    }

    return {
      provide: {
        siteConfig: finalConfig
      }
    }
  }
})
