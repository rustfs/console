/**
 * API related type definitions
 */

/**
 * API error handler callback function type
 */
export type ApiErrorHandlerCallback = () => void | Promise<void>

/**
 * API client error handler interface
 */
export interface IApiErrorHandler {
  handle401(): Promise<void>
  handle403(): Promise<void>
  handleServerError(): Promise<void>
  handleByStatus(status: number): Promise<void>
}

/**
 * API request base configuration
 */
export interface ApiRequestConfig {
  baseURL?: string
  headers?: Record<string, string>
  timeout?: number
}

/**
 * API response base structure
 */
export interface ApiResponse<T = any> {
  data?: T
  message?: string
  code?: number
}

/**
 * Pagination request parameters
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  offset?: number
  limit?: number
}

/**
 * Paginated response data
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page?: number
  pageSize?: number
}

