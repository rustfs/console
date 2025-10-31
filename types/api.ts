/**
 * API 相关类型定义
 */

/**
 * API 错误处理器回调函数类型
 */
export type ApiErrorHandlerCallback = () => void | Promise<void>;

/**
 * API 客户端错误处理器接口
 */
export interface IApiErrorHandler {
  handle401(): Promise<void>;
  handle403(): Promise<void>;
  handleServerError(): Promise<void>;
  handleByStatus(status: number): Promise<void>;
}

/**
 * API 请求基础配置
 */
export interface ApiRequestConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * API 响应基础结构
 */
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  code?: number;
}

/**
 * 分页请求参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
}

/**
 * 分页响应数据
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

