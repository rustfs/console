import type { App } from 'vue'
// pinia的持久化插件
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

// 将所有的状态统一导出
export * from './app/index'
export * from './auth'
export * from './dict'
export * from './router'
export * from './tab'

// 安装pinia全局状态库
export function installPinia(app: App) {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app.use(pinia)
}
