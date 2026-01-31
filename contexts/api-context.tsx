"use client"

import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
} from "react"
import { ApiClient } from "@/lib/api-client"
import { AwsClient } from "@/lib/aws4fetch"
import { ApiErrorHandler } from "@/lib/utils/api-error-handler"
import { useAuth } from "@/contexts/auth-context"
import { configManager } from "@/lib/config"
import { getLoginRoute } from "@/lib/routes"
import type { SiteConfig } from "@/types/config"

const ApiContext = createContext<ApiClient | null>(null)

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { credentials, isAuthenticated, logout } = useAuth()
  const [apiClient, setApiClient] = useState<ApiClient | null>(null)
  const [config, setConfig] = useState<SiteConfig | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !credentials?.AccessKeyId) {
      setApiClient(null)
      return
    }

    let cancelled = false

    configManager.loadConfig().then((siteConfig) => {
      if (cancelled) return

      const accessKeyId = credentials?.AccessKeyId || ""
      const secretAccessKey = credentials?.SecretAccessKey || ""
      const sessionToken = credentials?.SessionToken || ""
      const region = siteConfig.s3.region || "us-east-1"

      const adminApiClient = new AwsClient({
        accessKeyId,
        secretAccessKey,
        sessionToken,
        region,
        service: "s3",
      })

      const errorHandler = new ApiErrorHandler({
        onUnauthorized: async () => {
          logout()
          window.location.href = getLoginRoute()
        },
        onForbidden: async () => {
          window.location.href = "/403"
        },
      })

      const client = new ApiClient(adminApiClient, {
        baseUrl: siteConfig.api.baseURL,
        headers: { "Content-Type": "application/json" },
        errorHandler,
      })

      setConfig(siteConfig)
      setApiClient(client)
    })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, credentials?.AccessKeyId, logout])

  const value = apiClient

  return (
    <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
  )
}

export function useApi() {
  const api = useContext(ApiContext)
  if (!api) {
    throw new Error("useApi must be used within ApiProvider")
  }
  return api
}

export function useApiOptional() {
  return useContext(ApiContext)
}
