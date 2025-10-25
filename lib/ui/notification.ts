import type { ExternalToast, ToastT } from 'vue-sonner'
import { toast } from 'vue-sonner'

export interface NotificationOptions {
  title?: string
  description?: string
  duration?: number
  type?: 'default' | 'success' | 'error' | 'warning' | 'info'
}

export interface NotificationHandle {
  destroy: () => void
}

const mapOptions = (options?: NotificationOptions): ExternalToast => {
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

const show = (options: NotificationOptions): ToastT => {
  const { title = '', type = 'default' } = options
  const mapped = mapOptions(options)

  switch (type) {
    case 'success':
      return toast.success(title, mapped)
    case 'error':
      return toast.error(title, mapped)
    case 'warning':
      return toast.warning(title, mapped)
    case 'info':
      return toast.info(title, mapped)
    default:
      return toast(title, mapped)
  }
}

export const useNotification = () => {
  return {
    create: (options: NotificationOptions = {}) => {
      const id = show(options)
      return {
        destroy: () => toast.dismiss(id),
      }
    },
    success: (title: string, options?: NotificationOptions) => {
      toast.success(title, mapOptions(options))
    },
    error: (title: string, options?: NotificationOptions) => {
      toast.error(title, mapOptions(options))
    },
    warning: (title: string, options?: NotificationOptions) => {
      toast.warning(title, mapOptions(options))
    },
    info: (title: string, options?: NotificationOptions) => {
      toast.info(title, mapOptions(options))
    },
  }
}
