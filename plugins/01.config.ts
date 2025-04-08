export default defineNuxtPlugin({
  name: 'load-site-config',
  async setup(nuxtApp) {
    console.log('load-site-config setup');

    let finalConfig: any

    // 客户端：尝试从 public/config.json 动态加载配置
    try {
      const response = await fetch('/config.json')
      const remoteConfig = await response.json()
      // 获取license
      const licenseResponse = await fetch('/license')
      const licenseConfig = await licenseResponse.json()
      if (licenseConfig !== null) {
        remoteConfig.license = licenseConfig
      } else {
         remoteConfig.license = false
      }

      // 合并 public/runtimeConfig 与 remote 配置，remote 的优先
      finalConfig = { ...useRuntimeConfig().public, ...remoteConfig }
      console.log('加载 public/config.json 成功:', remoteConfig)
    } catch (error) {
      console.error('加载 public/config.json 失败，使用 runtimeConfig:', error)
      finalConfig = useRuntimeConfig().public
    }

    console.log('siteConfig:', finalConfig);

    return {
      provide: {
        siteConfig: finalConfig
      }
    }
  }
})
