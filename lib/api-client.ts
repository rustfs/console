import { joinURL } from "ufo"
import type { IApiErrorHandler } from "@/types/api"
import { redactRequestOptionsForLog } from "./api-request-log"
import { parseApiError } from "./error-handler"
import { logger } from "./logger"

type ApiRequestInit = RequestInit & { body?: BodyInit | null; aws?: Record<string, unknown> }

export interface ApiTransport {
  fetch(input: string | Request, init?: ApiRequestInit): Promise<Response>
}

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
  dedupe?: boolean
  /**
   * If true, 403 errors will throw an error instead of triggering global error handler
   * This allows components to handle permission errors gracefully
   */
  suppress403Redirect?: boolean
  signal?: AbortSignal
}

async function createHttpError(response: Response) {
  const error = new Error(await parseApiError(response)) as Error & { status: number }
  error.status = response.status
  return error
}

export class ApiClient {
  private $api: ApiTransport
  private config?: ApiClientOptions
  private errorHandler?: IApiErrorHandler
  private inflightGetRequests = new Map<string, Promise<unknown>>()

  constructor(api: ApiTransport, options?: ApiClientOptions) {
    this.$api = api
    this.config = options
    this.errorHandler = options?.errorHandler
  }

  setErrorHandler(handler: IApiErrorHandler): void {
    this.errorHandler = handler
  }

  resolveUrl(url: string): string {
    return new URL(url, this.config?.baseUrl).toString()
  }

  async request(url: string, options: RequestOptions = {}, parseJson: boolean = true) {
    url = this.config?.baseUrl ? joinURL(this.config?.baseUrl, url) : url
    const { params, ...providedOptions } = options
    const requestOptions: RequestOptions = {
      ...providedOptions,
      headers: { ...this.config?.headers, ...providedOptions.headers },
    }
    const method = (requestOptions.method ?? "GET").toUpperCase()
    requestOptions.method = method
    if (
      requestOptions.body &&
      !(requestOptions.body instanceof FormData) &&
      !(requestOptions.body instanceof Blob) &&
      !(requestOptions.body instanceof ArrayBuffer) &&
      !(requestOptions.body instanceof Uint8Array) &&
      !(requestOptions.body instanceof File)
    ) {
      requestOptions.body = JSON.stringify(requestOptions.body)
    }

    if (params) {
      const queryString = new URLSearchParams(params).toString()
      if (queryString) url += `${url.includes("?") ? "&" : "?"}${queryString}`
    }

    const shouldDedupe =
      method === "GET" &&
      parseJson &&
      requestOptions.dedupe !== false &&
      !providedOptions.headers &&
      !requestOptions.signal
    const dedupeKey = shouldDedupe ? `${method}:${url}` : null

    const executeRequest = async () => {
      logger.log("[request] url:", url)
      logger.log("[request] options:", redactRequestOptionsForLog(requestOptions))

      const response = await this.$api.fetch(url, requestOptions as ApiRequestInit)

      logger.log("[request] response:", response)

      if (response.status === 401) {
        if (this.errorHandler) {
          await this.errorHandler.handle401(url)
        }
        throw await createHttpError(response)
      }
      if (response.status === 403) {
        // If suppress403Redirect is true, throw error instead of triggering global handler
        // This allows components to handle permission errors gracefully
        if (requestOptions.suppress403Redirect) {
          throw await createHttpError(response)
        }

        try {
          const cloned = response.clone()
          let codeText = ""
          try {
            const data = (await cloned.json()) as Record<string, unknown>
            let code: string | undefined = (data?.code as string | undefined) || (data?.Code as string | undefined)
            if (data && typeof data === "object" && "error" in data) {
              const errObj = (data as { error?: unknown }).error
              if (errObj && typeof errObj === "object") {
                const e = errObj as { code?: unknown }
                if (typeof e.code === "string") code = code ?? e.code
              }
            }
            codeText = typeof code === "string" ? code : ""
          } catch {
            codeText = ""
          }

          const normalizedCode = codeText.toLowerCase()
          const isUnauthorizedAccess = normalizedCode === "unauthorizedaccess"
          const isInvalidAccessKey = normalizedCode === "invalidaccesskeyid"

          if (this.errorHandler) {
            if (isUnauthorizedAccess || isInvalidAccessKey) {
              await this.errorHandler.handle401(url)
            } else {
              await this.errorHandler.handle403(url)
            }
          }
        } catch {
          if (this.errorHandler) {
            await this.errorHandler.handle403(url)
          }
        }
        throw await createHttpError(response)
      }

      if (!response.ok) {
        throw await createHttpError(response)
      }

      if (response.status === 204 || response.headers.get("content-length") === "0" || !response.body) {
        return null
      }

      if (parseJson) {
        return await response.json()
      } else {
        return response
      }
    }

    if (!dedupeKey) {
      return executeRequest()
    }

    const inflight = this.inflightGetRequests.get(dedupeKey)
    if (inflight) {
      return inflight
    }

    const requestPromise = executeRequest()
    this.inflightGetRequests.set(dedupeKey, requestPromise)
    try {
      return await requestPromise
    } finally {
      this.inflightGetRequests.delete(dedupeKey)
    }
  }

  async get(url: string, options?: RequestOptions) {
    return this.request(url, { method: "GET", ...options })
  }

  async *streamRequest(url: string, options: RequestOptions = {}) {
    const response = (await this.request(url, { method: "GET", ...options }, false)) as Response | null

    if (!response?.body) {
      throw new Error("No response body")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // Support NDJSON: each line is a JSON object
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const data = JSON.parse(trimmed) as Record<string, unknown>
          yield data
        } catch {
          // skip invalid JSON
        }
      }
    }
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer.trim()) as Record<string, unknown>
        yield data
      } catch {
        // skip trailing incomplete JSON
      }
    }
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
