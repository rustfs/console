export interface LoadingBarApi {
  start: () => void
  finish: () => void
  error: () => void
}

const noop = () => {}

export const useLoadingBar = (): LoadingBarApi => ({
  start: noop,
  finish: noop,
  error: noop,
})
