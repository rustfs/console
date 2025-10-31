/**
 * 统一的表单验证 Composable
 * 基于 Zod schema 提供类型安全的表单验证
 */
import { z } from 'zod';
import { useMessage } from '~/lib/ui/message';
import { useI18n } from 'vue-i18n';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
}

/**
 * 使用 Zod schema 进行表单验证
 * @param schema Zod schema 定义
 * @returns 验证函数和错误处理工具
 */
export function useFormValidation<T extends z.ZodTypeAny>(schema: T) {
  const { t } = useI18n();
  const message = useMessage();

  /**
   * 验证数据是否符合 schema
   * @param data 待验证的数据
   * @returns 验证结果
   */
  const validate = (data: unknown): ValidationResult<z.infer<T>> => {
    const result = schema.safeParse(data);

    if (!result.success) {
      return {
        success: false,
        errors: result.error,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  };

  /**
   * 验证数据，失败时显示错误消息
   * @param data 待验证的数据
   * @param showMessage 是否显示错误消息
   * @returns 验证是否通过
   */
  const validateWithMessage = (
    data: unknown,
    showMessage = true
  ): data is z.infer<T> => {
    const result = validate(data);

    if (!result.success && showMessage) {
      const firstError = result.errors?.errors[0];
      if (firstError) {
        const fieldName = firstError.path.join('.');
        const errorMessage = firstError.message || t('Validation failed');
        message.error(
          fieldName ? `${fieldName}: ${errorMessage}` : errorMessage
        );
      } else {
        message.error(t('Validation failed'));
      }
    }

    return result.success;
  };

  /**
   * 获取字段错误消息
   * @param errors ZodError 实例
   * @param fieldPath 字段路径
   * @returns 错误消息或 undefined
   */
  const getFieldError = (
    errors: z.ZodError | undefined,
    fieldPath: (string | number)[]
  ): string | undefined => {
    if (!errors) return undefined;

    const error = errors.errors.find((e) => {
      return (
        e.path.length === fieldPath.length &&
        e.path.every((p, i) => p === fieldPath[i])
      );
    });

    return error?.message;
  };

  return {
    validate,
    validateWithMessage,
    getFieldError,
    schema,
  };
}

