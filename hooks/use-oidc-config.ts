"use client"

import { useCallback } from "react"
import { useApi } from "@/contexts/api-context"
import type {
  DeleteOidcConfigResponse,
  OidcConfigResponse,
  SaveOidcConfigPayload,
  SaveOidcConfigResponse,
  ValidateOidcConfigPayload,
  ValidateOidcConfigResponse,
} from "@/types/oidc"

export function useOidcConfig() {
  const api = useApi()

  const getOidcConfig = useCallback(async () => {
    return (await api.get("/oidc/config")) as OidcConfigResponse
  }, [api])

  const saveOidcConfig = useCallback(
    async (providerId: string, payload: SaveOidcConfigPayload) => {
      return (await api.put(`/oidc/config/${encodeURIComponent(providerId)}`, payload)) as SaveOidcConfigResponse
    },
    [api],
  )

  const deleteOidcConfig = useCallback(
    async (providerId: string) => {
      return (await api.delete(`/oidc/config/${encodeURIComponent(providerId)}`)) as DeleteOidcConfigResponse
    },
    [api],
  )

  const validateOidcConfig = useCallback(
    async (payload: ValidateOidcConfigPayload) => {
      return (await api.post("/oidc/validate", payload)) as ValidateOidcConfigResponse
    },
    [api],
  )

  return {
    getOidcConfig,
    saveOidcConfig,
    deleteOidcConfig,
    validateOidcConfig,
  }
}
