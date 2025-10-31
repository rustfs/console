/**
 * 统一的异步操作管理 Composable
 * 提供加载状态、错误处理和重试机制
 */
import { ref, readonly, type Ref } from 'vue';
import { useErrorHandler } from './useErrorHandler';

export interface AsyncOperationOptions {
  /**
   * 是否自动处理错误
   * @default true
   */
  autoHandleError?: boolean;
  /**
   * 默认错误消息
   */
  defaultErrorMessage?: string;
  /**
   * 重试次数
   * @default 0
   */
  retries?: number;
  /**
   * 重试延迟（毫秒）
   * @default 1000
   */
  retryDelay?: number;
}

export interface UseAsyncOperationReturn<T extends (...args: any[]) => Promise<any>> {
  /**
   * 加载状态（只读）
   */
  loading: Readonly<Ref<boolean>>;
  /**
   * 错误信息（只读）
   */
  error: Readonly<Ref<Error | null>>;
  /**
   * 执行异步操作
   */
  execute: (...args: Parameters<T>) => Promise<ReturnType<T> | null>;
  /**
   * 重置错误状态
   */
  resetError: () => void;
}

/**
 * 包装异步操作，提供加载状态和错误处理
 * @param operation 异步操作函数
 * @param options 配置选项
 * @returns 包含加载状态和执行函数的对象
 */
export function useAsyncOperation<T extends (...args: any[]) => Promise<any>>(
  operation: T,
  options: AsyncOperationOptions = {}
): UseAsyncOperationReturn<T> {
  const {
    autoHandleError = true,
    defaultErrorMessage,
    retries = 0,
    retryDelay = 1000,
  } = options;

  const loading = ref(false);
  const error = ref<Error | null>(null);
  const { handleError } = useErrorHandler();

  /**
   * 执行重试逻辑
   */
  const executeWithRetry = async (
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation(...args);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // 如果不是最后一次尝试，等待后重试
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
      }
    }

    throw lastError || new Error('Operation failed');
  };

  /**
   * 执行异步操作
   */
  const execute = async (
    ...args: Parameters<T>
  ): Promise<ReturnType<T> | null> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await executeWithRetry(...args);
      return result;
    } catch (err) {
      const errorInstance =
        err instanceof Error ? err : new Error(String(err));
      error.value = errorInstance;

      if (autoHandleError) {
        handleError(errorInstance, defaultErrorMessage);
      }

      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 重置错误状态
   */
  const resetError = () => {
    error.value = null;
  };

  return {
    loading: readonly(loading),
    error: readonly(error),
    execute,
    resetError,
  };
}

