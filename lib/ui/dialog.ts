import type { InjectionKey, Ref } from 'vue'
import { inject, reactive, ref } from 'vue'

export type DialogTone = 'default' | 'destructive' | 'warning'

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
  id: number
  open: boolean
  tone: DialogTone
}

export interface DialogHandle {
  destroy: () => void
}

export interface DialogController {
  dialogs: Ref<DialogInstance[]>
  open: (options: DialogOptions, tone?: DialogTone) => DialogHandle
  close: (id: number) => void
  setOpen: (id: number, value: boolean) => void
}

export const dialogControllerKey: InjectionKey<DialogController> = Symbol('app-dialog')

let seed = 0

const removalDelay = 150

export const createDialogController = (): DialogController => {
  const dialogs = ref<DialogInstance[]>([])

  const remove = (id: number) => {
    const index = dialogs.value.findIndex(item => item.id === id)
    if (index !== -1) {
      dialogs.value.splice(index, 1)
    }
  }

  const close = (id: number) => {
    const target = dialogs.value.find(item => item.id === id)
    if (!target) return
    target.open = false
    setTimeout(() => remove(id), removalDelay)
  }

  const open = (options: DialogOptions, tone: DialogTone = 'default'): DialogHandle => {
    const id = ++seed
    const instance = reactive<DialogInstance>({
      id,
      open: true,
      tone,
      title: options.title,
      content: options.content,
      positiveText: options.positiveText,
      negativeText: options.negativeText,
      onPositiveClick: options.onPositiveClick,
      onNegativeClick: options.onNegativeClick,
    })

    dialogs.value.push(instance)

    return {
      destroy: () => close(id),
    }
  }

  const setOpen = (id: number, value: boolean) => {
    if (value) return
    close(id)
  }

  return {
    dialogs,
    open,
    close,
    setOpen,
  }
}

export const useDialogController = () => {
  const controller = inject(dialogControllerKey)
  if (!controller) {
    throw new Error('useDialog must be used within AppUiProvider')
  }
  return controller
}

export const useDialog = () => {
  const controller = useDialogController()
  return {
    create: (options: DialogOptions) => controller.open(options, 'default'),
    error: (options: DialogOptions) => controller.open(options, 'destructive'),
    warning: (options: DialogOptions) => controller.open(options, 'warning'),
    info: (options: DialogOptions) => controller.open(options, 'default'),
  }
}
