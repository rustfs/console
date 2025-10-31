/**
 * API error handler
 * Handles errors in API requests, especially authentication errors
 */
import type { ApiErrorHandlerCallback, IApiErrorHandler } from '~/types/api'

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

  /**
   * Handle 401 Unauthorized error
   */
  async handle401(): Promise<void> {
    if (this.onUnauthorized) {
      await this.onUnauthorized()
    }
  }

  /**
   * Handle 403 Forbidden error
   */
  async handle403(): Promise<void> {
    if (this.onForbidden) {
      await this.onForbidden()
    }
  }

  /**
   * Handle 5xx server errors
   */
  async handleServerError(): Promise<void> {
    if (this.onServerError) {
      await this.onServerError()
    }
  }

  /**
   * Handle error by status code
   * @param status HTTP status code
   */
  async handleByStatus(status: number): Promise<void> {
    switch (status) {
      case 401:
        await this.handle401()
        break
      case 403:
        await this.handle403()
        break
      case 500:
      case 502:
      case 503:
      case 504:
        await this.handleServerError()
        break
    }
  }
}

