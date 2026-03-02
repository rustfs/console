"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"

const TEXT_MIMES = [
  "application/json",
  "application/xml",
  "application/javascript",
  "text/plain",
  "text/html",
  "text/css",
  "text/csv",
  "text/markdown",
]
const TEXT_EXTENSIONS = [".txt", ".json", ".xml", ".js", ".ts", ".css", ".md", ".html", ".csv", ".yml", ".yaml"]
const DIRECT_IMAGE_MIMES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]
const DIRECT_VIDEO_MIMES = ["video/mp4", "video/webm", "video/ogg"]
const DIRECT_AUDIO_MIMES = ["audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/ogg", "audio/webm"]
const DOWNLOAD_ONLY_MIMES = ["", "application/octet-stream"]
const DOWNLOAD_ONLY_EXTENSIONS = [".zip", ".7z", ".rar", ".gz", ".tar", ".tgz", ".bz2", ".xz", ".exe", ".dmg", ".iso"]
const ALLOWED_SIZE = 1024 * 1024 * 2 // 2MB

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

export function ObjectPreviewModal({ show, onShowChange, object }: ObjectPreviewModalProps) {
  const { t } = useTranslation()
  const [textContent, setTextContent] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [isFormatted, setIsFormatted] = React.useState(true)

  const contentType = object?.ContentType ?? ""
  const previewUrl = object?.SignedUrl ?? ""
  const hasPreviewUrl = Boolean(previewUrl)
  const objectSize = Number(object?.ContentLength ?? 0)
  const objectKey = object?.Key ?? ""
  const objectKeyLower = objectKey.toLowerCase()
  const normalizedContentType = contentType.split(";")[0]?.trim().toLowerCase() ?? ""

  const isDirectImage = DIRECT_IMAGE_MIMES.includes(normalizedContentType)
  const isDirectVideo = DIRECT_VIDEO_MIMES.includes(normalizedContentType)
  const isDirectAudio = DIRECT_AUDIO_MIMES.includes(normalizedContentType)
  const isDirectMedia = isDirectImage || isDirectVideo || isDirectAudio
  const isJson = normalizedContentType === "application/json" || objectKeyLower.endsWith(".json")
  const isText =
    objectSize <= ALLOWED_SIZE &&
    (TEXT_MIMES.some((m) => normalizedContentType === m) || TEXT_EXTENSIONS.some((ext) => objectKeyLower.endsWith(ext)))
  const isDownloadOnly =
    !hasPreviewUrl ||
    DOWNLOAD_ONLY_MIMES.includes(normalizedContentType) ||
    DOWNLOAD_ONLY_EXTENSIONS.some((ext) => objectKeyLower.endsWith(ext))
  const canRenderText = isText && hasPreviewUrl
  const canRenderDirectMedia = isDirectMedia && hasPreviewUrl
  const isIframePreview = hasPreviewUrl && !isText && !isDirectMedia && !isDownloadOnly
  const showDownloadOnly = !canRenderText && !canRenderDirectMedia && !isIframePreview && isDownloadOnly
  const filename = objectKey.split("/").pop() ?? ""

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
    if (show && canRenderText && previewUrl) {
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
  }, [show, canRenderText, previewUrl, t])

  return (
    <Dialog open={show} onOpenChange={onShowChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-auto z-[1000]">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between me-6">{t("Preview")}</DialogTitle>
        </DialogHeader>
        <div className="min-h-[300px] rounded-md border p-4 flex flex-col">
          {loading ? (
            <Spinner className="mx-auto size-8 text-muted-foreground" />
          ) : (
            <>
              {canRenderText && (
                <pre className="max-h-[70vh] relative overflow-auto whitespace-pre-wrap break-words">
                  {getFormattedContent()}
                  <div className="absolute end-0 top-0">
                    {isJson && (
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => setIsFormatted(!isFormatted)}>
                          {isFormatted ? t("Raw") : t("Formatted")}
                        </Button>
                      </div>
                    )}
                  </div>
                </pre>
              )}
              {canRenderDirectMedia && isDirectImage && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="preview" className="max-h-[60vh]" />
                </div>
              )}
              {canRenderDirectMedia && isDirectVideo && (
                <video controls className="w-full">
                  <source src={previewUrl} type={contentType} />
                  {t("Your browser does not support the video tag")}
                </video>
              )}
              {canRenderDirectMedia && isDirectAudio && (
                <audio controls className="w-full">
                  <source src={previewUrl} type={contentType} />
                  {t("Your browser does not support the audio tag")}
                </audio>
              )}
              {isIframePreview && (
                <iframe
                  src={previewUrl}
                  className="h-[70vh] w-full"
                  frameBorder={0}
                  title="Sandbox preview"
                  sandbox=""
                />
              )}
              {showDownloadOnly && object && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
                  {t("Cannot Preview", {
                    contentType: contentType || "unknown",
                  })}
                  {previewUrl && (
                    <Button asChild variant="outline" size="sm">
                      <a href={previewUrl} download={filename}>
                        {t("Download")}
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
