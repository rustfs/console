"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"
import type {
  KmsCancelDeletionRequest,
  KmsConfigPayload,
  KmsCreateKeyRequest,
  KmsCreateKeyResponse,
  KmsDeleteKeyOptions,
  KmsKeyDetailResponse,
  KmsKeyListResponse,
  KmsMutationResponse,
  KmsServiceStatusResponse,
  KmsStartRequest,
} from "@/types/kms"

export function useSSE() {
  const api = useApi()

  const getKMSStatus = useCallback(async (): Promise<KmsServiceStatusResponse> => {
    return (await api.get("/kms/service-status")) as KmsServiceStatusResponse
  }, [api])

  const configureKMS = useCallback(
    async (data: KmsConfigPayload): Promise<KmsMutationResponse> => {
      return (await api.post("/kms/configure", data)) as KmsMutationResponse
    },
    [api],
  )

  const reconfigureKMS = useCallback(
    async (data: KmsConfigPayload): Promise<KmsMutationResponse> => {
      return (await api.post("/kms/reconfigure", data)) as KmsMutationResponse
    },
    [api],
  )

  const startKMS = useCallback(async (data: KmsStartRequest = {}): Promise<KmsMutationResponse> => {
    return (await api.post("/kms/start", data)) as KmsMutationResponse
  }, [api])

  const stopKMS = useCallback(async (): Promise<KmsMutationResponse> => {
    return (await api.post("/kms/stop", {})) as KmsMutationResponse
  }, [api])

  const getConfiguration = useCallback(async () => {
    return api.get("/kms/config")
  }, [api])

  const clearCache = useCallback(async (): Promise<KmsMutationResponse> => {
    return (await api.post("/kms/clear-cache", {})) as KmsMutationResponse
  }, [api])

  const getDetailedStatus = useCallback(async () => {
    return api.get("/kms/status")
  }, [api])

  const createKey = useCallback(
    async (data: KmsCreateKeyRequest): Promise<KmsCreateKeyResponse> => {
      const requestData = {
        key_usage: data.key_usage || "EncryptDecrypt",
        description: data.description,
        tags: data.tags,
      }
      return (await api.post("/kms/keys", requestData)) as KmsCreateKeyResponse
    },
    [api],
  )

  const getKeyDetails = useCallback(
    async (keyId: string): Promise<KmsKeyDetailResponse> => {
      return (await api.get(`/kms/keys/${keyId}`)) as KmsKeyDetailResponse
    },
    [api],
  )

  const getKeyList = useCallback(
    async (params?: { limit?: number; marker?: string }): Promise<KmsKeyListResponse> => {
      const queryParams = new URLSearchParams()
      if (params?.limit) queryParams.append("limit", params.limit.toString())
      if (params?.marker) queryParams.append("marker", params.marker)
      const url = queryParams.toString() ? `/kms/keys?${queryParams}` : "/kms/keys"
      return (await api.get(url)) as KmsKeyListResponse
    },
    [api],
  )

  const deleteKey = useCallback(
    async (keyId: string, options: KmsDeleteKeyOptions = {}): Promise<KmsMutationResponse> => {
      const queryParams = new URLSearchParams({ keyId: keyId })
      if (options.pending_window_in_days != null) {
        queryParams.append("pending_window_in_days", String(options.pending_window_in_days))
      }
      if (options.force_immediate) {
        queryParams.append("force_immediate", "true")
      }
      const url = `/kms/keys/delete?${queryParams.toString()}`
      return (await api.delete(url)) as KmsMutationResponse
    },
    [api],
  )

  const forceDeleteKey = useCallback(
    async (keyId: string): Promise<KmsMutationResponse> => {
      return deleteKey(keyId, { force_immediate: true })
    },
    [deleteKey],
  )

  const cancelKeyDeletion = useCallback(
    async (request: string | KmsCancelDeletionRequest): Promise<KmsMutationResponse> => {
      const keyId = typeof request === "string" ? request : request.key_id
      const url = `/kms/keys/cancel-deletion?keyId=${encodeURIComponent(keyId)}`
      return (await api.post(url, typeof request === "string" ? {} : request)) as KmsMutationResponse
    },
    [api],
  )

  return {
    getKMSStatus,
    configureKMS,
    reconfigureKMS,
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
    cancelKeyDeletion,
  }
}
