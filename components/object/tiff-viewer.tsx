"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Spinner } from "@/components/ui/spinner"

// UTIF types
interface UTIFModule {
  decode: (buffer: ArrayBuffer) => Array<{ width: number; height: number; [key: string]: unknown }>
  decodeImage: (buffer: ArrayBuffer, ifd: { width: number; height: number; [key: string]: unknown }) => void
  toRGBA8: (ifd: { width: number; height: number; [key: string]: unknown }) => Uint8Array
}

interface TiffViewerProps {
  url: string
  objectKey: string
}

interface TiffImageData {
  width: number
  height: number
  rgba: Uint8Array
}

/**
 * TiffViewer — decode TIFF/TIF images client-side and render to Canvas.
 * Uses utif for decoding with dynamic import to avoid bundling for non-TIFF usage.
 * Supports compressed TIFF (LZW, Deflate, PackBits, JPEG).
 *
 * Two-phase rendering: phase 1 decodes the image and stores the result in state
 * (setLoading(false) after decode); phase 2 renders to canvas once the canvas
 * element is mounted to the DOM. This avoids a race condition where the canvas
 * ref is null because the component is still displaying the loading spinner.
 */
export function TiffViewer({ url, objectKey }: TiffViewerProps) {
  const { t } = useTranslation()
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [imageData, setImageData] = React.useState<TiffImageData | null>(null)

  // Phase 1: fetch and decode the TIFF image
  React.useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function decodeTiff() {
      setLoading(true)
      setError("")
      setImageData(null)

      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const buffer = await response.arrayBuffer()

        if (cancelled) return

        const UTIF: UTIFModule = await import("utif")

        const ifds = UTIF.decode(buffer)
        if (!ifds || ifds.length === 0) throw new Error("Invalid TIFF: no IFD found")

        UTIF.decodeImage(buffer, ifds[0])
        const rgba = UTIF.toRGBA8(ifds[0])

        if (cancelled) return

        setImageData({ width: ifds[0].width, height: ifds[0].height, rgba })
        setLoading(false)
      } catch (err: unknown) {
        if (cancelled) return
        const message =
          err instanceof Error && err.name === "AbortError" ? "" : err instanceof Error ? err.message : String(err)
        setError(message || t("Preview unavailable"))
        setLoading(false)
      }
    }

    decodeTiff()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [url, t])

  // Phase 2: render decoded image data to canvas (runs after canvas is in DOM)
  React.useEffect(() => {
    if (loading || !imageData) return

    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = imageData.width
    canvas.height = imageData.height

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const imgData = ctx.createImageData(canvas.width, canvas.height)
    imgData.data.set(imageData.rgba)
    ctx.putImageData(imgData, 0, 0)
  }, [loading, imageData])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">{error}</div>
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-auto">
      <canvas ref={canvasRef} className="max-h-full max-w-full object-contain" role="img" aria-label={objectKey} />
    </div>
  )
}
