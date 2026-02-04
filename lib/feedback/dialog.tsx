"use client"

import { createContext, useContext, useCallback, useState } from "react"

let dialogSeed = 0

export type DialogTone = "default" | "destructive" | "warning"

type DialogActionResult = void | boolean | Promise<void | boolean>

export interface DialogOptions {
  title?: string
  content?: string
  positiveText?: string
  negativeText?: string
  onPositiveClick?: () => DialogActionResult
  onNegativeClick?: () => DialogActionResult
}

export interface DialogInstance extends DialogOptions {
  id: string
  open: boolean
  tone: DialogTone
}

export interface DialogHandle {
  destroy: () => void
}

export interface DialogController {
  dialogs: DialogInstance[]
  open: (options: DialogOptions, tone?: DialogTone) => DialogHandle
  close: (id: string) => void
  setOpen: (id: string, value: boolean) => void
}

const DialogContext = createContext<DialogController | null>(null)

const REMOVAL_DELAY = 150

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogs, setDialogs] = useState<DialogInstance[]>([])

  const remove = useCallback((id: string) => {
    setDialogs((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const close = useCallback(
    (id: string) => {
      setDialogs((prev) => prev.map((d) => (d.id === id ? { ...d, open: false } : d)))
      setTimeout(() => remove(id), REMOVAL_DELAY)
    },
    [remove],
  )

  const open = useCallback(
    (options: DialogOptions, tone: DialogTone = "default"): DialogHandle => {
      const id = `dialog-${++dialogSeed}-${Date.now()}`
      const instance: DialogInstance = {
        id,
        open: true,
        tone,
        ...options,
      }

      setDialogs((prev) => [...prev, instance])

      return {
        destroy: () => close(id),
      }
    },
    [close],
  )

  const setOpen = useCallback(
    (id: string, value: boolean) => {
      if (value) return
      close(id)
    },
    [close],
  )

  const controller: DialogController = {
    dialogs,
    open,
    close,
    setOpen,
  }

  return <DialogContext.Provider value={controller}>{children}</DialogContext.Provider>
}

export function useDialogController() {
  const controller = useContext(DialogContext)
  if (!controller) {
    throw new Error("useDialog must be used within AppUiProvider")
  }
  return controller
}

export function useDialog() {
  const controller = useDialogController()
  return {
    create: (options: DialogOptions) => controller.open(options, "default"),
    error: (options: DialogOptions) => controller.open(options, "destructive"),
    warning: (options: DialogOptions) => controller.open(options, "warning"),
    info: (options: DialogOptions) => controller.open(options, "default"),
  }
}
