"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RiCloseLine, RiFullscreenExitLine, RiFullscreenLine } from "@remixicon/react"
import { PdfViewer } from "@/components/object/pdf-viewer"
import { ParquetViewer } from "@/components/object/parquet-viewer"
import { TiffViewer } from "@/components/object/tiff-viewer"
import { getObjectPreviewMode, normalizePreviewContentType } from "@/lib/object-preview"
import Image from "next/image"

const SAFE_TEXT_MIMES = [
  "application/json",
  "application/jsonl",
  "application/ndjson",
  "application/x-ndjson",
  "application/xml",
  "text/plain",
  "text/xml",
  "text/csv",
  "text/markdown",
]
const SAFE_TEXT_EXTENSIONS = [".txt", ".json", ".jsonl", ".ndjson", ".xml", ".csv", ".md", ".yml", ".yaml"]
const SAFE_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".tif", ".tiff"]
const ALLOWED_SIZE = 1024 * 1024 * 2 // 2MB

const PARQUET_MIMES = ["application/vnd.apache.parquet", "application/x-parquet", "application/parquet"]
const PARQUET_EXTENSIONS = [".parquet", ".pq"]

interface ObjectPreviewModalProps {
  show: boolean
  onShowChange: (show: boolean) => void
  object: {
    ContentType?: string
    ContentLength?: number
    Key?: string
    SignedUrl?: string
  } | null
}

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void
  webkitFullscreenElement?: Element | null
}

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

function isSafeTextPreview(contentType: string, objectKey: string, objectSize: number) {
  if (objectSize > ALLOWED_SIZE) return false
  if (SAFE_TEXT_MIMES.includes(contentType)) return true
  const keyLower = objectKey.toLowerCase()
  return SAFE_TEXT_EXTENSIONS.some((ext) => keyLower.endsWith(ext))
}

function isImagePreview(contentType: string, objectKey: string) {
  const keyLower = objectKey.toLowerCase()
  const isSvg = contentType === "image/svg+xml" || keyLower.endsWith(".svg")
  if (isSvg) return false
  if (contentType.startsWith("image/")) return true
  return SAFE_IMAGE_EXTENSIONS.some((ext) => keyLower.endsWith(ext))
}

function isPdfPreview(contentType: string) {
  return contentType === "application/pdf"
}

function isParquetPreview(contentType: string, objectKey: string) {
  const keyLower = objectKey.toLowerCase()
  if (PARQUET_MIMES.includes(contentType)) return true
  return PARQUET_EXTENSIONS.some((ext) => keyLower.endsWith(ext))
}

function isTiffPreview(objectKey: string) {
  const keyLower = objectKey.toLowerCase()
  return keyLower.endsWith(".tif") || keyLower.endsWith(".tiff")
}

function getFullscreenElement(doc: FullscreenDocument): Element | null {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null
}

function exitFullscreen(doc: FullscreenDocument): Promise<void> {
  if (typeof doc.exitFullscreen === "function") {
    return Promise.resolve(doc.exitFullscreen()).then(() => undefined)
  }

  if (typeof doc.webkitExitFullscreen === "function") {
    return Promise.resolve(doc.webkitExitFullscreen()).then(() => undefined)
  }

  return Promise.resolve()
}

function requestFullscreen(element: FullscreenElement): Promise<void> {
  if (typeof element.requestFullscreen === "function") {
    return Promise.resolve(element.requestFullscreen()).then(() => undefined)
  }

  if (typeof element.webkitRequestFullscreen === "function") {
    return Promise.resolve(element.webkitRequestFullscreen()).then(() => undefined)
  }

  return Promise.resolve()
}

