"use client"

import { useEffect, useState } from "react"
import { readObjectPreviewText, type ObjectPreviewMode } from "@/lib/object-preview"

interface PreviewTextOptions {
  show: boolean
  mode: ObjectPreviewMode
  url: string
}

interface PreviewTextResult {
  url: string
  mode: ObjectPreviewMode
  status: "ready" | "unsupported" | "error"
  content: string
}

export function useObjectPreviewText({ show, mode, url }: PreviewTextOptions) {
  const [result, setResult] = useState<PreviewTextResult | null>(null)
  const shouldLoad = show && Boolean(url) && (mode === "text" || mode === "detect-text")

  useEffect(() => {
    setResult(null)
    if (!shouldLoad) return

    const controller = new AbortController()
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return mode === "detect-text" ? readObjectPreviewText(response) : response.text()
      })
      .then((content) => {
        if (controller.signal.aborted) return
        setResult({ url, mode, status: content === null ? "unsupported" : "ready", content: content ?? "" })
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ url, mode, status: "error", content: "" })
      })

    return () => controller.abort()
  }, [shouldLoad, mode, url])

  if (!shouldLoad) return { status: "idle" as const, content: "" }
  if (result?.url !== url || result.mode !== mode) return { status: "loading" as const, content: "" }
  return { status: result.status, content: result.content }
}
