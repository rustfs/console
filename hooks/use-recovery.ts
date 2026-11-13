"use client"

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { useApiReady } from "@/contexts/api-context"
import type { ApiClient } from "@/lib/api-client"
import { asRecoveryError, RecoveryClient, RecoveryError } from "@/lib/recovery"

const clients = new WeakMap<ApiClient, RecoveryClient>()

export function useRecoveryClient(): RecoveryClient | null {
  const { api, isReady } = useApiReady()
  return useMemo(() => {
    if (!api || !isReady) return null
    let client = clients.get(api)
    if (!client) {
      client = new RecoveryClient(api)
      clients.set(api, client)
    }
    return client
  }, [api, isReady])
}

interface ReadState<T> {
  data: T | null
  error: RecoveryError | null
  loading: boolean
  stale: boolean
}

interface ReadOptions {
  enabled: boolean
  identity: unknown
  pollIntervalMs?: number
  /** Manual pages opt out until their first explicit load. */
  auto?: boolean
}

/** Each hook identity owns its observations, cancellation, and retry schedule. */
function readSession<T>(loader: (signal: AbortSignal) => Promise<T>, options: ReadOptions) {
  let state: ReadState<T> = { data: null, error: null, loading: false, stale: false }
  let flight: Promise<void> | null = null
  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let failures = 0
  let mounted = false
  let requested = options.auto !== false
  const listeners = new Set<() => void>()
  const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden"
  const publish = (next: ReadState<T>) => {
    state = next
    for (const listener of listeners) listener()
  }
  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  const cancel = () => {
    clearTimer()
    generation++
    controller?.abort()
    controller = null
    flight = null
    if (state.loading || state.data !== null) publish({ ...state, loading: false, stale: state.data !== null })
  }
  const refresh = (): Promise<void> => {
    if (!mounted || !options.enabled || !visible()) return Promise.resolve()
    if (flight) return flight
    clearTimer()
    requested = true
    const current = ++generation
    const request = new AbortController()
    controller = request
    publish({ ...state, loading: true, error: null, stale: state.data !== null })
    flight = Promise.resolve()
      .then(() => loader(request.signal))
      .then(
        (data) => {
          if (current !== generation || !mounted) return
          failures = 0
          publish({ data, error: null, loading: false, stale: false })
        },
        (error: unknown) => {
          if (current !== generation || !mounted) return
          failures = Math.min(failures + 1, 3)
          publish({ ...state, error: asRecoveryError(error), loading: false, stale: state.data !== null })
        },
      )
      .finally(() => {
        if (current !== generation || !mounted) return
        controller = null
        flight = null
        if (options.pollIntervalMs && visible()) {
          timer = setTimeout(() => void refresh(), options.pollIntervalMs * 2 ** failures)
        }
      })
    return flight
  }
  const onVisibility = () => {
    if (!visible()) cancel()
    else if (requested) void refresh()
  }
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    snapshot: () => state,
    refresh,
    start: () => {
      mounted = true
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility)
      if (requested) void refresh()
      return () => {
        mounted = false
        if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility)
        cancel()
      }
    },
  }
}

export function useRecoveryRead<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  { enabled, identity, pollIntervalMs, auto = true }: ReadOptions,
) {
  const session = useMemo(
    () => readSession(loader, { enabled, identity, pollIntervalMs, auto }),
    [loader, enabled, identity, pollIntervalMs, auto],
  )
  const state = useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot)
  useEffect(() => session.start(), [session])
  return { ...state, refresh: session.refresh }
}

function useMrfPage(kind: "summary" | "list", enabled: boolean) {
  const client = useRecoveryClient()
  const [selection, setSelection] = useState<{ scope: string | null; cursor?: string; requested: boolean }>({
    scope: null,
    requested: false,
  })
  const current = selection.scope === client?.scopeId ? selection : null
  const cursor = current?.cursor
  const loader = useCallback(
    (signal: AbortSignal) => {
      if (!client) return Promise.reject(new RecoveryError("denied"))
      return kind === "summary" ? client.mrfSummary(cursor, signal) : client.mrfList(cursor, 100, signal)
    },
    [client, cursor, kind],
  )
  const state = useRecoveryRead(loader, {
    enabled: enabled && client !== null,
    identity: client,
    pollIntervalMs: kind === "summary" ? 15_000 : undefined,
    auto: kind === "summary" || current?.requested === true,
  })
  const refresh = state.refresh
  const load = useCallback(
    async (nextCursor?: string) => {
      if (!enabled || !client) return
      if (cursor === nextCursor && (kind === "summary" || current?.requested)) {
        await refresh()
      } else {
        setSelection({ scope: client.scopeId, cursor: nextCursor, requested: true })
      }
    },
    [enabled, client, cursor, kind, current?.requested, refresh],
  )
  return { ...state, load, cursor: cursor ?? null }
}

export function useMrfSummary({ enabled }: { enabled: boolean }) {
  return useMrfPage("summary", enabled)
}

export function useMrfList({ enabled }: { enabled: boolean }) {
  return useMrfPage("list", enabled)
}
