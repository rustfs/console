import type { ApiErrorHandlerCallback, IApiErrorHandler } from "@/types/api"

export class ApiErrorHandler implements IApiErrorHandler {
  private onUnauthorized?: ApiErrorHandlerCallback
  private onForbidden?: ApiErrorHandlerCallback
  private onServerError?: ApiErrorHandlerCallback

  constructor(callbacks?: {
    onUnauthorized?: ApiErrorHandlerCallback
    onForbidden?: ApiErrorHandlerCallback
    onServerError?: ApiErrorHandlerCallback
  }) {
    this.onUnauthorized = callbacks?.onUnauthorized
    this.onForbidden = callbacks?.onForbidden
    this.onServerError = callbacks?.onServerError
  }

  async handle401(url?: string): Promise<void> {
    if (this.onUnauthorized) {
      await this.onUnauthorized(url)
    }
  }

  async handle403(url?: string): Promise<void> {
    if (this.onForbidden) {
      await this.onForbidden(url)
    }
  }

  async handleServerError(url?: string): Promise<void> {
    if (this.onServerError) {
      await this.onServerError(url)
    }
  }

  async handleByStatus(status: number, url?: string): Promise<void> {
    switch (status) {
      case 401:
        await this.handle401(url)
        break
      case 403:
        await this.handle403(url)
        break
      case 500:
      case 502:
      case 503:
      case 504:
        await this.handleServerError(url)
        break
    }
  }
}
