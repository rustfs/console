"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"

const SAFE_TEXT_MIMES = ["application/json", "application/xml", "text/plain", "text/xml", "text/csv", "text/markdown"]
const SAFE_TEXT_EXTENSIONS = [".txt", ".json", ".xml", ".csv", ".md", ".yml", ".yaml"]
const ALLOWED_SIZE = 1024 * 1024 * 2 // 2MB

type PreviewMode = "text" | "sandbox" | "download"

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

function getPreviewMode(hasPreviewUrl: boolean, canRenderText: boolean): PreviewMode {
  if (!hasPreviewUrl) return "download"
  return canRenderText ? "text" : "sandbox"
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
  const normalizedContentType = normalizeContentType(contentType)

  const isJson = normalizedContentType === "application/json" || objectKeyLower.endsWith(".json")
  const canRenderText = hasPreviewUrl && isSafeTextPreview(normalizedContentType, objectKey, objectSize)
  const previewMode = getPreviewMode(hasPreviewUrl, canRenderText)

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

  const renderPreview = () => {
    if (loading) {
      return <Spinner className="mx-auto size-8 text-muted-foreground" />
    }

    switch (previewMode) {
      case "text":
        return (
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
        )
      case "sandbox":
        return (
          <iframe src={previewUrl} className="h-[70vh] w-full" frameBorder={0} title="Sandbox preview" sandbox="" />
        )
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
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-auto z-[1000]">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between me-6">{t("Preview")}</DialogTitle>
        </DialogHeader>
        <div className="min-h-[300px] rounded-md border p-4 flex flex-col">{renderPreview()}</div>
      </DialogContent>
    </Dialog>
  )
}
