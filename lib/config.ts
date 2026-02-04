import type { SiteConfig } from "@/types/config"
import {
  getCurrentBrowserConfig,
  getServerDefaultConfig,
  getStoredHostConfig,
  fetchVersionConfigFromServer,
} from "./config-helpers"
import { handleConfigError } from "./error-handler"
import { logger } from "./logger"

let configCache: SiteConfig | null = null
let configCacheTime = 0
const CACHE_DURATION = 60000

function loadRuntimeConfig(): SiteConfig | null {
  try {
    const serverHost =
      process.env.NEXT_PUBLIC_SERVER_HOST ||
      (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/rustfs\/admin\/v3$/, "")

    if (serverHost) {
      return {
        serverHost,
        api: {
          baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || `${serverHost}/rustfs/admin/v3`,
        },
        s3: {
          endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT || serverHost,
          region: process.env.NEXT_PUBLIC_S3_REGION || "us-east-1",
          accessKeyId: "",
          secretAccessKey: "",
        },
        session: process.env.NEXT_PUBLIC_SESSION_DURATION_SECONDS
          ? {
              durationSeconds: Number(process.env.NEXT_PUBLIC_SESSION_DURATION_SECONDS),
            }
          : undefined,
        release:
          process.env.NEXT_PUBLIC_VERSION && process.env.NEXT_PUBLIC_RELEASE_DATE
            ? {
                version: process.env.NEXT_PUBLIC_VERSION,
                date: process.env.NEXT_PUBLIC_RELEASE_DATE,
              }
            : undefined,
      }
    }
  } catch (error) {
    const configError = handleConfigError(error, "runtime config loading")
    logger.warn("Failed to load runtime config:", configError.message)
  }
  return null
}

export const configManager = {
  loadRuntimeConfig,

  async loadConfig(): Promise<SiteConfig> {
    const now = Date.now()
    if (configCache && now - configCacheTime < CACHE_DURATION) {
      return configCache
    }

    let config: SiteConfig

    const storedResult = getStoredHostConfig()
    if (storedResult.config) {
      config = storedResult.config
    } else {
      const browserResult = getCurrentBrowserConfig()
      if (browserResult.config) {
        config = browserResult.config
      } else {
        const runtimeConfig = this.loadRuntimeConfig()
        if (runtimeConfig) {
          config = runtimeConfig
        } else {
          const defaultResult = getServerDefaultConfig()
          config = defaultResult.config!
        }
      }
    }

    try {
      const serverConfig = await fetchVersionConfigFromServer(config.serverHost)
      if (serverConfig?.version && serverConfig?.date) {
        config = {
          ...config,
          release: {
            version: serverConfig.version,
            date: serverConfig.date,
          },
        }
      }
    } catch (error) {
      logger.warn("Failed to get release info from server:", error)
    }

    configCache = config
    configCacheTime = now
    return config
  },

  clearCache() {
    configCache = null
    configCacheTime = 0
  },

  async hasValidConfig(): Promise<boolean> {
    const config = await this.loadConfig()
    return !!(config?.serverHost && config?.api?.baseURL)
  },
}
