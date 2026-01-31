import { joinURL } from "ufo"
import type { IApiErrorHandler } from "@/types/api"
import { parseApiError } from "./error-handler"
import { logger } from "./logger"
import type { AwsClient } from "./aws4fetch"

interface ApiClientOptions {
  baseUrl?: string
  headers?: Record<string, string>
  errorHandler?: IApiErrorHandler
}

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, string>
}

export class ApiClient {
  private $api: AwsClient
  private config?: ApiClientOptions
  private errorHandler?: IApiErrorHandler

  constructor(api: AwsClient, options?: ApiClientOptions) {
    this.$api = api
    this.config = options
    this.errorHandler = options?.errorHandler
  }

  setErrorHandler(handler: IApiErrorHandler): void {
    this.errorHandler = handler
  }

  async request(
    url: string,
    options: RequestOptions = {},
    parseJson: boolean = true
  ) {
    url = this.config?.baseUrl ? joinURL(this.config?.baseUrl, url) : url
    options.headers = { ...this.config?.headers, ...options.headers }
    if (
      options.body &&
      !(options.body instanceof FormData) &&
      !(options.body instanceof Blob) &&
      !(options.body instanceof ArrayBuffer) &&
      !(options.body instanceof Uint8Array) &&
      !(options.body instanceof File)
    ) {
      options.body = JSON.stringify(options.body)
    }

    if (options.params) {
      const queryString = new URLSearchParams(options.params).toString()
      url += `?${queryString}`
      delete options.params
    }

    logger.log("[request] url:", url)
    logger.log("[request] options:", options)

    const response = await this.$api.fetch(url, options)

    logger.log("[request] response:", response)

    if (response.status === 401) {
      if (this.errorHandler) {
        await this.errorHandler.handle401()
      }
      return
    }
    if (response.status === 403) {
      if (this.errorHandler) {
        await this.errorHandler.handle403()
      }
      return
    }

    if (!response.ok) {
      const errorMsg = await parseApiError(response)
      throw new Error(errorMsg)
    }

    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0" ||
      !response.body
    ) {
      return null
    }

    if (parseJson) {
      return await response.json()
    } else {
      return response
    }
  }

  async get(url: string, options?: RequestOptions) {
    return this.request(url, { method: "GET", ...options })
  }

  async post(url: string, body: unknown, options?: RequestOptions) {
    return this.request(url, { method: "POST", body, ...options })
  }

  async delete(url: string, options?: RequestOptions) {
    return this.request(url, { method: "DELETE", ...options })
  }

  async put(url: string, body: unknown, options?: RequestOptions) {
    return this.request(url, { method: "PUT", body, ...options })
  }

  async patch(url: string, body: unknown, options?: RequestOptions) {
    return this.request(url, { method: "PATCH", body, ...options })
  }
}
