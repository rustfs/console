import { inject } from 'vue'
import type { ExternalToast } from 'vue-sonner'
import { toast } from 'vue-sonner'

export interface MessageOptions {
  duration?: number
  description?: string
}

export interface MessageHandle {
  destroy: () => void
}

export interface MessageApi {
  success: (content: string, options?: MessageOptions) => void
  error: (content: string, options?: MessageOptions) => void
  warning: (content: string, options?: MessageOptions) => void
  info: (content: string, options?: MessageOptions) => void
  loading: (content: string, options?: MessageOptions) => MessageHandle
  destroyAll: () => void
}

export const messageInjectionKey = Symbol('app-message')

const mapOptions = (options?: MessageOptions): ExternalToast => {
  if (!options) return {}
  const mapped: ExternalToast = {}

  if (options.duration !== undefined) {
    mapped.duration = options.duration === 0 ? Number.POSITIVE_INFINITY : options.duration
  }

  if (options.description) {
    mapped.description = options.description
  }

  return mapped
}

const show = (type: 'success' | 'error' | 'warning' | 'info', content: string, options?: MessageOptions) => {
  const mapped = mapOptions(options)
  switch (type) {
    case 'success':
      toast.success(content, mapped)
      break
    case 'error':
      toast.error(content, mapped)
      break
    case 'warning':
      toast.warning(content, mapped)
      break
    case 'info':
      toast.info(content, mapped)
      break
  }
}

export const createMessageApi = (): MessageApi => {
  const loading = (content: string, options?: MessageOptions): MessageHandle => {
    const mapped = mapOptions(options)
    const id = toast.loading(content, mapped)

    return {
      destroy: () => toast.dismiss(id),
    }
  }

  return {
    success: (content, options) => show('success', content, options),
    error: (content, options) => show('error', content, options),
    warning: (content, options) => show('warning', content, options),
    info: (content, options) => show('info', content, options),
    loading,
    destroyAll: () => toast.dismiss(),
  }
}

export const useMessage = (): MessageApi => {
  const api = inject<MessageApi>(messageInjectionKey)

  if (!api) {
    throw new Error('useMessage must be used within AppUiProvider')
  }

  return api
}
