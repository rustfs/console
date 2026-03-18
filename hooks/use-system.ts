"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export function useSystem() {
  const api = useApi()

  const getSystemInfo = useCallback(async () => {
    return api.get("/info")
  }, [api])

  const getStorageInfo = useCallback(async () => {
    return api.get("/storageinfo")
  }, [api])

  const getDataUsageInfo = useCallback(async () => {
    try {
      return await api.get("/datausageinfo", { suppress403Redirect: true })
    } catch (error: unknown) {
      const status =
        (error as { status?: number })?.status ?? (error as { response?: { status?: number } })?.response?.status
      if (status === 403) {
        // Preserve previous behavior: treat 403 as "no data" instead of rejecting.
        return undefined
      }
      throw error
    }
  }, [api])

  const getSystemMetrics = useCallback(async () => {
    try {
      return await api.get("/metrics", {
        params: {
          n: "1",
          types: "1",
        },
      })
    } catch {
      // Keep page rendering resilient when metrics endpoint is temporarily unavailable.
    }
    return {}
  }, [api])

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
