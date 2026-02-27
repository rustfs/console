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
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status
      if (status === 403) {
        // Preserve previous behavior: treat 403 as "no data" instead of rejecting.
        return undefined
      }
      throw error
    }
  }, [api])

  const getSystemMetrics = useCallback(async () => {
    try {
      let merged: Record<string, unknown> = {}
      for await (const data of api.streamRequest("/metrics")) {
        merged = { ...merged, ...data }
      }
      if (Object.keys(merged).length > 0) return merged
    } catch {
      // Fallback: try regular GET if streaming fails (e.g. API returns single JSON)
    }
    const res = await api.get("/metrics")
    return (res as Record<string, unknown>) ?? {}
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
