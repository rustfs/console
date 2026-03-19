"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Spinner } from "@/components/ui/spinner"

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLoading(true)
    setLoadError(null)
  }, [url])

  if (!url) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">{t("Preview unavailable")}</div>
    )
  }

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-md bg-muted/20 p-3">
      {loading && !loadError ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      ) : null}
      {loadError ? (
        <div className="flex h-full items-center justify-center p-4 text-sm text-destructive">{loadError}</div>
      ) : (
        <iframe
          key={url}
          src={url}
          title={t("Preview")}
          className="h-full w-full rounded-md border-0 bg-background"
          onLoad={() => {
            setLoading(false)
            setLoadError(null)
          }}
          onError={() => {
            setLoading(false)
            setLoadError(t("Preview unavailable"))
          }}
        >
          <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">{t("Preview unavailable")}</div>
        </iframe>
      )}
      {loading ? (
        <div className="sr-only" aria-live="polite">
          {t("Loading...")}
        </div>
      ) : null}
      <noscript>
        <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">{t("Preview unavailable")}</div>
      </noscript>
    </div>
  )
}
