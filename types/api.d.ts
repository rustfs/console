export type ApiErrorHandlerCallback = (url?: string) => void | Promise<void>

export interface IApiErrorHandler {
  handle401(url?: string): Promise<void>
  handle403(url?: string): Promise<void>
  handleServerError(url?: string): Promise<void>
  handleByStatus(status: number, url?: string): Promise<void>
}
