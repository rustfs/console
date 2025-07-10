import type { SiteConfig } from '~/types/config'
import { logger } from './logger'

/**
 * 创建默认配置
 */
export const createDefaultConfig = (serverHost: string): SiteConfig => {
  return {
    serverHost,
    api: {
      baseURL: `${serverHost}/rustfs/admin/v3`
    },
    s3: {
      endpoint: serverHost,
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: ''
    }
  }
}

/**
 * 从localStorage获取保存的主机配置
 */
export const getStoredHostConfig = (): SiteConfig | null => {
  if (typeof window === 'undefined') return null
  
  const savedHost = localStorage.getItem('rustfs-server-host')
  if (!savedHost) return null

  try {
    const url = new URL(savedHost)
    const serverHost = `${url.protocol}//${url.host}`
    return createDefaultConfig(serverHost)
  } catch (error) {
    logger.warn('Invalid saved host configuration:', error)
    return null
  }
}

/**
 * 获取当前浏览器主机配置
 */
export const getCurrentBrowserConfig = (): SiteConfig | null => {
  if (typeof window === 'undefined') return null

  const currentHost = window.location.host
  const protocol = window.location.protocol.replace(':', '')
  const serverHost = `${protocol}://${currentHost}`
  
  return createDefaultConfig(serverHost)
}

/**
 * 获取服务端默认配置
 */
export const getServerDefaultConfig = (): SiteConfig => {
  // 注意：这里按照用户要求，服务端也应该尽量使用当前host
  // 但由于服务端限制，只能使用localhost作为fallback
  const defaultServerHost = 'http://localhost:9000'
  return createDefaultConfig(defaultServerHost)
}