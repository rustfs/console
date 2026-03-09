"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Document, Page, pdfjs } from "react-pdf"
import { Spinner } from "@/components/ui/spinner"

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()

interface PdfViewerProps {
  url: string
}

export function PdfViewer({ url }: PdfViewerProps) {
  const { t } = useTranslation()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [numPages, setNumPages] = React.useState(0)
  const [containerWidth, setContainerWidth] = React.useState(0)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setNumPages(0)
    setLoadError(null)
  }, [url])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.floor(entry.contentRect.width))
      }
    })

    observer.observe(container)
    setContainerWidth(Math.floor(container.getBoundingClientRect().width))

    return () => {
      observer.disconnect()
    }
  }, [])

  if (!url) {
    return (
      <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">{t("Preview unavailable")}</div>
    )
  }

  const pageWidth = containerWidth > 0 ? Math.max(Math.min(containerWidth - 24, 960), 240) : 800

  return (
    <div ref={containerRef} className="h-[70vh] w-full overflow-auto rounded-md bg-muted/20 p-3">
      <Document
        file={url}
        loading={
          <div className="flex h-[50vh] items-center justify-center">
            <Spinner className="size-8 text-muted-foreground" />
          </div>
        }
        error={<div className="p-4 text-sm text-destructive">{loadError ?? t("Preview unavailable")}</div>}
        onLoadSuccess={({ numPages: pages }) => {
          setNumPages(pages)
        }}
        onLoadError={() => {
          setLoadError(t("Preview unavailable"))
        }}
      >
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-3">
          {Array.from({ length: numPages }, (_, index) => (
            <div key={index + 1} className="overflow-hidden rounded-md border bg-background shadow-sm">
              <Page pageNumber={index + 1} width={pageWidth} loading={null} renderTextLayer renderAnnotationLayer />
            </div>
          ))}
        </div>
      </Document>
    </div>
  )
}
