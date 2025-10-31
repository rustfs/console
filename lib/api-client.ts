import { joinURL } from 'ufo'
import type { IApiErrorHandler } from '~/types/api'
import { parseApiError } from '~/utils/error-handler'
import { logger } from '~/utils/logger'
import type { AwsClient } from './aws4fetch'

interface ApiClientOptions {
  baseUrl?: string
  headers?: Record<string, string>
  errorHandler?: IApiErrorHandler
}

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
  params?: Record<string, string>
}

class ApiClient {
  private $api: AwsClient
  private config?: ApiClientOptions
  private errorHandler?: IApiErrorHandler

  constructor(api: AwsClient, options?: ApiClientOptions) {
    this.$api = api
    this.config = options
    this.errorHandler = options?.errorHandler
  }

  /**
   * 设置错误处理器
   */
  setErrorHandler(handler: IApiErrorHandler): void {
    this.errorHandler = handler
  }

  async request(url: string, options: RequestOptions = {}, parseJson: boolean = true) {
    url = this.config?.baseUrl ? joinURL(this.config?.baseUrl, url) : url
    options.headers = { ...this.config?.headers, ...options.headers }
    // 处理body的数据格式，只对普通对象序列化
    if (options.body &&
      !(options.body instanceof FormData) &&
      !(options.body instanceof Blob) &&
      !(options.body instanceof ArrayBuffer) &&
      !(options.body instanceof Uint8Array) &&
      !(options.body instanceof File)) {
      options.body = JSON.stringify(options.body)
    }

    if (options.params) {
      const queryString = new URLSearchParams(options.params).toString()
      url += `?${queryString}` // 拼接查询字符串到URL
      delete options.params // 删除params，以免影响fetch的options
    }

    logger.log('[request] url:', url)
    logger.log('[request] options:', options)

    const response = await this.$api.fetch(url, options)

    logger.log('[request] response:', response)

    if (!response.ok) {
      const errorMsg = await parseApiError(response)
      throw new Error(errorMsg)
    }

    // 处理401未授权错误
    if (response.status === 401) {
      if (this.errorHandler) {
        await this.errorHandler.handle401()
      }
      return
    }

    // 204 or body length is 0
    if (response.status === 204 || response.headers.get('content-length') === '0' || !response.body) {
      return null
    }

    if (parseJson) {
      return await response.json()
    } else {
      return response
    }
  }

  async *streamRequest(url: string, options: RequestOptions = {}) {
    const response = await this.request(url, options, false)

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      try {
        const data = JSON.parse(chunk)
        yield data // 使用 yield 返回数据
      } catch (error) {
        logger.error('Failed to parse chunk:', error)
      }
    }
  }
  async get(url: string, options?: RequestOptions) {
    return this.request(url, { method: 'GET', ...options })
  }

  async post(url: string, body: any, options?: RequestOptions) {
    return this.request(url, { method: 'POST', body, ...options })
  }

  async delete(url: string, options?: RequestOptions) {
    return this.request(url, { method: 'DELETE', ...options })
  }

  async put(url: string, body: any, options?: RequestOptions) {
    return this.request(url, { method: 'PUT', body, ...options })
  }

  async patch(url: string, body: any, options?: RequestOptions) {
    return this.request(url, { method: 'PATCH', body, ...options })
  }

  async head(url: string, options?: RequestOptions) {
    return this.request(url, { method: 'HEAD', ...options })
  }

  async options(url: string, options?: RequestOptions) {
    return this.request(url, { method: 'OPTIONS', ...options })
  }

  async trace(url: string, options?: RequestOptions) {
    return this.request(url, { method: 'TRACE', ...options })
  }
}

export default ApiClient
