"use client"

import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSystem } from "@/hooks/use-system"
import {
  normalizeStorageInfo,
  normalizeSystemInfo,
  type DataUsageInfo,
  type MetricsInfo,
  type StorageInfo,
  type SystemInfo,
} from "@/lib/performance-data"

export type { DataUsageInfo, MetricsInfo, ServerInfo, StorageInfo, SystemInfo } from "@/lib/performance-data"

export function usePerformanceData() {
  const { t } = useTranslation()
  const systemApi = useSystem()

  const [metricsInfo, setMetricsInfo] = useState<MetricsInfo>({})
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({})
  const [datausageinfo, setDatausageinfo] = useState<DataUsageInfo>({})
  const [storageinfo, setStorageinfo] = useState<StorageInfo>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = React.useRef(true)
  const refetchingRef = React.useRef(false)

  const refetch = useCallback(async () => {
    if (!mountedRef.current || refetchingRef.current) return
    refetchingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const [sysRes, usageRes, storageRes] = await Promise.all([
        systemApi.getSystemInfo(),
        systemApi.getDataUsageInfo(),
        systemApi.getStorageInfo(),
      ])
      if (!mountedRef.current) return
      setSystemInfo(normalizeSystemInfo(sysRes))
      setDatausageinfo((usageRes as DataUsageInfo) ?? {})
      setStorageinfo(normalizeStorageInfo(storageRes))
    } catch (err) {
      if (!mountedRef.current) return
      console.error("Failed to load performance data:", err)
      setError((err as Error)?.message ?? t("Get Data Failed"))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
    try {
      const metricsRes = await systemApi.getSystemMetrics()
      if (mountedRef.current) setMetricsInfo((metricsRes as MetricsInfo) ?? {})
    } catch {
      if (mountedRef.current) setMetricsInfo({})
    } finally {
      refetchingRef.current = false
    }
  }, [systemApi, t])

  useEffect(() => {
    mountedRef.current = true
    void refetch()
    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once on mount; systemApi is stable
  }, [])

  return {
    systemInfo,
    metricsInfo,
    datausageinfo,
    storageinfo,
    loading,
    error,
    refetch,
  }
}
