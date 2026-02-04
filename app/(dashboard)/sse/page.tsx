"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { useSSE } from "@/hooks/use-sse"
import { useMessage } from "@/lib/feedback/message"

export default function SSEPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const { getKMSStatus, clearCache, getDetailedStatus, startKMS, stopKMS } = useSSE()

  const [status, setStatus] = useState<{
    status?: string
    healthy?: boolean
    backend_type?: string
    config_summary?: Record<string, unknown>
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshingStatus, setRefreshingStatus] = useState(false)
  const [clearingCache, setClearingCache] = useState(false)
  const [startingKMS, setStartingKMS] = useState(false)
  const [stoppingKMS, setStoppingKMS] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = (await getKMSStatus()) as {
        status?: string
        healthy?: boolean
        backend_type?: string
        config_summary?: Record<string, unknown>
      }
      setStatus(res ?? null)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [getKMSStatus])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const handleRefresh = async () => {
    setRefreshingStatus(true)
    try {
      await loadStatus()
      message.success(t("Status refreshed successfully"))
    } catch {
      message.error(t("Failed to refresh status"))
    } finally {
      setRefreshingStatus(false)
    }
  }

  const handleClearCache = async () => {
    setClearingCache(true)
    try {
      const result = (await clearCache()) as { status?: string; message?: string }
      if (result?.status === "success") {
        message.success(t("Cache cleared successfully"))
      } else {
        message.warning(result?.message || t("Cache clear completed with warnings"))
      }
    } catch {
      message.error(t("Failed to clear cache"))
    } finally {
      setClearingCache(false)
    }
  }

  const handleStartKMS = async () => {
    setStartingKMS(true)
    try {
      const res = (await startKMS()) as { success?: boolean; status?: string; message?: string }
      if (res?.success) {
        message.success(t("KMS service started successfully"))
        await loadStatus()
      } else {
        message.error(t("Failed to start KMS service") + ": " + (res?.message || "Unknown error"))
      }
    } catch {
      message.error(t("Failed to start KMS service"))
    } finally {
      setStartingKMS(false)
    }
  }

  const handleStopKMS = async () => {
    setStoppingKMS(true)
    try {
      const res = (await stopKMS()) as { success?: boolean; status?: string; message?: string }
      if (res?.success) {
        message.success(t("KMS service stopped successfully"))
        await loadStatus()
      } else {
        message.error(t("Failed to stop KMS service") + ": " + (res?.message || "Unknown error"))
      }
    } catch {
      message.error(t("Failed to stop KMS service"))
    } finally {
      setStoppingKMS(false)
    }
  }

  const getKmsStatusText = () => {
    if (!status) return t("Not Configured")
    if (status.status === "Running") {
      return status.healthy ? t("Running") : t("Running (Unhealthy)")
    }
    if (status.status === "Configured") return t("Configured")
    if (status.status === "NotConfigured") return t("Not Configured")
    return t("Unknown")
  }

  const getKmsStatusDescription = () => {
    if (!status) return t("KMS server is not configured")
    if (status.status === "Running") {
      return status.healthy ? t("KMS server is running and healthy") : t("KMS server is running but unhealthy")
    }
    if (status.status === "Configured") return t("KMS server is configured but not running")
    return t("KMS server status unknown")
  }

  const hasConfiguration = status?.status && status.status !== "NotConfigured"

  return (
    <Page>
      <PageHeader
        description={
          <p className="text-gray-600 dark:text-gray-400">
            {t("Configure server-side encryption for your objects using external key management services.")}
          </p>
        }
      >
        <h1 className="text-2xl font-bold">{t("Server-Side Encryption (SSE) Configuration")}</h1>
      </PageHeader>

      <div className="space-y-8">
        <Card className="shadow-none">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-base sm:text-lg">{t("KMS Status Overview")}</CardTitle>
              <Badge variant="secondary" className="text-sm uppercase">
                {loading ? t("Loading...") : getKmsStatusText()}
              </Badge>
            </div>
            <CardDescription>{getKmsStatusDescription()}</CardDescription>
            {status?.backend_type && (
              <CardDescription>
                {t("Backend")}: {status.backend_type}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">{t("Backend Type")}</p>
                <p className="text-sm font-medium text-foreground">{status?.backend_type ?? t("Not configured")}</p>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">{t("Status")}</p>
                <p className="text-sm font-medium text-foreground">{status?.status ?? t("Not configured")}</p>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">{t("Health")}</p>
                <p className="text-sm font-medium text-foreground">{status?.healthy ? t("Healthy") : t("Unhealthy")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button size="sm" variant="outline" disabled={refreshingStatus} onClick={handleRefresh}>
                {t("Refresh")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={status?.status !== "Running"}
                onClick={handleClearCache}
                aria-disabled={clearingCache}
              >
                {t("Clear Cache")}
              </Button>
              {hasConfiguration && (status?.status === "Configured" || status?.status === "Error") && (
                <Button size="sm" variant="default" onClick={handleStartKMS} aria-disabled={startingKMS}>
                  {t("Start KMS")}
                </Button>
              )}
              {hasConfiguration && status?.status === "Running" && (
                <Button size="sm" variant="outline" onClick={handleStopKMS} aria-disabled={stoppingKMS}>
                  {t("Stop KMS")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{t("KMS Configuration")}</CardTitle>
            <CardDescription>{t("Full KMS configuration form - coming soon")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </Page>
  )
}
