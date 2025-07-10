import type { SiteConfig } from '~/types/config'
import { handleConfigError } from './error-handler'
import { logger } from './logger'
import { 
  createDefaultConfig, 
  getStoredHostConfig, 
  getCurrentBrowserConfig, 
  getServerDefaultConfig 
} from './config-helpers'

export interface RustFSConfig {
  serverHost: string
  api: {
    baseURL: string
  }
  s3: {
    endpoint: string
    region: string
  }
}

// 添加配置缓存
let configCache: SiteConfig | null = null
let configCacheTime = 0
const CACHE_DURATION = 60000 // 1分钟缓存

export const configManager = {
  // 获取当前host配置
  getCurrentHostConfig(): SiteConfig {
    // 优先使用localStorage中保存的配置
    const storedConfig = getStoredHostConfig()
    if (storedConfig) {
      return storedConfig
    }

    // 使用当前浏览器地址
    const browserConfig = getCurrentBrowserConfig()
    if (browserConfig) {
      return browserConfig
    }

    // 服务端fallback
    return getServerDefaultConfig()
  },

  // 从 nuxt runtimeconfig 读取配置
  loadRuntimeConfig(): SiteConfig | null {
    try {
      const runtimeConfig = useRuntimeConfig()
      
      // 优先使用 serverHost，然后是 API_BASE_URL
      const serverHost = runtimeConfig.public?.serverHost || 
                        runtimeConfig.public?.api?.baseURL?.replace(/\/rustfs\/admin\/v3$/, '')
      
      if (serverHost) {
        return {
          serverHost,
          api: {
            baseURL: runtimeConfig.public.api?.baseURL || `${serverHost}/rustfs/admin/v3`
          },
          s3: {
            endpoint: runtimeConfig.public.s3?.endpoint || serverHost,
            region: runtimeConfig.public.s3?.region || 'us-east-1',
            accessKeyId: '',
            secretAccessKey: ''
          },
          session: runtimeConfig.public.session
        }
      }
    } catch (error) {
      const configError = handleConfigError(error, 'runtime config loading')
      logger.warn('Failed to load runtime config:', configError.message)
    }
    return null
  },

  // 加载配置：优先使用localStorage，然后是当前host，最后是runtimeconfig
  async loadConfig(): Promise<SiteConfig> {
    // 检查缓存
    const now = Date.now()
    if (configCache && (now - configCacheTime) < CACHE_DURATION) {
      return configCache
    }

    let config: SiteConfig

    // 优先使用当前host配置（包括localStorage检查）
    const currentHostConfig = this.getCurrentHostConfig()
    if (currentHostConfig) {
      config = currentHostConfig
    } else {
      // 如果没有当前host配置，使用 runtimeconfig
      const runtimeConfig = this.loadRuntimeConfig()
      if (runtimeConfig) {
        config = runtimeConfig
      } else {
        // 最后使用浏览器当前地址或服务端默认值
        config = getCurrentBrowserConfig() || getServerDefaultConfig()
      }
    }

    // 缓存配置
    configCache = config
    configCacheTime = now
    return config
  },

  // 清除缓存
  clearCache() {
    configCache = null
    configCacheTime = 0
  },

  // 检查是否有有效配置
  async hasValidConfig(): Promise<boolean> {
    const config = await this.loadConfig()
    return !!(config?.serverHost && config?.api?.baseURL)
  }
}