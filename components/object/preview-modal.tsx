"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RiFullscreenExitLine, RiFullscreenLine } from "@remixicon/react"
import { PdfViewer } from "@/components/object/pdf-viewer"

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

type PreviewMode = "text" | "image" | "pdf" | "sandbox" | "download"

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

function normalizeContentType(contentType: string) {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? ""
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

function getPreviewMode(hasPreviewUrl: boolean, canRenderText: boolean, canRenderImage: boolean): PreviewMode {
  if (!hasPreviewUrl) return "download"
  if (canRenderImage) return "image"
  return canRenderText ? "text" : "sandbox"
}

function isPdfPreview(contentType: string, objectKey: string) {
  const keyLower = objectKey.toLowerCase()
  return contentType === "application/pdf" || keyLower.endsWith(".pdf")
}

export function ObjectPreviewModal({ show, onShowChange, object }: ObjectPreviewModalProps) {
  const { t } = useTranslation()
  const [textContent, setTextContent] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [isFormatted, setIsFormatted] = React.useState(true)
  const [imageNaturalSize, setImageNaturalSize] = React.useState<{ width: number; height: number } | null>(null)
  const [imageFitScale, setImageFitScale] = React.useState(1)
  const [imageLayoutReady, setImageLayoutReady] = React.useState(false)
  const [isImageFullscreen, setIsImageFullscreen] = React.useState(false)
  const imagePreviewRef = React.useRef<HTMLDivElement | null>(null)
  const imageViewportRef = React.useRef<HTMLDivElement | null>(null)
  const imageSizeCacheRef = React.useRef<Record<string, { width: number; height: number }>>({})

  const contentType = object?.ContentType ?? ""
  const previewUrl = object?.SignedUrl ?? ""
  const hasPreviewUrl = Boolean(previewUrl)
  const objectSize = Number(object?.ContentLength ?? 0)
  const objectKey = object?.Key ?? ""
  const objectKeyLower = objectKey.toLowerCase()
  const normalizedContentType = normalizeContentType(contentType)

  const isJson = normalizedContentType === "application/json" || objectKeyLower.endsWith(".json")
  const canRenderText = hasPreviewUrl && isSafeTextPreview(normalizedContentType, objectKey, objectSize)
  const canRenderImage = hasPreviewUrl && isImagePreview(normalizedContentType, objectKey)
  const canRenderPdf = hasPreviewUrl && isPdfPreview(normalizedContentType, objectKey)
  const previewMode = canRenderPdf ? "pdf" : getPreviewMode(hasPreviewUrl, canRenderText, canRenderImage)
  const isImageMode = previewMode === "image"

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
      setLoading(true)
      setIsFormatted(true)
      fetch(previewUrl)
        .then((r) => r.text())
        .then(setTextContent)
        .catch(() => setTextContent(t("Preview unavailable")))
        .finally(() => setLoading(false))
    } else if (!show) {
      setTextContent("")
      setLoading(false)
    }
  }, [show, previewMode, previewUrl, t])

  React.useEffect(() => {
    const cachedSize = previewUrl ? imageSizeCacheRef.current[previewUrl] : undefined
    setImageNaturalSize(cachedSize ?? null)
    setImageFitScale(1)
    setImageLayoutReady(false)
  }, [previewUrl])

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsImageFullscreen(document.fullscreenElement === imagePreviewRef.current)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  React.useEffect(() => {
    if (!show && document.fullscreenElement === imagePreviewRef.current) {
      void document.exitFullscreen().catch(() => {})
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
    const container = imagePreviewRef.current
    if (!container) return

    if (document.fullscreenElement === container) {
      void document.exitFullscreen().catch(() => {})
      return
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {})
      return
    }

    void container.requestFullscreen().catch(() => {})
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

    window.addEventListener("resize", updateImageFitScale)
    return () => {
      window.removeEventListener("resize", updateImageFitScale)
    }
  }, [show, isImageMode, imageNaturalSize, updateImageFitScale])

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
          <div className="relative flex-1 overflow-auto">
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
            className={`relative flex overflow-hidden ${isImageFullscreen ? "h-screen w-screen bg-black" : "flex-1 min-h-0 rounded-md bg-muted/20"}`}
          >
            <div className="absolute end-2 top-2 z-10 flex items-center gap-1 border bg-background/90 p-1 backdrop-blur-xs">
              <Button
                variant="outline"
                size="icon-xs"
                type="button"
                onClick={toggleImageFullscreen}
                aria-label={isImageFullscreen ? t("Exit Fullscreen") : t("Fullscreen")}
                title={isImageFullscreen ? t("Exit Fullscreen") : t("Fullscreen")}
              >
                {isImageFullscreen ? <RiFullscreenExitLine /> : <RiFullscreenLine />}
              </Button>
            </div>
            <div ref={imageViewportRef} className="h-full w-full overflow-auto p-2">
              <div className="flex min-h-full min-w-full items-center justify-center">
                <div
                  className={cn(
                    "shrink-0 flex items-center justify-center transition-opacity",
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
                  <img
                    src={previewUrl}
                    alt={objectKey || t("Preview")}
                    referrerPolicy="no-referrer"
                    className={cn(
                      imageNaturalSize ? "h-full w-full" : "max-h-full max-w-full",
                      "object-contain cursor-zoom-in",
                    )}
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
      case "sandbox":
        return (
          <iframe src={previewUrl} className="h-[70vh] w-full" frameBorder={0} title="Sandbox preview" sandbox="" />
        )
      case "pdf":
        return <PdfViewer url={previewUrl} />
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
        className={cn("z-[1000] max-h-[85vh] sm:max-w-4xl", isImageMode ? "overflow-hidden" : "overflow-auto")}
      >
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between me-6">{t("Preview")}</DialogTitle>
        </DialogHeader>
        <div
          className={cn(
            "min-h-[300px] rounded-md border p-4",
            isImageMode ? "flex max-h-[70vh] flex-col overflow-hidden" : "flex flex-col",
          )}
        >
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
