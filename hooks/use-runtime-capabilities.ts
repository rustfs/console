"use client"

import { useCallback, useEffect, useState } from "react"
import { useApi } from "@/contexts/api-context"
import { normalizeRuntimeCapabilities, type RuntimeCapabilitiesSnapshot } from "@/lib/runtime-capabilities"

export function useRuntimeCapabilities() {
  const api = useApi()
  const [capabilities, setCapabilities] = useState<RuntimeCapabilitiesSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCapabilities = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.get(api.resolveUrl("/rustfs/admin/v4/runtime/capabilities"), {
        suppress403Redirect: true,
      })
      const normalized = normalizeRuntimeCapabilities(response)
      setCapabilities(normalized.capabilities)
      setError(normalized.error ?? null)
    } catch (loadError) {
      setCapabilities(null)
      setError(
        loadError instanceof Error && loadError.message
          ? loadError.message
          : "Replication capabilities are unavailable.",
      )
    } finally {
      setIsLoading(false)
    }
  }, [api])

  useEffect(() => {
    void loadCapabilities()
  }, [loadCapabilities])

  return {
    capabilities,
    isLoading,
    error,
    reload: loadCapabilities,
  }
}
