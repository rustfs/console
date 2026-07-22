export interface EventDestinationsLoadState<T> {
  data: T[]
  loadFailed: boolean
  notifyEnabled: boolean | undefined
  notifyFailed: boolean
}

export const initialEventDestinationsState: EventDestinationsLoadState<never> = {
  data: [],
  loadFailed: false,
  notifyEnabled: undefined,
  notifyFailed: false,
}

export function readTargetListNotifyState(payload: unknown): {
  present: boolean
  value: boolean | undefined
} {
  if (!payload || typeof payload !== "object" || !Object.hasOwn(payload, "notify_enabled")) {
    return { present: false, value: undefined }
  }

  const value = (payload as { notify_enabled?: unknown }).notify_enabled
  return { present: true, value: typeof value === "boolean" ? value : undefined }
}

export function readModuleNotifyState(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined
  const value = (payload as { notify_enabled?: unknown }).notify_enabled
  return typeof value === "boolean" ? value : undefined
}

export async function resolveEventDestinationsNotifyState(
  targetListPayload: unknown,
  loadModuleSwitches: () => Promise<unknown>,
) {
  const targetListState = readTargetListNotifyState(targetListPayload)
  if (targetListState.present) return targetListState.value

  try {
    return readModuleNotifyState(await loadModuleSwitches())
  } catch {
    return undefined
  }
}

export function applyEventDestinationsLoadResult<T>(
  current: EventDestinationsLoadState<T>,
  result: { ok: true; data: T[]; notifyEnabled: boolean | undefined } | { ok: false },
): EventDestinationsLoadState<T> {
  if (!result.ok) {
    return {
      ...current,
      loadFailed: true,
      notifyEnabled: undefined,
      notifyFailed: false,
    }
  }

  return {
    data: result.data,
    loadFailed: false,
    notifyEnabled: result.notifyEnabled,
    notifyFailed: result.notifyEnabled === undefined,
  }
}

export function canManageEventDestinations({
  notifyEnabled,
  loading,
  loadFailed,
  notifyFailed,
}: {
  notifyEnabled: boolean | undefined
  loading: boolean
  loadFailed: boolean
  notifyFailed: boolean
}) {
  return notifyEnabled === true && !loading && !loadFailed && !notifyFailed
}
