/**
 * 统一的错误处理 Composable
 * 提供一致的错误处理和消息显示
 */
import { useMessage } from '~/lib/ui/message';
import { useI18n } from 'vue-i18n';

export interface ErrorHandlerOptions {
  /**
   * 是否记录错误到控制台
   * @default true
   */
  logError?: boolean;
  /**
   * 默认错误消息的翻译键
   * @default 'Operation failed'
   */
  defaultMessageKey?: string;
}

/**
 * 错误处理工具
 * @param options 配置选项
 * @returns 错误处理函数
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const { logError = true, defaultMessageKey = 'Operation failed' } = options;
  const message = useMessage();
  const { t } = useI18n();

  /**
   * 处理错误
   * @param error 错误对象
   * @param defaultMessage 默认错误消息（可选）
   */
  const handleError = (error: unknown, defaultMessage?: string): void => {
    let errorMessage = defaultMessage || t(defaultMessageKey);

    // 提取错误消息
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    }

    // 记录错误
    if (logError) {
      console.error('[ErrorHandler]', error);
    }

    // 显示错误消息
    message.error(errorMessage);
  };

  /**
   * 处理 API 错误
   * @param error 错误对象
   * @param defaultMessage 默认错误消息
   */
  const handleApiError = (
    error: unknown,
    defaultMessage?: string
  ): void => {
    // API 错误可能有特定的格式
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      'data' in error
    ) {
      const apiError = error as { response?: { data?: { message?: string } } };
      const apiMessage =
        apiError.response?.data?.message ||
        defaultMessage ||
        t('API request failed');
      handleError(apiMessage);
      return;
    }

    handleError(error, defaultMessage);
  };

  /**
   * 静默处理错误（不显示消息）
   * @param error 错误对象
   * @returns 错误消息
   */
  const handleErrorSilently = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return t(defaultMessageKey);
  };

  return {
    handleError,
    handleApiError,
    handleErrorSilently,
  };
}

