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
    return api.get("/datausageinfo")
  }, [api])

  const getSystemMetrics = useCallback(async () => {
    return api.get("/metrics")
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
