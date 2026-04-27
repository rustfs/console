type DialogActionResult = void | boolean | Promise<void | boolean>

interface RunDialogActionOptions {
  dialogId: string
  pendingIds: Set<string>
  setPendingIds: (pendingIds: Set<string>) => void
  action?: () => DialogActionResult
  close: () => void
  onError?: (error: unknown) => void
}

export async function runDialogAction({
  dialogId,
  pendingIds,
  setPendingIds,
  action,
  close,
  onError,
}: RunDialogActionOptions): Promise<boolean> {
  if (!action) {
    close()
    return true
  }

  if (pendingIds.has(dialogId)) {
    return false
  }

  pendingIds.add(dialogId)
  setPendingIds(new Set(pendingIds))

  try {
    const result = await action()
    if (result !== false) {
      close()
    }
    return true
  } catch (error) {
    onError?.(error)
    return false
  } finally {
    pendingIds.delete(dialogId)
    setPendingIds(new Set(pendingIds))
  }
}
