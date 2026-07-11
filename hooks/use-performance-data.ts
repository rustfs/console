"use client"

import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import { useSystem } from "@/hooks/use-system"
import {
  normalizeDataUsageInfo,
  normalizeMetricsInfo,
  normalizeStorageInfo,
  normalizeSystemInfo,
  type DataUsageInfo,
  type MetricsInfo,
  type StorageInfo,
  type SystemInfo,
} from "@/lib/performance-data"

export type { DataUsageInfo, MetricsInfo, ServerInfo, StorageInfo, SystemInfo } from "@/lib/performance-data"

export type PerformanceDataSource = "system" | "usage" | "storage" | "metrics"
export type PerformanceSourceErrors = Partial<Record<PerformanceDataSource, string>>

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function hasSystemSnapshot(value: SystemInfo) {
  return Boolean(value.buckets || value.objects || value.servers || value.backend)
}

function hasUsageSnapshot(value: DataUsageInfo) {
  return value.total_capacity !== undefined || value.total_used_capacity !== undefined
}

function hasStorageSnapshot(value: StorageInfo) {
  return Boolean(value.backend && Object.values(value.backend).some((item) => item !== undefined))
}

function hasMetricsSnapshot(value: MetricsInfo) {
  return value.aggregated?.scanner !== undefined
}

export function usePerformanceData() {
  const { getSystemInfo, getDataUsageInfo, getStorageInfo, getSystemMetrics } = useSystem()

  const [metricsInfo, setMetricsInfo] = useState<MetricsInfo>({})
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({})
  const [datausageinfo, setDatausageinfo] = useState<DataUsageInfo>({})
  const [storageinfo, setStorageinfo] = useState<StorageInfo>({})
  const [hasLoaded, setHasLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceErrors, setSourceErrors] = useState<PerformanceSourceErrors>({})
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [metricsUpdatedAt, setMetricsUpdatedAt] = useState<Date | null>(null)
  const mountedRef = React.useRef(false)
  const refetchingRef = React.useRef(false)
  const requestVersionRef = React.useRef(0)
  const hasSystemDataRef = React.useRef(false)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  const refetch = useCallback(async () => {
    if (!mountedRef.current || refetchingRef.current) return
    const requestVersion = ++requestVersionRef.current
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15_000)
    abortControllerRef.current = controller
    refetchingRef.current = true
    setRefreshing(true)
    try {
      const [systemResult, usageResult, storageResult, metricsResult] = await Promise.allSettled([
        getSystemInfo(controller.signal),
        getDataUsageInfo(controller.signal),
        getStorageInfo(controller.signal),
        getSystemMetrics(controller.signal),
      ])
      if (!mountedRef.current || requestVersion !== requestVersionRef.current) return

      const nextSourceErrors: PerformanceSourceErrors = {}
      let systemRefreshed = false
      let optionalSourceRefreshed = false

      if (systemResult.status === "fulfilled") {
        const normalized = normalizeSystemInfo(systemResult.value)
        if (hasSystemSnapshot(normalized)) {
          setSystemInfo(normalized)
          hasSystemDataRef.current = true
          systemRefreshed = true
        } else {
          nextSourceErrors.system = "Get Data Failed"
        }
      } else {
        nextSourceErrors.system = getErrorMessage(systemResult.reason, "Get Data Failed")
      }

      if (usageResult.status === "fulfilled" && usageResult.value !== undefined) {
        const normalized = normalizeDataUsageInfo(usageResult.value)
        if (hasUsageSnapshot(normalized)) {
          setDatausageinfo(normalized)
          optionalSourceRefreshed = true
        } else {
          nextSourceErrors.usage = "Get Data Failed"
        }
      } else {
        nextSourceErrors.usage =
          usageResult.status === "rejected"
            ? getErrorMessage(usageResult.reason, "Get Data Failed")
            : "Storage usage is unavailable for this account."
      }

      if (storageResult.status === "fulfilled") {
        const normalized = normalizeStorageInfo(storageResult.value)
        if (hasStorageSnapshot(normalized)) {
          setStorageinfo(normalized)
          optionalSourceRefreshed = true
        } else {
          nextSourceErrors.storage = "Get Data Failed"
        }
      } else {
        nextSourceErrors.storage = getErrorMessage(storageResult.reason, "Get Data Failed")
      }

      if (metricsResult.status === "fulfilled") {
        const normalized = normalizeMetricsInfo(metricsResult.value)
        if (hasMetricsSnapshot(normalized)) {
          setMetricsInfo(normalized)
          setMetricsUpdatedAt(new Date())
          optionalSourceRefreshed = true
        } else {
          nextSourceErrors.metrics = "Get Data Failed"
        }
      } else {
        nextSourceErrors.metrics = getErrorMessage(metricsResult.reason, "Get Data Failed")
      }

      setSourceErrors(nextSourceErrors)
      setError(
        !hasSystemDataRef.current && !systemRefreshed && !optionalSourceRefreshed
          ? "Unable to load cluster status. Check your connection and refresh."
          : null,
      )
      if (systemRefreshed) setLastUpdatedAt(new Date())
    } finally {
      window.clearTimeout(timeout)
      if (abortControllerRef.current === controller) abortControllerRef.current = null
      if (requestVersion === requestVersionRef.current) {
        refetchingRef.current = false
        if (mountedRef.current) {
          setHasLoaded(true)
          setRefreshing(false)
        }
      }
    }
  }, [getDataUsageInfo, getStorageInfo, getSystemInfo, getSystemMetrics])

  useEffect(() => {
    mountedRef.current = true
    hasSystemDataRef.current = false
    setSystemInfo({})
    setMetricsInfo({})
    setDatausageinfo({})
    setStorageinfo({})
    setHasLoaded(false)
    setRefreshing(true)
    setError(null)
    setSourceErrors({})
    setLastUpdatedAt(null)
    setMetricsUpdatedAt(null)
    void refetch()

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refetch()
    }, 60_000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refetch()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      mountedRef.current = false
      requestVersionRef.current += 1
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      refetchingRef.current = false
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [refetch])

  return {
    systemInfo,
    metricsInfo,
    datausageinfo,
    storageinfo,
    loading: refreshing && !hasLoaded,
    refreshing,
    hasLoaded,
    error,
    sourceErrors,
    lastUpdatedAt,
    metricsUpdatedAt,
    refetch,
  }
}
