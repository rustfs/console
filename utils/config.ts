export interface ServerConfig {
  protocol: string
  host: string
  port: string
  region: string
}

export interface RustFSConfig {
  api: {
    baseURL: string
  }
  s3: {
    endpoint: string
    region: string
  }
}

const CONFIG_KEY = 'rustfs-config'

export const configManager = {
  // 从 public/config.json 读取配置
  async loadPublicConfig(): Promise<RustFSConfig | null> {
    if (process.client) {
      try {
        const response = await fetch('/config.json')
        if (response.ok) {
          const publicConfig = await response.json()
          if (publicConfig.api?.baseURL) {
            return publicConfig
          }
        }
      } catch (error) {
        console.log('public/config.json not found')
      }
    }
    return null
  },

  // 从 localStorage 读取配置
  loadStorageConfig(): RustFSConfig | null {
    if (process.client) {
      try {
        const configStr = localStorage.getItem(CONFIG_KEY)
        if (configStr) {
          return JSON.parse(configStr)
        }
      } catch (error) {
        console.warn('Failed to parse localStorage config:', error)
      }
    }
    return null
  },

  // 从 nuxt runtimeconfig 读取配置
  loadRuntimeConfig(): RustFSConfig | null {
    try {
      const runtimeConfig = useRuntimeConfig()
      if (runtimeConfig.public?.api?.baseURL) {
        return {
          api: {
            baseURL: runtimeConfig.public.api.baseURL
          },
          s3: {
            endpoint: runtimeConfig.public.s3?.endpoint || runtimeConfig.public.api.baseURL,
            region: runtimeConfig.public.s3?.region || 'us-east-1'
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load runtime config:', error)
    }
    return null
  },

  // 按优先级加载配置：config.json > localStorage > runtimeconfig
  async loadConfig(): Promise<RustFSConfig | null> {
    // 首先尝试从 config.json 加载
    const publicConfig = await this.loadPublicConfig()
    if (publicConfig) {
      return publicConfig
    }

    // 如果没有 config.json，尝试从 localStorage 加载
    const storageConfig = this.loadStorageConfig()
    if (storageConfig) {
      return storageConfig
    }

    // 如果都没有，使用 runtimeconfig 作为默认值
    return this.loadRuntimeConfig()
  },

  // 从 RustFSConfig 提取 ServerConfig
  extractServerConfig(config: RustFSConfig): ServerConfig | null {
    try {
      const urlObj = new URL(config.api.baseURL)
      return {
        protocol: urlObj.protocol.replace(':', ''),
        host: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
        region: config.s3.region
      }
    } catch (error) {
      console.warn('Failed to extract server config:', error)
      return null
    }
  },

  // 检查是否有 public/config.json
  async hasPublicConfig(): Promise<boolean> {
    const config = await this.loadPublicConfig()
    return !!config
  },

  // 保存配置到 localStorage（只有当没有 public/config.json 时）
  async saveConfig(serverConfig: ServerConfig): Promise<boolean> {
    if (process.client) {
      // 如果有 public/config.json，就不保存到 localStorage
      if (await this.hasPublicConfig()) {
        return false
      }

      const config: RustFSConfig = {
        api: {
          baseURL: `${serverConfig.protocol}://${serverConfig.host}:${serverConfig.port}/rustfs/admin/v3`
        },
        s3: {
          endpoint: `${serverConfig.protocol}://${serverConfig.host}:${serverConfig.port}`,
          region: serverConfig.region
        }
      }

      localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
      return true
    }
    return false
  },

  // 清除配置
  clearConfig(): void {
    if (process.client) {
      localStorage.removeItem(CONFIG_KEY)
    }
  },

  // 检查是否有有效配置
  async hasValidConfig(): Promise<boolean> {
    const config = await this.loadConfig()
    return !!(config?.api?.baseURL)
  }
}
