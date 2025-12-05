import type { SiteConfig } from '~/types/config'
import { handleConfigError } from './error-handler'
import { logger } from './logger'
import {
  createDefaultConfig,
  getStoredHostConfig,
  getCurrentBrowserConfig,
  getServerDefaultConfig,
  fetchConfigFromServer,
  fetchRawConfigFromServer,
  fetchVersionConfigFromServer,
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
  session?: {
    durationSeconds: number
  }
  release?: {
    version?: string
    date?: string
  }
}

// 添加配置缓存
let configCache: SiteConfig | null = null
let configCacheTime = 0
const CACHE_DURATION = 60000 // 1分钟缓存

export const configManager = {
  // 从 nuxt runtimeconfig 读取配置
  loadRuntimeConfig(): SiteConfig | null {
    try {
      const runtimeConfig = useRuntimeConfig()

      // 优先使用 serverHost，然后是 API_BASE_URL
      const serverHost =
        runtimeConfig.public?.serverHost || runtimeConfig.public?.api?.baseURL?.replace(/\/rustfs\/admin\/v3$/, '')

      if (serverHost) {
        return {
          serverHost,
          api: {
            baseURL: runtimeConfig.public.api?.baseURL || `${serverHost}/rustfs/admin/v3`,
          },
          s3: {
            endpoint: runtimeConfig.public.s3?.endpoint || serverHost,
            region: runtimeConfig.public.s3?.region || 'us-east-1',
            accessKeyId: '',
            secretAccessKey: '',
          },
          session: runtimeConfig.public.session,
          release: runtimeConfig.public.release,
        }
      }
    } catch (error) {
      const configError = handleConfigError(error, 'runtime config loading')
      logger.warn('Failed to load runtime config:', configError.message)
    }
    return null
  },

  // 从服务器获取配置 (当前浏览器host:9001/config.json)
  async loadConfigFromServer(): Promise<SiteConfig | null> {
    try {
      const result = await fetchConfigFromServer()
      return result.config
    } catch (error) {
      const configError = handleConfigError(error, 'server config loading')
      logger.warn('Failed to load config from server:', configError.message)
      return null
    }
  },

  // 加载配置：优先使用localStorage，然后尝试服务器配置，当前host，最后是runtimeconfig
  async loadConfig(): Promise<SiteConfig> {
    // 检查缓存
    const now = Date.now()
    if (configCache && now - configCacheTime < CACHE_DURATION) {
      return configCache
    }

    let config: SiteConfig

    // 1. 优先使用localStorage中保存的配置
    const storedResult = getStoredHostConfig()
    if (storedResult.config) {
      config = storedResult.config
    } else {
      // 2.  使用当前浏览器地址
      const browserResult = getCurrentBrowserConfig()
      if (browserResult.config) {
        config = browserResult.config
      } else {
        // 3. 使用 runtimeconfig
        const runtimeConfig = this.loadRuntimeConfig()
        if (runtimeConfig) {
          config = runtimeConfig
        } else {
          // 4. 最后使用localhost默认值
          const defaultResult = getServerDefaultConfig()
          config = defaultResult.config!
        }
      }
    }

    try {
      // get version config from server api
      const serverConfig = await fetchVersionConfigFromServer(config.serverHost)
      if (serverConfig && serverConfig?.version && serverConfig?.date) {
        config.release = {
          version: serverConfig.version,
          date: serverConfig.date,
        }
      }
    } catch (error) {
      logger.warn('Failed to get release info from server:', error)
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
  },
}
