"use client"

import * as React from "react"
import { useApi } from "@/contexts/api-context"
import type {
  MediaCapabilities,
  MediaProcessingGetResponse,
  MediaProcessingSetResponse,
  MediaProfile,
} from "@/types/media-processing"

const pathFor = (bucket: string) => `/media-processing/${encodeURIComponent(bucket)}`

// A media profile is per-bucket and changes rarely; the capabilities endpoint
// depends on the server's local ffmpeg and must not be cached across reloads.
const requestOptions = { suppress403Redirect: true, dedupe: false } as const
const capabilitiesOptions = { suppress403Redirect: true, dedupe: true } as const

export function useMediaProcessing() {
  const api = useApi()

  return React.useMemo(
    () => ({
      getConfig: (bucket: string) => api.get(pathFor(bucket), requestOptions) as Promise<MediaProcessingGetResponse>,
      setConfig: (bucket: string, config: MediaProfile) =>
        api.put(pathFor(bucket), config, requestOptions) as Promise<MediaProcessingSetResponse>,
      deleteConfig: (bucket: string) => api.delete(pathFor(bucket), requestOptions) as Promise<null>,
      getCapabilities: (bucket: string) =>
        api.get(`${pathFor(bucket)}/capabilities`, capabilitiesOptions) as Promise<MediaCapabilities>,
    }),
    [api],
  )
}
