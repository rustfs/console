"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"

export function useSSE() {
  const api = useApi()

  const getKMSStatus = useCallback(async () => {
    return api.get("/kms/service-status")
  }, [api])

  const configureKMS = useCallback(
    async (data: Record<string, unknown>) => {
      return api.post("/kms/configure", data)
    },
    [api]
  )

  const startKMS = useCallback(async () => {
    return api.post("/kms/start", {})
  }, [api])

  const stopKMS = useCallback(async () => {
    return api.post("/kms/stop", {})
  }, [api])

  const getConfiguration = useCallback(async () => {
    return api.get("/kms/config")
  }, [api])

  const clearCache = useCallback(async () => {
    return api.post("/kms/clear-cache", {})
  }, [api])

  const getDetailedStatus = useCallback(async () => {
    return api.get("/kms/status")
  }, [api])

  const createKey = useCallback(
    async (data: {
      KeyUsage?: string
      Description?: string
      Tags?: Record<string, string>
    }) => {
      const requestData = {
        key_usage: data.KeyUsage || "EncryptDecrypt",
        description: data.Description,
        tags: data.Tags,
      }
      return api.post("/kms/keys", requestData)
    },
    [api]
  )

  const getKeyDetails = useCallback(
    async (keyId: string) => {
      return api.get(`/kms/keys/${keyId}`)
    },
    [api]
  )

  const getKeyList = useCallback(
    async (params?: { limit?: number; marker?: string }) => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append("limit", params.limit.toString())
      if (params?.marker) queryParams.append("marker", params.marker)
      const url = queryParams.toString()
        ? `/kms/keys?${queryParams}`
        : "/kms/keys"
      return api.get(url)
    },
    [api]
  )

  const deleteKey = useCallback(
    async (keyId: string) => {
      const url = `/kms/keys/delete?keyId=${encodeURIComponent(keyId)}`
      return api.delete(url)
    },
    [api]
  )

  const forceDeleteKey = useCallback(
    async (keyId: string) => {
      const url = `/kms/keys/delete?keyId=${encodeURIComponent(keyId)}&force_immediate=true`
      return api.delete(url)
    },
    [api]
  )

  return {
    getKMSStatus,
    configureKMS,
    startKMS,
    stopKMS,
    getConfiguration,
    clearCache,
    getDetailedStatus,
    createKey,
    getKeyDetails,
    getKeyList,
    deleteKey,
    forceDeleteKey,
  }
}
