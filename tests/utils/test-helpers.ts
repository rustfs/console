/**
 * @fileoverview 测试辅助工具和 Mock 函数
 */

import { vi } from 'vitest'
import type { SiteConfig } from '~/types/config'

// ============================================================================
// Mock 数据生成器
// ============================================================================

/**
 * 创建测试用的配置对象
 */
export const createTestConfig = (overrides: Partial<SiteConfig> = {}): SiteConfig => ({
  serverHost: 'https://test.example.com:9000',
  api: {
    baseURL: 'https://test.example.com:9000/rustfs/admin/v3',
  },
  s3: {
    endpoint: 'https://test.example.com:9000',
    region: 'us-east-1',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
  },
  ...overrides,
})

/**
 * 创建测试用的服务器配置响应
 */
export const createTestServerResponse = (overrides: any = {}) => ({
  api: {
    baseURL: 'https://server.example.com/api/v3',
  },
  s3: {
    endpoint: 'https://s3.server.com',
    region: 'us-west-2',
    accessKeyId: 'server-key',
    secretAccessKey: 'server-secret',
  },
  session: {
    durationSeconds: 3600,
  },
  ...overrides,
})

// ============================================================================
// 环境 Mock 工具
// ============================================================================

/**
 * Mock 浏览器环境
 */
export class BrowserMock {
  private originalWindow: any
  private originalLocation: any

  constructor() {
    this.originalWindow = global.window
    this.originalLocation = global.window?.location
  }

  /**
   * 设置 window.location
   */
  setLocation(location: Partial<Location>) {
    const defaultLocation = {
      protocol: 'https:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: '',
    }

    Object.defineProperty(global.window, 'location', {
      value: { ...defaultLocation, ...location },
      writable: true,
    })
  }

  /**
   * 模拟非浏览器环境
   */
  mockNonBrowser() {
    // @ts-ignore
    delete global.window
  }

  /**
   * 恢复原始环境
   */
  restore() {
    global.window = this.originalWindow
    if (this.originalLocation) {
      Object.defineProperty(global.window, 'location', {
        value: this.originalLocation,
        writable: true,
      })
    }
  }
}

/**
 * Mock localStorage
 */
export class LocalStorageMock {
  private store: Record<string, string> = {}
  private originalLocalStorage: any

  constructor() {
    this.originalLocalStorage = global.localStorage
  }

  /**
   * 设置初始数据
   */
  setData(data: Record<string, string>) {
    this.store = { ...data }
  }

  /**
   * 模拟 localStorage 异常
   */
  mockError(method: 'getItem' | 'setItem' | 'removeItem' = 'setItem') {
    const mockStorage = {
      ...this.createMockStorage(),
      [method]: vi.fn(() => {
        throw new Error(`localStorage ${method} error`)
      }),
    }

    Object.defineProperty(global.window, 'localStorage', {
      value: mockStorage,
    })
  }

  /**
   * 恢复正常的 localStorage
   */
  restore() {
    Object.defineProperty(global.window, 'localStorage', {
      value: this.createMockStorage(),
    })
  }

  private createMockStorage() {
    return {
      getItem: (key: string) => this.store[key] || null,
      setItem: (key: string, value: string) => {
        this.store[key] = value
      },
      removeItem: (key: string) => {
        delete this.store[key]
      },
      clear: () => {
        this.store = {}
      },
      get length() {
        return Object.keys(this.store).length
      },
      key: (index: number) => Object.keys(this.store)[index] || null,
    }
  }
}

/**
 * Mock fetch 响应
 */
export class FetchMock {
  /**
   * Mock 成功的 JSON 响应
   */
  static mockJsonResponse(data: any, options: { status?: number; ok?: boolean } = {}) {
    return vi.mocked(fetch).mockResolvedValueOnce({
      ok: options.ok ?? true,
      status: options.status ?? 200,
      statusText: 'OK',
      json: () => Promise.resolve(data),
    } as Response)
  }

