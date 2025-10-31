/**
 * Unified form validation Composable
 * Provides type-safe form validation based on Zod schema
 */
import { z } from 'zod'
import { useMessage } from '~/lib/ui/message'
import { useI18n } from 'vue-i18n'

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: z.ZodError
}

/**
 * Form validation using Zod schema
 * @param schema Zod schema definition
 * @returns Validation functions and error handling utilities
 */
export function useFormValidation<T extends z.ZodTypeAny>(schema: T) {
  const { t } = useI18n()
  const message = useMessage()

  /**
   * Validate data against schema
   * @param data Data to validate
   * @returns Validation result
   */
  const validate = (data: unknown): ValidationResult<z.infer<T>> => {
    const result = schema.safeParse(data)

    if (!result.success) {
      return {
        success: false,
        errors: result.error,
      }
    }

    return {
      success: true,
      data: result.data,
    }
  }

  /**
   * Validate data and show error message on failure
   * @param data Data to validate
   * @param showMessage Whether to show error message
   * @returns Whether validation passed
   */
  const validateWithMessage = (
    data: unknown,
    showMessage = true
  ): data is z.infer<T> => {
    const result = validate(data)

    if (!result.success && showMessage) {
      const firstError = result.errors?.errors[0]
      if (firstError) {
        const fieldName = firstError.path.join('.')
        const errorMessage = firstError.message || t('Validation failed')
        message.error(
          fieldName ? `${fieldName}: ${errorMessage}` : errorMessage
        )
      } else {
        message.error(t('Validation failed'))
      }
    }

    return result.success
  }

  /**
   * Get field error message
   * @param errors ZodError instance
   * @param fieldPath Field path
   * @returns Error message or undefined
   */
  const getFieldError = (
    errors: z.ZodError | undefined,
    fieldPath: (string | number)[]
  ): string | undefined => {
    if (!errors) return undefined

    const error = errors.errors.find((e) => {
      return (
        e.path.length === fieldPath.length &&
        e.path.every((p, i) => p === fieldPath[i])
      )
    })

    return error?.message
  }

  return {
    validate,
    validateWithMessage,
    getFieldError,
    schema,
  }
}

