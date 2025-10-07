/**
 * 测试环境设置
 */

import { vi } from 'vitest'

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // 保留 error 和 warn 用于测试验证
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
}

// Mock fetch globally
global.fetch = vi.fn()

// Mock AbortSignal.timeout for older environments
if (!AbortSignal.timeout) {
  AbortSignal.timeout = vi.fn((delay: number) => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), delay)
    return controller.signal
  })
}

// Setup localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (index: number) => Object.keys(store)[index] || null,
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
})
