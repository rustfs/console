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
  rustfs?: TierConfig
  minio?: TierConfig
  s3?: TierConfig
  aliyun?: TierConfig
  azure?: TierConfig
  gcs?: TierConfig
  r2?: TierConfig
  [key: string]: unknown
}

const UNSUPPORTED_TIER_TYPES = new Set(["huaweicloud", "tencent"])

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
    const tiers = (await api.get("/tier")) as TierRow[] | undefined
    return (tiers ?? []).filter((tier) => !UNSUPPORTED_TIER_TYPES.has(tier.type))
  }, [api])

  const removeTiers = useCallback(
    async (name: string) => {
      return api.delete(`/tier/${encodeURIComponent(name)}?force=true`, {})
    },
    [api],
  )

  return {
    addTiers,
    updateTiers,
    listTiers,
    removeTiers,
  }
}
