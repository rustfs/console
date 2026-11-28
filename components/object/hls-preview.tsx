"use client"

import { useEffect, useRef, useState } from "react"
import type Hls from "hls.js"
import type { LoaderCallbacks, LoaderConfiguration, LoaderContext } from "hls.js"
import { useTranslation } from "react-i18next"
import { useObject } from "@/hooks/use-object"
import { createHlsPreviewSource } from "@/lib/hls-preview"

interface HlsPreviewProps {
  bucketName: string
  objectKey: string
  url: string
  className: string
}

export function HlsPreview({ bucketName, objectKey, url, className }: HlsPreviewProps) {
  const { t } = useTranslation()
  const { getSignedUrl } = useObject(bucketName)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let cancelled = false
    let player: Hls | undefined

    const destroyPlayer = () => {
      video.removeEventListener("error", onMediaError)
      const currentPlayer = player
      player = undefined
      currentPlayer?.destroy()
    }
    const showFailure = () => {
      if (cancelled) return
      destroyPlayer()
      setFailed(true)
    }
    const onMediaError = () => {
      if (video.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) showFailure()
    }

    void import("hls.js")
      .then(({ default: Hls, FetchLoader }) => {
        if (cancelled) return
        if (!Hls.isSupported()) {
          showFailure()
          return
        }

        const source = createHlsPreviewSource(url, bucketName, objectKey, (key, versionId) =>
          getSignedUrl(key, 3600, undefined, versionId),
        )

        class ObjectLoader extends FetchLoader {
          override load(
            context: LoaderContext,
            config: LoaderConfiguration,
            callbacks: LoaderCallbacks<LoaderContext>,
          ) {
            super.load(context, config, {
              ...callbacks,
              onSuccess: (response, stats, context, details) => {
                // Resolve playlist URIs against the object URL without exposing its signature to the parser.
                callbacks.onSuccess({ ...response, url: context.url }, stats, context, details)
              },
            })
          }
        }

        player = new Hls({
          loader: ObjectLoader,
          lowLatencyMode: false,
          fetchSetup: (context, init: RequestInit) => source.request(context.url, init),
        })
        player.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) showFailure()
        })
        player.attachMedia(video)
        video.addEventListener("error", onMediaError)
        player.loadSource(source.url)
      })
      .catch(showFailure)

    return () => {
      cancelled = true
      destroyPlayer()
    }
  }, [bucketName, getSignedUrl, objectKey, url])

  if (failed) {
    return (
      <div className="my-auto text-center text-sm text-destructive" role="alert">
        {t("Preview unavailable")}
      </div>
    )
  }

  return <video ref={videoRef} controls playsInline preload="metadata" className={className} aria-label={objectKey} />
}
