"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export function useSystem() {
  const api = useApi()

  const getSystemInfo = useCallback(
    async (signal?: AbortSignal) => {
      return api.get("/info", signal ? { signal, dedupe: false } : undefined)
    },
    [api],
  )

  const getStorageInfo = useCallback(
    async (signal?: AbortSignal) => {
      return api.get("/storageinfo", {
        suppress403Redirect: true,
        signal,
        dedupe: signal ? false : undefined,
      })
    },
    [api],
  )

  const getDataUsageInfo = useCallback(
    async (signal?: AbortSignal) => {
      try {
        return await api.get("/datausageinfo", {
          suppress403Redirect: true,
          signal,
          dedupe: signal ? false : undefined,
        })
      } catch (error: unknown) {
        const status =
          (error as { status?: number })?.status ?? (error as { response?: { status?: number } })?.response?.status
        if (status === 403) {
          // Preserve previous behavior: treat 403 as "no data" instead of rejecting.
          return undefined
        }
        throw error
      }
    },
    [api],
  )

  const getSystemMetrics = useCallback(
    async (signal?: AbortSignal) => {
      return api.get("/metrics", {
        params: {
          n: "1",
          types: "1",
        },
        signal,
        dedupe: signal ? false : undefined,
        suppress403Redirect: true,
      })
    },
    [api],
  )

  const getLicense = useCallback(async () => {
    return api.get("/license")
  }, [api])

  return {
    getSystemInfo,
    getStorageInfo,
    getDataUsageInfo,
    getSystemMetrics,
    getLicense,
  }
}
