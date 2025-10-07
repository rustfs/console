/**
 * @fileoverview config-helpers.ts 模块的完整测试套件
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SiteConfig } from '~/types/config'

// 需要 mock 的模块
vi.mock('~/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// 导入被测试的函数
import {
  clearStoredHostConfig,
  createDefaultConfig,
  fetchConfigFromServer,
  getConfig,
  getConfigSources,
  getCurrentBrowserConfig,
  getCurrentBrowserConfigLegacy,
  getServerDefaultConfig,
  getStoredHostConfig,
  // Legacy functions
  getStoredHostConfigLegacy,
  saveHostConfig,
  validateConfig,
} from '~/utils/config-helpers'

// 测试常量
const TEST_SERVER_HOST = 'https://example.com:9000'
const TEST_CONFIG_RESPONSE = {
  api: {
    baseURL: 'https://example.com:9000/custom/api/v3',
  },
  s3: {
    endpoint: 'https://s3.example.com',
    region: 'us-west-2',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
  },
  session: {
    durationSeconds: 3600,
  },
}

describe('config-helpers', () => {
  // Mock window.location
  const mockLocation = {
    protocol: 'https:',
    host: 'localhost:3000',
    hostname: 'localhost',
  }

  beforeEach(() => {
    // Reset to default location
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'https:',
        host: 'localhost:3000',
        hostname: 'localhost',
      },
      writable: true,
      configurable: true,
    })

    // Reset fetch mock
    vi.mocked(fetch).mockReset()

    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createDefaultConfig', () => {
    it('应该创建正确的默认配置', () => {
      const config = createDefaultConfig(TEST_SERVER_HOST)

      expect(config).toEqual({
        serverHost: TEST_SERVER_HOST,
        api: {
          baseURL: `${TEST_SERVER_HOST}/rustfs/admin/v3`,
        },
        s3: {
          endpoint: TEST_SERVER_HOST,
          region: 'us-east-1',
          accessKeyId: '',
          secretAccessKey: '',
        },
      })
    })

    it('应该处理不同的服务器主机格式', () => {
      const testCases = [
        'http://localhost:8080',
        'https://api.example.com',
        'http://192.168.1.100:9000',
      ]

      testCases.forEach(serverHost => {
        const config = createDefaultConfig(serverHost)
        expect(config.serverHost).toBe(serverHost)
        expect(config.api.baseURL).toBe(`${serverHost}/rustfs/admin/v3`)
        expect(config.s3.endpoint).toBe(serverHost)
      })
    })
  })

  describe('getCurrentBrowserConfig', () => {
    it('应该基于当前浏览器位置创建配置', () => {
      const result = getCurrentBrowserConfig()

      expect(result.source).toBe('browser')
      expect(result.config).toBeTruthy()
      expect(result.config?.serverHost).toBe('https://localhost:3000')
      expect(result.error).toBeUndefined()
    })

    it('应该处理不同的协议和端口', () => {
      // Test HTTP
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          host: 'example.com:8080',
          hostname: 'example.com',
        },
        writable: true,
      })

      const result = getCurrentBrowserConfig()
      expect(result.config?.serverHost).toBe('http://example.com:8080')
    })

    it('应该在非浏览器环境中返回错误', () => {
      // Mock non-browser environment
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const result = getCurrentBrowserConfig()

      expect(result.config).toBeNull()
      expect(result.source).toBe('browser')
      expect(result.error).toBe('Not in browser environment')

      // Restore window
      global.window = originalWindow
    })
  })

  describe('getStoredHostConfig', () => {
    it('应该从 localStorage 获取保存的配置', () => {
      localStorage.setItem('rustfs-server-host', TEST_SERVER_HOST)

      const result = getStoredHostConfig()

      expect(result.source).toBe('localStorage')
      expect(result.config).toBeTruthy()
      expect(result.config?.serverHost).toBe(TEST_SERVER_HOST)
      expect(result.error).toBeUndefined()
    })

    it('应该在没有保存配置时返回 null', () => {
      const result = getStoredHostConfig()

      expect(result.config).toBeNull()
      expect(result.source).toBe('localStorage')
      expect(result.error).toBe('No saved host found')
    })

    it('应该处理无效的保存配置', () => {
      localStorage.setItem('rustfs-server-host', 'invalid-url')

      const result = getStoredHostConfig()

      expect(result.config).toBeNull()
      expect(result.source).toBe('localStorage')
      expect(result.error).toContain('Invalid saved host configuration')
    })

    it('应该在非浏览器环境中返回错误', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const result = getStoredHostConfig()

      expect(result.config).toBeNull()
      expect(result.source).toBe('localStorage')
      expect(result.error).toBe('Not in browser environment')

      global.window = originalWindow
    })
  })

  describe('fetchConfigFromServer', () => {
    it('应该成功获取并合并服务器配置', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(TEST_CONFIG_RESPONSE),
      } as Response)

      const result = await fetchConfigFromServer()

      expect(result.source).toBe('server')
      expect(result.config).toBeTruthy()
      expect(result.config?.api.baseURL).toBe(TEST_CONFIG_RESPONSE.api.baseURL)
      expect(result.config?.s3.endpoint).toBe(TEST_CONFIG_RESPONSE.s3.endpoint)
      expect(result.config?.s3.region).toBe(TEST_CONFIG_RESPONSE.s3.region)
    })

    it('应该在服务器请求失败时回退到浏览器配置', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response)

      const result = await fetchConfigFromServer()

      expect(result.source).toBe('browser')
      expect(result.config).toBeTruthy()
      expect(result.config?.serverHost).toBe('https://localhost:3000')
      expect(result.error).toContain('Failed to fetch server config')
    })

    it('应该处理网络错误', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchConfigFromServer()

      expect(result.source).toBe('browser')
      expect(result.config).toBeTruthy()
      expect(result.error).toContain('Failed to fetch server config')
    })

    it('应该处理无效的服务器响应', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      } as Response)

      const result = await fetchConfigFromServer()

      expect(result.source).toBe('browser')
      expect(result.config).toBeTruthy()
    })

    it('应该正确调用 fetch 并设置超时', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response)

      await fetchConfigFromServer()

      expect(fetch).toHaveBeenCalledWith(
        'https://localhost:3000/config.json',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: expect.any(AbortSignal),
        })
      )
    })
  })

  describe('getConfig', () => {
    it('应该优先使用服务器配置', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(TEST_CONFIG_RESPONSE),
      } as Response)

      const result = await getConfig()

      expect(result.source).toBe('server')
      expect(result.config?.api.baseURL).toBe(TEST_CONFIG_RESPONSE.api.baseURL)
    })

    it('应该在服务器配置失败时使用 localStorage 配置', async () => {
      localStorage.setItem('rustfs-server-host', TEST_SERVER_HOST)
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await getConfig()

      expect(result.source).toBe('localStorage')
      expect(result.config?.serverHost).toBe(TEST_SERVER_HOST)
    })

    it('应该在前两个选项失败时使用浏览器配置', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      const result = await getConfig()

      expect(result.source).toBe('browser')
      expect(result.config?.serverHost).toBe('https://localhost:3000')
    })

    it('应该在所有选项失败时使用默认配置', async () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const result = await getConfig()

      expect(result.source).toBe('default')
      expect(result.config?.serverHost).toBe('http://localhost:9000')

      global.window = originalWindow
    })
  })

  describe('saveHostConfig', () => {
    it('应该保存有效的主机配置', () => {
      const result = saveHostConfig(TEST_SERVER_HOST)

      expect(result.source).toBe('localStorage')
      expect(result.config).toBeTruthy()
      expect(result.config?.serverHost).toBe(TEST_SERVER_HOST)
      expect(localStorage.getItem('rustfs-server-host')).toBe(TEST_SERVER_HOST)
    })

    it('应该拒绝无效的 URL', () => {
      const result = saveHostConfig('invalid-url')

      expect(result.config).toBeNull()
      expect(result.error).toContain('Invalid server host format')
      expect(localStorage.getItem('rustfs-server-host')).toBeNull()
    })

    it('应该在非浏览器环境中返回错误', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const result = saveHostConfig(TEST_SERVER_HOST)

      expect(result.config).toBeNull()
      expect(result.error).toBe('Not in browser environment')

      global.window = originalWindow
    })
  })

  describe('clearStoredHostConfig', () => {
    it('应该清除保存的配置', () => {
      localStorage.setItem('rustfs-server-host', TEST_SERVER_HOST)

      const result = clearStoredHostConfig()

      expect(result).toBe(true)
      expect(localStorage.getItem('rustfs-server-host')).toBeNull()
    })

    it('应该在非浏览器环境中返回 false', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      const result = clearStoredHostConfig()

      expect(result).toBe(false)

      global.window = originalWindow
    })
  })

  describe('validateConfig', () => {
    it('应该验证完整的配置', () => {
      const validConfig: SiteConfig = {
        serverHost: TEST_SERVER_HOST,
        api: { baseURL: 'https://api.example.com' },
        s3: {
          endpoint: 'https://s3.example.com',
          region: 'us-east-1',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
        },
      }

      const result = validateConfig(validConfig)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测缺失的必需字段', () => {
      const invalidConfig = {
        serverHost: '',
        api: {},
        s3: {},
      } as SiteConfig

      const result = validateConfig(invalidConfig)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('serverHost is required')
      expect(result.errors).toContain('api.baseURL is required')
      expect(result.errors).toContain('s3.endpoint is required')
      expect(result.errors).toContain('s3.region is required')
    })
  })

  describe('getConfigSources', () => {
    it('应该返回所有配置源的状态', async () => {
      localStorage.setItem('rustfs-server-host', TEST_SERVER_HOST)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(TEST_CONFIG_RESPONSE),
      } as Response)

      const sources = await getConfigSources()

      expect(sources.browser.source).toBe('browser')
      expect(sources.localStorage.source).toBe('localStorage')
      expect(sources.server.source).toBe('server')
      expect(sources.default.source).toBe('default')

      expect(sources.browser.config).toBeTruthy()
      expect(sources.localStorage.config).toBeTruthy()
      expect(sources.server.config).toBeTruthy()
      expect(sources.default.config).toBeTruthy()
    })
  })

  describe('getServerDefaultConfig', () => {
    it('应该返回默认的服务器配置', () => {
      const result = getServerDefaultConfig()

      expect(result.source).toBe('default')
      expect(result.config?.serverHost).toBe('http://localhost:9000')
      expect(result.config?.api.baseURL).toBe('http://localhost:9000/rustfs/admin/v3')
    })
  })

  describe('Legacy Functions', () => {
    it('getStoredHostConfigLegacy 应该返回配置或 null', () => {
      localStorage.setItem('rustfs-server-host', TEST_SERVER_HOST)

      const config = getStoredHostConfigLegacy()

      expect(config).toBeTruthy()
      expect(config?.serverHost).toBe(TEST_SERVER_HOST)
    })

    it('getCurrentBrowserConfigLegacy 应该返回浏览器配置', () => {
      const config = getCurrentBrowserConfigLegacy()

      expect(config).toBeTruthy()
      expect(config?.serverHost).toBe('https://localhost:3000')
    })

    it('Legacy 函数应该在失败时返回 null', () => {
      const originalWindow = global.window
      // @ts-ignore
      delete global.window

      expect(getStoredHostConfigLegacy()).toBeNull()
      expect(getCurrentBrowserConfigLegacy()).toBeNull()

      global.window = originalWindow
    })
  })
})
