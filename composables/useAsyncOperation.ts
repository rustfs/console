/**
 * Unified async operation management Composable
 * Provides loading state, error handling, and retry mechanism
 */
import { ref, readonly, type Ref } from 'vue'
import { useErrorHandler } from './useErrorHandler'

export interface AsyncOperationOptions {
  /**
   * Whether to automatically handle errors
   * @default true
   */
  autoHandleError?: boolean
  /**
   * Default error message
   */
  defaultErrorMessage?: string
  /**
   * Number of retries
   * @default 0
   */
  retries?: number
  /**
   * Retry delay in milliseconds
   * @default 1000
   */
  retryDelay?: number
}

export interface UseAsyncOperationReturn<T extends (...args: any[]) => Promise<any>> {
  /**
   * Loading state (readonly)
   */
  loading: Readonly<Ref<boolean>>
  /**
   * Error information (readonly)
   */
  error: Readonly<Ref<Error | null>>
  /**
   * Execute async operation
   */
  execute: (...args: Parameters<T>) => Promise<ReturnType<T> | null>
  /**
   * Reset error state
   */
  resetError: () => void
}

/**
 * Wrap async operation with loading state and error handling
 * @param operation Async operation function
 * @param options Configuration options
 * @returns Object containing loading state and execute function
 */
export function useAsyncOperation<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  options: AsyncOperationOptions = {}
): UseAsyncOperationReturn<T> {
  const { autoHandleError = true, defaultErrorMessage, retries = 0, retryDelay = 1000 } = options

  const loading = ref(false)
  const error = ref<Error | null>(null)
  const { handleError } = useErrorHandler()

  /**
   * Execute retry logic
   */
  const executeWithRetry = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation(...args)
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        // If not the last attempt, wait and retry
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        }
      }
    }

    throw lastError || new Error('Operation failed')
  }

  /**
   * Execute async operation
   */
  const execute = async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
    loading.value = true
    error.value = null

    try {
      const result = await executeWithRetry(...args)
      return result
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err))
      error.value = errorInstance

      if (autoHandleError) {
        handleError(errorInstance, defaultErrorMessage)
      }

      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Reset error state
   */
  const resetError = () => {
    error.value = null
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    execute,
    resetError,
  }
}
