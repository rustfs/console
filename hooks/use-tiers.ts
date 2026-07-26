"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export interface TierConfig {
  name?: string
  endpoint?: string
  bucket?: string
  prefix?: string
  region?: string
  [key: string]: unknown
}

export interface TierRow {
  type: string
  wasabi?: TierConfig
  rustfs?: TierConfig
  minio?: TierConfig
  s3?: TierConfig
  aliyun?: TierConfig
  tencent?: TierConfig
  huaweicloud?: TierConfig
  azure?: TierConfig
  gcs?: TierConfig
  r2?: TierConfig
  [key: string]: unknown
}

export interface ManualTransitionRunOptions {
  bucket: string
  prefix?: string
  tier?: string
  dryRun?: boolean
  maxObjects?: number
}

export interface ManualTransitionRunReport {
  bucket?: string
  prefix?: string
  tier?: string
  dry_run?: boolean
  scanned?: number
  transitioned?: number
  already_transitioned?: number
  skipped?: number
  failed?: number
  tier_failures?: number
  [key: string]: unknown
}

export interface ManualTransitionJobResponse {
  job_id?: string
  jobId?: string
  state?: string
  status?: string
  error?: string | null
  status_endpoint?: string
  cancel_endpoint?: string
  report?: ManualTransitionRunReport
  [key: string]: unknown
}

export function useTiers() {
  const api = useApi()

  const addTiers = useCallback(
    async (data: Record<string, unknown>) => {
      return api.put("/tier?force=false", data)
    },
    [api],
  )

  const updateTiers = useCallback(
    async (name: string, data: Record<string, unknown>) => {
      return api.post(`/tier/${encodeURIComponent(name)}`, data)
    },
    [api],
  )

  const listTiers = useCallback(async () => {
    return api.get("/tier") as Promise<TierRow[]>
  }, [api])

  const removeTiers = useCallback(
    async (name: string) => {
      return api.delete(`/tier/${encodeURIComponent(name)}?force=false`, {})
    },
    [api],
  )

  const runManualTransition = useCallback(
    async (options: ManualTransitionRunOptions) => {
      const params: Record<string, string> = {
        bucket: options.bucket,
        mode: "async",
      }
      if (options.prefix) params.prefix = options.prefix
      if (options.tier) params.tier = options.tier
      if (typeof options.dryRun === "boolean") params.dryRun = String(options.dryRun)
      if (typeof options.maxObjects === "number" && Number.isFinite(options.maxObjects)) {
        params.maxObjects = String(options.maxObjects)
      }
      return api.post("/ilm/transition/run", null, {
        params,
        suppress403Redirect: true,
      }) as Promise<ManualTransitionJobResponse>
    },
    [api],
  )

  const getManualTransitionJob = useCallback(
    async (jobId: string) => {
      return api.get(`/ilm/transition/jobs/${encodeURIComponent(jobId)}`, {
        suppress403Redirect: true,
      }) as Promise<ManualTransitionJobResponse>
    },
    [api],
  )

  const cancelManualTransitionJob = useCallback(
    async (jobId: string) => {
      return api.delete(`/ilm/transition/jobs/${encodeURIComponent(jobId)}`, {
        suppress403Redirect: true,
      }) as Promise<ManualTransitionJobResponse>
    },
    [api],
  )

  return {
    addTiers,
    updateTiers,
    listTiers,
    removeTiers,
    runManualTransition,
    getManualTransitionJob,
    cancelManualTransitionJob,
  }
}
