export const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args)
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },
}
