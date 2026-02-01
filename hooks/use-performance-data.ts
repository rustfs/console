"use client"

import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSystem } from "@/hooks/use-system"

export interface ServerInfo {
  endpoint?: string
  state?: string
  version?: string
  uptime?: number
  drives?: Array<{
    uuid?: string
    drive_path?: string
    usedspace?: number
    totalspace?: number
    availspace?: number
    state?: string
  }>
  network?: Record<string, string>
}

export interface SystemInfo {
  buckets?: { count?: number }
  objects?: { count?: number }
  servers?: ServerInfo[]
  backend?: {
    backendType?: string
    onlineDisks?: number
    offlineDisks?: number
  }
}

export interface DataUsageInfo {
  total_capacity?: number
  total_used_capacity?: number
}

export interface StorageInfo {
  backend?: {
    StandardSCParity?: string
    RRSCParity?: string
  }
}

export interface MetricsInfo {
  aggregated?: {
    scanner?: {
      current_started?: string
      cycle_complete_times?: string[]
    }
  }
}

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

  const refetch = useCallback(async () => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const [sysRes, usageRes, storageRes] = await Promise.all([
        systemApi.getSystemInfo(),
        systemApi.getDataUsageInfo(),
        systemApi.getStorageInfo(),
      ])
      if (!mountedRef.current) return
      setSystemInfo((sysRes as SystemInfo) ?? {})
      setDatausageinfo((usageRes as DataUsageInfo) ?? {})
      setStorageinfo((storageRes as StorageInfo) ?? {})
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
