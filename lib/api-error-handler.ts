import type {
  ApiErrorHandlerCallback,
  IApiErrorHandler,
} from "@/types/api"

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

  async handle401(): Promise<void> {
    if (this.onUnauthorized) {
      await this.onUnauthorized()
    }
  }

  async handle403(): Promise<void> {
    if (this.onForbidden) {
      await this.onForbidden()
    }
  }

  async handleServerError(): Promise<void> {
    if (this.onServerError) {
      await this.onServerError()
    }
  }

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
