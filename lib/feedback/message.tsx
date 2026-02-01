"use client"

import { createContext, useContext, useMemo } from "react"
import { toast } from "sonner"

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

const MessageContext = createContext<MessageApi | null>(null)

function createMessageApi(): MessageApi {
  const show = (
    type: "success" | "error" | "warning" | "info",
    content: string,
    options?: MessageOptions
  ) => {
    const mapped: { duration?: number; description?: string } = {}
    if (options?.duration !== undefined) {
      mapped.duration = options.duration === 0 ? Infinity : options.duration
    }
    if (options?.description) mapped.description = options.description

    switch (type) {
      case "success":
        toast.success(content, mapped)
        break
      case "error":
        toast.error(content, mapped)
        break
      case "warning":
        toast.warning(content, mapped)
        break
      case "info":
        toast.info(content, mapped)
        break
    }
  }

  const loading = (
    content: string,
    options?: MessageOptions
  ): MessageHandle => {
    const mapped: { duration?: number } = {}
    if (options?.duration !== undefined) {
      mapped.duration = options.duration === 0 ? Infinity : options.duration
    }
    const id = toast.loading(content, mapped)
    return {
      destroy: () => toast.dismiss(id),
    }
  }

  return {
    success: (content, options) => show("success", content, options),
    error: (content, options) => show("error", content, options),
    warning: (content, options) => show("warning", content, options),
    info: (content, options) => show("info", content, options),
    loading,
    destroyAll: () => toast.dismiss(),
  }
}

const messageApi = createMessageApi()

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => messageApi, [])
  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  )
}

export function useMessage(): MessageApi {
  const api = useContext(MessageContext)
  if (!api) {
    throw new Error("useMessage must be used within MessageProvider")
  }
  return api
}
