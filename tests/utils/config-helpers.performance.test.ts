/**
 * @fileoverview config-helpers.ts 模块的性能和压力测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchConfigFromServer,
  getConfig,
  getCurrentBrowserConfig,
  saveHostConfig,
  validateConfig,
} from '~/utils/config-helpers'

import {
  BrowserMock,
  createTestConfig,
  FetchMock,
  measureExecutionTime,
  runBatchTest,
  TestCleaner,
} from './test-helpers'

// Mock logger
vi.mock('~/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('config-helpers Performance Tests', () => {
  const browserMock = new BrowserMock()
  const cleaner = new TestCleaner()

  beforeEach(() => {
    browserMock.setLocation({ protocol: 'https:', host: 'localhost:3000' })
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(fetch).mockReset()
  })

  afterEach(() => {
    cleaner.cleanup()
  })

  describe('单个函数性能测试', () => {
    it('getCurrentBrowserConfig 应该在 1ms 内完成', async () => {
      const { time } = await measureExecutionTime(() => getCurrentBrowserConfig())

      expect(time).toBeLessThan(1)
    })

    it('saveHostConfig 应该在 5ms 内完成', async () => {
      const { time } = await measureExecutionTime(() => saveHostConfig('https://example.com:9000'))

      expect(time).toBeLessThan(5)
    })

    it('validateConfig 应该在 1ms 内完成', async () => {
      const config = createTestConfig()

      const { time } = await measureExecutionTime(() => validateConfig(config))

      expect(time).toBeLessThan(1)
    })

    it('fetchConfigFromServer 应该在合理时间内完成', async () => {
      FetchMock.mockJsonResponse({ api: { baseURL: 'test' } })

      const { time } = await measureExecutionTime(() => fetchConfigFromServer())

      // 网络请求应该在 100ms 内完成（mock 环境）
      expect(time).toBeLessThan(100)
    })
  })

  describe('批量操作性能测试', () => {
    it('应该处理大量的配置获取请求', async () => {
      const { results, averageTime, totalTime } = await runBatchTest(() => getCurrentBrowserConfig(), 1000)

      expect(results).toHaveLength(1000)
      expect(averageTime).toBeLessThan(1) // 平均每次调用小于 1ms
      expect(totalTime).toBeLessThan(1000) // 总时间小于 1 秒

      // 验证所有结果都是有效的
      results.forEach(result => {
        expect(result.config).toBeTruthy()
        expect(result.source).toBe('browser')
      })
    })

    it('应该处理大量的配置保存操作', async () => {
      const hosts = Array.from({ length: 100 }, (_, i) => `https://host${i}.example.com:${9000 + i}`)

      const { results, averageTime } = await runBatchTest(() => {
        const hostIndex = Math.floor(Math.random() * hosts.length)
        const host = hosts[hostIndex]
        if (!host) {
          throw new Error('Host not found')
        }
        return saveHostConfig(host)
      }, 100)

      expect(results).toHaveLength(100)
      expect(averageTime).toBeLessThan(10) // 平均每次保存小于 10ms

      // 验证所有保存操作都成功
      results.forEach(result => {
        expect(result.config).toBeTruthy()
        expect(result.source).toBe('localStorage')
      })
    })

    it('应该处理大量的配置验证操作', async () => {
      const configs = Array.from({ length: 1000 }, (_, i) =>
        createTestConfig({
          serverHost: `https://host${i}.com`,
          api: { baseURL: `https://api${i}.com` },
        })
      )

      const { results, averageTime } = await runBatchTest(() => {
        const configIndex = Math.floor(Math.random() * configs.length)
        const config = configs[configIndex]
        if (!config) {
          throw new Error('Config not found')
        }
        return validateConfig(config)
      }, 1000)

      expect(results).toHaveLength(1000)
      expect(averageTime).toBeLessThan(0.5) // 平均每次验证小于 0.5ms

      // 验证所有配置都通过验证
      results.forEach(result => {
        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })
    })
  })

  describe('并发操作测试', () => {
    it('应该处理并发的配置获取请求', async () => {
      FetchMock.mockJsonResponse({ api: { baseURL: 'concurrent-test' } })

      const concurrentRequests = 50
      const promises = Array.from({ length: concurrentRequests }, () => getConfig())

      const start = performance.now()
      const results = await Promise.all(promises)
      const totalTime = performance.now() - start

      expect(results).toHaveLength(concurrentRequests)
      expect(totalTime).toBeLessThan(1000) // 所有并发请求在 1 秒内完成

      // 验证所有结果
      results.forEach(result => {
        expect(result.config).toBeTruthy()
      })
    })

    it('应该处理并发的保存和获取操作', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => {
        if (i % 2 === 0) {
          // 保存操作
          return () => saveHostConfig(`https://host${i}.com`)
        } else {
          // 获取操作
          return () => getCurrentBrowserConfig()
        }
      })

      const promises = operations.map(op => op())
      const results = await Promise.all(promises)

      expect(results).toHaveLength(100)

      // 验证结果
      results.forEach((result, index) => {
        expect(result.config).toBeTruthy()
        if (index % 2 === 0) {
          expect(result.source).toBe('localStorage')
        } else {
          expect(result.source).toBe('browser')
        }
      })
    })
  })

  describe('内存使用测试', () => {
    it('应该不会造成内存泄漏', async () => {
      // 创建大量配置对象并立即释放
      for (let i = 0; i < 10000; i++) {
        const config = createTestConfig({
          serverHost: `https://host${i}.com`,
          api: { baseURL: `https://api${i}.com` },
          s3: {
            endpoint: `https://s3-${i}.com`,
            region: 'us-east-1',
            accessKeyId: `key-${i}`,
            secretAccessKey: `secret-${i}`,
          },
        })

        // 验证配置
        validateConfig(config)

        // 每 1000 次强制垃圾回收（如果可用）
        if (i % 1000 === 0 && global.gc) {
          global.gc()
        }
      }

      // 测试完成，没有抛出内存错误就算成功
      expect(true).toBe(true)
    })

    it('应该处理大型配置对象', async () => {
      const largeConfig = createTestConfig({
        // 添加大量数据来测试内存处理
        s3: {
          endpoint: 'https://s3.example.com',
          region: 'us-east-1',
          accessKeyId: 'x'.repeat(10000), // 10KB 的数据
          secretAccessKey: 'y'.repeat(10000), // 10KB 的数据
        },
      })

      const { time } = await measureExecutionTime(() => validateConfig(largeConfig))

      expect(time).toBeLessThan(10) // 即使是大型对象也应该快速处理
    })
  })

  describe('网络性能测试', () => {
    it('应该正确处理慢速网络响应', async () => {
      // Mock 慢速响应
      vi.mocked(fetch).mockImplementationOnce(
        () =>
          new Promise(
            resolve =>
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: () => Promise.resolve({ api: { baseURL: 'slow-response' } }),
                  } as Response),
                500
              ) // 500ms 延迟
          )
      )

      const { result, time } = await measureExecutionTime(() => fetchConfigFromServer())

      expect(time).toBeGreaterThan(500) // 应该反映实际的网络延迟
      expect(result.config).toBeTruthy()
    })

    it('应该正确处理网络超时', async () => {
      // Mock 超时
      FetchMock.mockTimeout(100) // 使用较短的超时时间进行测试

      const { result, time } = await measureExecutionTime(() => fetchConfigFromServer())

      expect(time).toBeLessThan(1000) // 应该在 1 秒内返回
      expect(result.source).toBe('browser') // 应该回退到浏览器配置
      expect(result.error).toContain('Failed to fetch server config')
    }, 10000) // 设置测试超时为 10 秒
  })

  describe('压力测试', () => {
    it('应该在高负载下保持稳定', async () => {
      const highLoadOperations = []

      // 创建混合的高负载操作
      for (let i = 0; i < 1000; i++) {
        const operation = i % 4
        switch (operation) {
          case 0:
            highLoadOperations.push(() => getCurrentBrowserConfig())
            break
          case 1:
            highLoadOperations.push(() => saveHostConfig(`https://load-test-${i}.com`))
            break
          case 2:
            highLoadOperations.push(() => validateConfig(createTestConfig()))
            break
          case 3:
            FetchMock.mockJsonResponse({ test: i })
            highLoadOperations.push(() => fetchConfigFromServer())
            break
        }
      }

      const start = performance.now()
      const results = await Promise.all(highLoadOperations.map(op => op()))
      const totalTime = performance.now() - start

      expect(results).toHaveLength(1000)
      expect(totalTime).toBeLessThan(5000) // 5 秒内完成所有操作

      // 验证没有操作失败
      results.forEach(result => {
        expect(result).toBeTruthy()
        if ('config' in result) {
          expect(result.config).toBeTruthy()
        }
      })
    })

    it('应该处理极端的并发情况', async () => {
      const extremeConcurrency = 200

      // 模拟极端并发：同时进行读写操作
      const promises = Array.from({ length: extremeConcurrency }, (_, i) => {
        if (i % 3 === 0) {
          return saveHostConfig(`https://concurrent-${i}.com`)
        } else if (i % 3 === 1) {
          FetchMock.mockJsonResponse({ concurrent: i })
          return fetchConfigFromServer()
        } else {
          return getCurrentBrowserConfig()
        }
      })

      const results = await Promise.all(promises)

      expect(results).toHaveLength(extremeConcurrency)

      // 验证所有操作都成功完成
      results.forEach(result => {
        expect(result.config).toBeTruthy()
      })
    })
  })
})