  /**
   * Mock 失败的响应
   */
  static mockErrorResponse(status: number = 500, statusText: string = 'Internal Server Error') {
    return vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status,
      statusText,
      json: () => Promise.reject(new Error('Response not ok')),
    } as Response)
  }

  /**
   * Mock 网络错误
   */
  static mockNetworkError(message: string = 'Network error') {
    return vi.mocked(fetch).mockRejectedValueOnce(new Error(message))
  }

  /**
   * Mock 超时错误
   */
  static mockTimeout(delay: number = 100) {
    return vi.mocked(fetch).mockImplementationOnce(
      () => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), delay)
      )
    )
  }

  /**
   * Mock 无效 JSON 响应
   */
  static mockInvalidJson() {
    return vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.reject(new Error('Invalid JSON')),
    } as Response)
  }
}

// ============================================================================
// 测试场景生成器
// ============================================================================

/**
 * 生成各种 URL 测试用例
 */
export const generateUrlTestCases = () => ({
  valid: [
    'https://example.com',
    'http://localhost:3000',
    'https://api.subdomain.example.com:8080',
    'http://192.168.1.100:9000',
    'https://测试.example.com', // 国际化域名
  ],
  invalid: [
    '',
    'not-a-url',
    'ftp://invalid-protocol.com',
    'https://',
    'https://.',
    'https://...',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
  ],
})

/**
 * 生成各种配置测试用例
 */
export const generateConfigTestCases = () => ({
  complete: createTestConfig(),
  minimal: createTestConfig({
    s3: {
      endpoint: 'https://test.com',
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
    },
  }),
  invalid: [
    {} as SiteConfig, // 完全空的配置
    { serverHost: '' } as SiteConfig, // 缺少必需字段
    {
      serverHost: 'https://test.com',
      api: {},
      s3: {},
    } as SiteConfig, // 部分字段为空
  ],
})

// ============================================================================
// 断言辅助函数
// ============================================================================

/**
 * 验证配置对象的结构
 */
export const expectValidConfig = (config: SiteConfig | null) => {
  expect(config).toBeTruthy()
  expect(config?.serverHost).toBeTruthy()
  expect(config?.api?.baseURL).toBeTruthy()
  expect(config?.s3?.endpoint).toBeTruthy()
  expect(config?.s3?.region).toBeTruthy()
}

/**
 * 验证 ConfigResult 的结构
 */
export const expectValidConfigResult = (result: any, expectedSource?: string) => {
  expect(result).toHaveProperty('config')
  expect(result).toHaveProperty('source')

  if (expectedSource) {
    expect(result.source).toBe(expectedSource)
  }

  if (result.config) {
    expectValidConfig(result.config)
  }
}

/**
 * 验证错误结果
 */
export const expectErrorResult = (result: any, expectedSource?: string) => {
  expect(result.config).toBeNull()
  expect(result.error).toBeTruthy()

  if (expectedSource) {
    expect(result.source).toBe(expectedSource)
  }
}

// ============================================================================
// 性能测试工具
// ============================================================================

/**
 * 测量函数执行时间
 */
export const measureExecutionTime = async <T>(fn: () => Promise<T> | T): Promise<{ result: T; time: number }> => {
  const start = performance.now()
  const result = await fn()
  const time = performance.now() - start

  return { result, time }
}

/**
 * 批量执行测试
 */
export const runBatchTest = async <T>(
  fn: () => Promise<T> | T,
  count: number = 100
): Promise<{ results: T[]; averageTime: number; totalTime: number }> => {
  const start = performance.now()
  const results: T[] = []

  for (let i = 0; i < count; i++) {
    results.push(await fn())
  }

  const totalTime = performance.now() - start
  const averageTime = totalTime / count

  return { results, averageTime, totalTime }
}

// ============================================================================
// 清理工具
// ============================================================================

/**
 * 测试环境清理器
 */
export class TestCleaner {
  private cleanupFunctions: (() => void)[] = []

  /**
   * 添加清理函数
   */
  addCleanup(fn: () => void) {
    this.cleanupFunctions.push(fn)
  }

  /**
   * 执行所有清理
   */
  cleanup() {
    this.cleanupFunctions.forEach(fn => {
      try {
        fn()
      } catch (error) {
        console.warn('Cleanup function failed:', error)
      }
    })
    this.cleanupFunctions = []
  }
}
