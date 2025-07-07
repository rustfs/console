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
  // 保存配置到 localStorage
  saveConfig(serverConfig: ServerConfig): void {
    if (process.client) {
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
    }
  },

  // 从 localStorage 读取配置
  loadConfig(): RustFSConfig | null {
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

  // 清除配置
  clearConfig(): void {
    if (process.client) {
      localStorage.removeItem(CONFIG_KEY)
    }
  },

  // 检查是否有有效配置
  hasValidConfig(): boolean {
    const config = this.loadConfig()
    return !!(config?.api?.baseURL)
  }
}