export function ObjectPreviewModal({ show, onShowChange, object }: ObjectPreviewModalProps) {
  const { t } = useTranslation()
  const [textContent, setTextContent] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [audioLoadError, setAudioLoadError] = React.useState(false)
  const [isFormatted, setIsFormatted] = React.useState(true)
  const [imageNaturalSize, setImageNaturalSize] = React.useState<{ width: number; height: number } | null>(null)
  const [imageFitScale, setImageFitScale] = React.useState(1)
  const [imageLayoutReady, setImageLayoutReady] = React.useState(false)
  const [isImageFullscreen, setIsImageFullscreen] = React.useState(false)
  const [isDialogExpanded, setIsDialogExpanded] = React.useState(false)
  const imagePreviewRef = React.useRef<HTMLDivElement | null>(null)
  const imageViewportRef = React.useRef<HTMLDivElement | null>(null)
  const imageSizeCacheRef = React.useRef<Record<string, { width: number; height: number }>>({})

  const contentType = object?.ContentType ?? ""
  const previewUrl = object?.SignedUrl ?? ""
  const hasPreviewUrl = Boolean(previewUrl)
  const objectSize = Number(object?.ContentLength ?? 0)
  const objectKey = object?.Key ?? ""
  const objectKeyLower = objectKey.toLowerCase()
  const normalizedContentType = normalizePreviewContentType(contentType)

  const isJson = normalizedContentType === "application/json" || objectKeyLower.endsWith(".json")
  const canRenderText = hasPreviewUrl && isSafeTextPreview(normalizedContentType, objectKey, objectSize)
  const canRenderImage = hasPreviewUrl && isImagePreview(normalizedContentType, objectKey)
  const canRenderPdf = hasPreviewUrl && isPdfPreview(normalizedContentType)
  const canRenderParquet = hasPreviewUrl && isParquetPreview(normalizedContentType, objectKey)
  const canRenderTiff = hasPreviewUrl && isTiffPreview(objectKey)
  const previewMode = getObjectPreviewMode({
    hasPreviewUrl,
    contentType,
    canRenderText,
    canRenderImage,
    canRenderPdf,
    canRenderParquet,
    canRenderTiff,
  })
  const isImageMode = previewMode === "image"
  const isCompactPreview = previewMode === "audio" || previewMode === "download"

  const getFormattedContent = () => {
    if (!isJson || !isFormatted) return textContent
    try {
      const parsed = JSON.parse(textContent)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return textContent
    }
  }

  React.useEffect(() => {
    if (show && previewMode === "text" && previewUrl) {
      const controller = new AbortController()
      setLoading(true)
      setIsFormatted(true)
      setTextContent("")
      fetch(previewUrl, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          return response.text()
        })
        .then(setTextContent)
        .catch((error: unknown) => {
          if ((error as Error)?.name !== "AbortError") setTextContent(t("Preview unavailable"))
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })

      return () => controller.abort()
    } else if (!show) {
      setTextContent("")
      setLoading(false)
    }
  }, [show, previewMode, previewUrl, t])

  React.useEffect(() => {
    setAudioLoadError(false)
  }, [show, previewUrl])

  React.useEffect(() => {
    if (!show) setIsDialogExpanded(false)
  }, [show])

  React.useEffect(() => {
    const cachedSize = previewUrl ? imageSizeCacheRef.current[previewUrl] : undefined
    setImageNaturalSize(cachedSize ?? null)
    setImageFitScale(1)
    setImageLayoutReady(false)
  }, [previewUrl])

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsImageFullscreen(getFullscreenElement(document as FullscreenDocument) === imagePreviewRef.current)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  React.useEffect(() => {
    const fullscreenDocument = document as FullscreenDocument

    if (!show && getFullscreenElement(fullscreenDocument) === imagePreviewRef.current) {
      void exitFullscreen(fullscreenDocument).catch(() => {})
    }
    if (!show) {
      setIsImageFullscreen(false)
    }
  }, [show])

  const centerImageViewport = React.useCallback(() => {
    const viewport = imageViewportRef.current
    if (!viewport) return

    const left = Math.max((viewport.scrollWidth - viewport.clientWidth) / 2, 0)
    const top = Math.max((viewport.scrollHeight - viewport.clientHeight) / 2, 0)
    viewport.scrollTo({ left, top })
  }, [])

  const updateImageFitScale = React.useCallback(() => {
    if (!imageNaturalSize) return
    const viewport = imageViewportRef.current
    if (!viewport) return

    const widthScale = viewport.clientWidth / imageNaturalSize.width
    setImageFitScale(Math.min(widthScale, 1))
    setImageLayoutReady(true)
  }, [imageNaturalSize])

  const toggleImageFullscreen = React.useCallback(() => {
    const fullscreenDocument = document as FullscreenDocument
    const container = imagePreviewRef.current as FullscreenElement | null
    if (!container) return

    if (getFullscreenElement(fullscreenDocument) === container) {
      void exitFullscreen(fullscreenDocument).catch(() => {})
      return
    }

    if (getFullscreenElement(fullscreenDocument)) {
      void exitFullscreen(fullscreenDocument).catch(() => {})
      return
    }

    void requestFullscreen(container).catch(() => {})
  }, [])

  React.useLayoutEffect(() => {
    if (!show || !isImageMode || !imageNaturalSize) return
    updateImageFitScale()
  }, [show, isImageMode, isImageFullscreen, imageNaturalSize, updateImageFitScale])

  React.useLayoutEffect(() => {
    if (!show || !isImageMode || !imageNaturalSize) return
    centerImageViewport()
  }, [show, isImageMode, isImageFullscreen, imageNaturalSize, imageFitScale, centerImageViewport])

  React.useEffect(() => {
    if (!show || !isImageMode || !imageNaturalSize) return

    const imageViewport = imageViewportRef.current
    if (!imageViewport || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateImageFitScale)
      return () => {
        window.removeEventListener("resize", updateImageFitScale)
      }
    }

    const resizeObserver = new ResizeObserver(() => {
      updateImageFitScale()
      centerImageViewport()
    })
    resizeObserver.observe(imageViewport)
    return () => resizeObserver.disconnect()
  }, [show, isImageMode, imageNaturalSize, updateImageFitScale, centerImageViewport])

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      )
    }

    switch (previewMode) {
      case "text":
        return (
          <div
            className="relative min-h-0 flex-1 overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
            role="region"
            tabIndex={0}
            aria-label={objectKey || t("Preview")}
          >
            <pre className="whitespace-pre-wrap break-words pe-16">{getFormattedContent()}</pre>
            <div className="absolute end-0 top-0">
              {isJson && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setIsFormatted(!isFormatted)}>
                    {isFormatted ? t("Raw") : t("Formatted")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      case "image":
        return (
          <div
            ref={imagePreviewRef}
            className={cn(
              "relative flex overflow-hidden",
              isImageFullscreen ? "h-screen w-screen bg-black" : "min-h-0 flex-1 bg-muted/20",
            )}
          >
            <div className="absolute end-2 top-2 z-10 flex items-center gap-1 border bg-background/90 p-1 backdrop-blur-xs">
              <Button
                variant="outline"
                size="icon-xs"
                type="button"
                className="size-11 [@media(hover:hover)_and_(pointer:fine)]:size-6"
                onClick={toggleImageFullscreen}
                aria-label={isImageFullscreen ? t("Exit Fullscreen") : t("Fullscreen")}
                title={isImageFullscreen ? t("Exit Fullscreen") : t("Fullscreen")}
              >
                {isImageFullscreen ? <RiFullscreenExitLine aria-hidden /> : <RiFullscreenLine aria-hidden />}
              </Button>
            </div>
            <div
              ref={imageViewportRef}
              className="h-full w-full overflow-auto overscroll-contain p-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
              role="region"
              tabIndex={0}
              aria-label={objectKey || t("Preview")}
              dir="ltr"
            >
              <div className="flex min-h-full min-w-full items-center justify-center">
                <div
                  className={cn(
                    "relative flex shrink-0 items-center justify-center transition-opacity",
                    imageLayoutReady ? "opacity-100" : "opacity-0",
                  )}
                  style={
                    imageNaturalSize
                      ? {
                          width: `${imageNaturalSize.width * imageFitScale}px`,
                          height: `${imageNaturalSize.height * imageFitScale}px`,
                        }
                      : { width: "100%", height: "100%" }
                  }
                >
                  <Image
                    src={previewUrl}
                    alt={objectKey || t("Preview")}
                    fill
                    sizes="100vw"
                    unoptimized
                    referrerPolicy="no-referrer"
                    className="cursor-zoom-in object-contain"
                    onLoad={(event) => {
                      const nextSize = {
                        width: event.currentTarget.naturalWidth || event.currentTarget.clientWidth,
                        height: event.currentTarget.naturalHeight || event.currentTarget.clientHeight,
                      }
                      if (previewUrl) {
                        imageSizeCacheRef.current[previewUrl] = nextSize
                      }
                      setImageNaturalSize((prev) => {
                        if (prev && prev.width === nextSize.width && prev.height === nextSize.height) {
                          return prev
                        }
                        return nextSize
                      })
                    }}
                    onClick={() => {
                      if (!isImageFullscreen) {
                        toggleImageFullscreen()
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      case "audio":
        return audioLoadError ? (
          <div className="my-auto text-center text-sm text-destructive" role="alert">
            {t("Preview unavailable")}
          </div>
        ) : (
          <audio
            controls
            src={previewUrl}
            className="my-auto w-full"
            aria-label={objectKey || t("Preview")}
            onError={() => setAudioLoadError(true)}
          />
        )
      case "sandbox":
        return (
          <iframe src={previewUrl} className="min-h-0 w-full flex-1" frameBorder={0} title={t("Preview")} sandbox="" />
        )
      case "pdf":
        return <PdfViewer url={previewUrl} />
      case "parquet":
        return <ParquetViewer url={previewUrl} sizeBytes={objectSize} />
      case "tiff":
        return <TiffViewer url={previewUrl} objectKey={objectKey} />
      case "download":
      default:
        return (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
            {t("Cannot Preview", {
              contentType: contentType || "unknown",
            })}
          </div>
        )
    }
  }

  return (
    <Dialog open={show} onOpenChange={onShowChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "start-[var(--preview-dialog-inline-start)] top-[var(--preview-dialog-block-start)] h-[var(--preview-dialog-height)] w-[var(--preview-dialog-width)] max-h-[calc(100dvh_-_var(--preview-dialog-block-start)_-_1rem)] max-w-[calc(100vw_-_var(--preview-dialog-inline-start)_-_1rem)] translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rtl:translate-x-0 sm:max-w-[calc(100vw_-_var(--preview-dialog-inline-start)_-_1rem)] sm:min-h-[min(20rem,calc(100dvh-var(--preview-dialog-block-start)-1rem))] sm:min-w-[min(32rem,calc(100vw-2rem))] resize-none [@media(min-width:40rem)_and_(hover:hover)_and_(pointer:fine)]:resize",
          isDialogExpanded &&
            "!start-4 !top-4 !h-[calc(100dvh-2rem)] !max-h-[calc(100dvh-2rem)] !w-[calc(100vw-2rem)] !max-w-[calc(100vw-2rem)] !resize-none",
        )}
        style={
          {
            "--preview-dialog-width": "min(56rem, calc(100vw - 2rem))",
            "--preview-dialog-height": isCompactPreview ? "min(24rem, calc(100dvh - 2rem))" : "min(85dvh, 48rem)",
            "--preview-dialog-inline-start": "max(1rem, calc((100vw - var(--preview-dialog-width)) / 2))",
            "--preview-dialog-block-start": "max(1rem, calc((100dvh - var(--preview-dialog-height)) / 2))",
          } as React.CSSProperties
        }
      >
        <DialogHeader className="flex-row items-start justify-between gap-2 pe-12 [@media(hover:hover)_and_(pointer:fine)]:pe-8">
          <DialogTitle>{t("Preview")}</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-11 shrink-0 [@media(hover:hover)_and_(pointer:fine)]:size-7"
            aria-label={isDialogExpanded ? t("Collapse") : t("Expand")}
            title={isDialogExpanded ? t("Collapse") : t("Expand")}
            onClick={() => setIsDialogExpanded((expanded) => !expanded)}
          >
            {isDialogExpanded ? <RiFullscreenExitLine aria-hidden /> : <RiFullscreenLine aria-hidden />}
          </Button>
        </DialogHeader>
        <DialogClose
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute end-2 top-2 size-11 [@media(hover:hover)_and_(pointer:fine)]:size-7"
              aria-label={t("Close")}
              title={t("Close")}
            />
          }
        >
          <RiCloseLine aria-hidden />
        </DialogClose>
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden border p-4">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  )
}
