export type ApiErrorHandlerCallback = () => void | Promise<void>

export interface IApiErrorHandler {
  handle401(): Promise<void>
  handle403(): Promise<void>
  handleServerError(): Promise<void>
  handleByStatus(status: number): Promise<void>
}
