"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { BucketSettingRow } from "@/components/buckets/settings-layout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaProcessing } from "@/hooks/use-media-processing"
import { usePermissions } from "@/hooks/use-permissions"
import { getMediaProcessingErrorKind, isMediaProcessingRouteMissing } from "@/lib/media-processing"
import type { MediaCapabilities, MediaProcessingGetResponse } from "@/types/media-processing"

import { MediaProcessingDialog } from "./dialog"

/**
 * Summarises the bucket's media processing on the bucket settings page.
 *
 * The row hides itself when the user cannot read the setting or the server has
 * no such route, so a bucket page never shows a feature the operator cannot
 * actually use.
 */
export function MediaProcessingSettingsRow({ bucketName }: { bucketName: string }) {
  const { t } = useTranslation()
  const { getConfig, getCapabilities } = useMediaProcessing()
  const { canCapability, hasFetchedPolicy, hasResolvedAdmin, isAdmin, isLoading } = usePermissions()
  const [config, setConfig] = React.useState<MediaProcessingGetResponse | null>(null)
  const [capabilities, setCapabilities] = React.useState<MediaCapabilities | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [hidden, setHidden] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const requestVersionRef = React.useRef(0)

  const permissionsReady = hasResolvedAdmin && (isAdmin || hasFetchedPolicy) && !isLoading
  const canView = canCapability("bucket.mediaProcessing.view")

  const load = React.useCallback(async () => {
    if (!permissionsReady || !canView) {
      if (permissionsReady) {
        setHidden(true)
        setLoading(false)
      }
      return
    }
    const version = ++requestVersionRef.current
    setLoading(true)
    try {
      // Capabilities first: they do not change with the profile, and a bucket
      // with no profile still needs them to explain why nothing happens.
      const nextCapabilities = await getCapabilities(bucketName)
      if (version !== requestVersionRef.current) return
      setCapabilities(nextCapabilities)

      const nextConfig = await getConfig(bucketName)
      if (version !== requestVersionRef.current) return
      setConfig(nextConfig)
      setHidden(false)
      setLoadError("")
    } catch (error) {
      if (version !== requestVersionRef.current) return
      if (isMediaProcessingRouteMissing(error) || getMediaProcessingErrorKind(error) === "access_denied") {
        setHidden(true)
        setLoadError("")
      } else if (getMediaProcessingErrorKind(error) === "configuration_missing") {
        // No profile is a normal, actionable state, not a failure.
        setConfig(null)
        setHidden(false)
        setLoadError("")
      } else {
        setHidden(false)
        setLoadError(error instanceof Error ? error.message : String(error))
      }
    } finally {
      if (version === requestVersionRef.current) setLoading(false)
    }
  }, [bucketName, canView, getCapabilities, getConfig, permissionsReady])

  React.useEffect(() => {
    void load()
    return () => {
      requestVersionRef.current += 1
    }
  }, [load])

  if (hidden) return null

  if (!permissionsReady || loading) {
    return (
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-full max-w-md" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    )
  }

  // The toolchain check comes first: without a working ffmpeg nothing is
  // derived no matter how the profile is configured, and that is the more
  // useful thing to say.
  const state = loadError
    ? { label: t("Unavailable"), variant: "destructive" as const }
    : !capabilities?.available
      ? { label: t("Server has no ffmpeg"), variant: "destructive" as const }
      : !config
        ? { label: t("Not configured"), variant: "outline" as const }
        : !config.config.enabled
          ? { label: t("Paused"), variant: "outline" as const }
          : !capabilities.running
            ? { label: t("Worker pool stopped"), variant: "destructive" as const }
            : { label: t("Active"), variant: "secondary" as const }

  return (
    <>
      <BucketSettingRow
        title={t("Media processing")}
        description={t("Derive thumbnails, resolution ladders and browser-playable video from stored objects.")}
        status={state.label}
        statusVariant={state.variant}
        action={
          <Button variant="outline" size="sm" className="min-h-11 sm:min-h-0" onClick={() => setDialogOpen(true)}>
            {config ? t("Manage renditions") : t("Set up renditions")}
          </Button>
        }
        error={loadError || undefined}
        errorTitle={t("Unable to load this setting")}
        retryLabel={t("Retry")}
        onRetry={load}
      />
      <MediaProcessingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bucketName={bucketName}
        initialConfig={config}
        capabilities={capabilities}
        onSaved={load}
      />
    </>
  )
}
