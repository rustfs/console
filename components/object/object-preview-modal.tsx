"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

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
const TEXT_EXTENSIONS = [
  ".txt",
  ".json",
  ".xml",
  ".js",
  ".ts",
  ".css",
  ".md",
  ".html",
  ".csv",
  ".yml",
  ".yaml",
]
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

export function ObjectPreviewModal({
  show,
  onShowChange,
  object,
}: ObjectPreviewModalProps) {
  const { t } = useTranslation()
  const [textContent, setTextContent] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const contentType = object?.ContentType ?? ""
  const previewUrl = object?.SignedUrl ?? ""
  const objectSize = Number(object?.ContentLength ?? 0)
  const objectKey = object?.Key ?? ""

  const isImage = contentType.startsWith("image/")
  const isVideo = contentType.startsWith("video/")
  const isAudio = contentType.startsWith("audio/")
  const isPdf =
    contentType === "application/pdf" || objectKey.toLowerCase().endsWith(".pdf")
  const isText =
    objectSize <= ALLOWED_SIZE &&
    (TEXT_MIMES.some((m) => contentType.startsWith(m)) ||
      TEXT_EXTENSIONS.some((ext) =>
        objectKey.toLowerCase().endsWith(ext)
      ))

  React.useEffect(() => {
    if (show && isText && previewUrl) {
      setLoading(true)
      fetch(previewUrl)
        .then((r) => r.text())
        .then(setTextContent)
        .catch(() => setTextContent(t("Preview unavailable")))
        .finally(() => setLoading(false))
    } else if (!show) {
      setTextContent("")
      setLoading(false)
    }
  }, [show, isText, previewUrl, t])

  return (
    <Dialog open={show} onOpenChange={onShowChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-auto z-[1000]">
        <DialogHeader>
          <DialogTitle>{t("Preview")}</DialogTitle>
        </DialogHeader>
        <div className="min-h-[300px] rounded-md border p-4 flex flex-col">
          {loading ? (
            <Spinner className="mx-auto size-8 text-muted-foreground" />
          ) : (
            <>
              {isImage && (
                <div className="flex justify-center">
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="max-h-[60vh]"
                  />
                </div>
              )}
              {isPdf && (
                <iframe
                  src={previewUrl}
                  className="h-[70vh] w-full"
                  frameBorder={0}
                  title="PDF preview"
                />
              )}
              {isText && (
                <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words">
                  {textContent}
                </pre>
              )}
              {isVideo && (
                <video controls className="w-full">
                  <source src={previewUrl} type={contentType} />
                  {t("Your browser does not support the video tag")}
                </video>
              )}
              {isAudio && (
                <audio controls className="w-full">
                  <source src={previewUrl} type={contentType} />
                  {t("Your browser does not support the audio tag")}
                </audio>
              )}
              {!isImage &&
                !isPdf &&
                !isText &&
                !isVideo &&
                !isAudio &&
                object && (
                  <div className="flex flex-1 justify-center items-center text-sm text-muted-foreground">
                    {t("Cannot Preview", {
                      contentType: contentType || "unknown",
                    })}
                  </div>
                )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
