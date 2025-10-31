/**
 * Unified error handling Composable
 * Provides consistent error handling and message display
 */
import { useMessage } from '~/lib/ui/message'
import { useI18n } from 'vue-i18n'

export interface ErrorHandlerOptions {
  /**
   * Whether to log errors to console
   * @default true
   */
  logError?: boolean
  /**
   * Default error message translation key
   * @default 'Operation failed'
   */
  defaultMessageKey?: string
}

/**
 * Error handling utility
 * @param options Configuration options
 * @returns Error handling functions
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const { logError = true, defaultMessageKey = 'Operation failed' } = options
  const message = useMessage()
  const { t } = useI18n()

  /**
   * Handle error
   * @param error Error object
   * @param defaultMessage Default error message (optional)
   */
  const handleError = (error: unknown, defaultMessage?: string): void => {
    let errorMessage = defaultMessage || t(defaultMessageKey)

    // Extract error message
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message)
    }

    // Log error
    if (logError) {
      console.error('[ErrorHandler]', error)
    }

    // Show error message
    message.error(errorMessage)
  }

  /**
   * Handle API error
   * @param error Error object
   * @param defaultMessage Default error message
   */
  const handleApiError = (
    error: unknown,
    defaultMessage?: string
  ): void => {
    // API errors may have specific format
    if (
      error &&
      typeof error === 'object' &&
      'response' in error &&
      'data' in error
    ) {
      const apiError = error as { response?: { data?: { message?: string } } }
      const apiMessage =
        apiError.response?.data?.message ||
        defaultMessage ||
        t('API request failed')
      handleError(apiMessage)
      return
    }

    handleError(error, defaultMessage)
  }

  /**
   * Handle error silently (without showing message)
   * @param error Error object
   * @returns Error message
   */
  const handleErrorSilently = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    return t(defaultMessageKey)
  }

  return {
    handleError,
    handleApiError,
    handleErrorSilently,
  }
}

