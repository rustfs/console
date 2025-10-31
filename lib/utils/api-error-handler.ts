/**
 * API 错误处理器
 * 处理 API 请求中的错误，特别是认证错误
 */
import type { ApiErrorHandlerCallback, IApiErrorHandler } from '~/types/api';

export class ApiErrorHandler implements IApiErrorHandler {
  private onUnauthorized?: ApiErrorHandlerCallback;
  private onForbidden?: ApiErrorHandlerCallback;
  private onServerError?: ApiErrorHandlerCallback;

  constructor(callbacks?: {
    onUnauthorized?: ApiErrorHandlerCallback;
    onForbidden?: ApiErrorHandlerCallback;
    onServerError?: ApiErrorHandlerCallback;
  }) {
    this.onUnauthorized = callbacks?.onUnauthorized;
    this.onForbidden = callbacks?.onForbidden;
    this.onServerError = callbacks?.onServerError;
  }

  /**
   * 处理 401 未授权错误
   */
  async handle401(): Promise<void> {
    if (this.onUnauthorized) {
      await this.onUnauthorized();
    }
  }

  /**
   * 处理 403 禁止访问错误
   */
  async handle403(): Promise<void> {
    if (this.onForbidden) {
      await this.onForbidden();
    }
  }

  /**
   * 处理 5xx 服务器错误
   */
  async handleServerError(): Promise<void> {
    if (this.onServerError) {
      await this.onServerError();
    }
  }

  /**
   * 根据状态码处理错误
   * @param status HTTP 状态码
   */
  async handleByStatus(status: number): Promise<void> {
    switch (status) {
      case 401:
        await this.handle401();
        break;
      case 403:
        await this.handle403();
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        await this.handleServerError();
        break;
    }
  }
}

