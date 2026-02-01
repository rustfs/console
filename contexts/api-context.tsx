"use client"

import {
  createContext,
  useContext,
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

interface ApiContextValue {
  api: ApiClient | null
  isReady: boolean
}

const ApiContext = createContext<ApiContextValue>({ api: null, isReady: false })

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { credentials, isAuthenticated, logout } = useAuth()
  const [apiClient, setApiClient] = useState<ApiClient | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !credentials?.AccessKeyId) {
      queueMicrotask(() => {
        setApiClient(null)
        setIsReady(true)
      })
      return
    }

    queueMicrotask(() => setIsReady(false))
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

      setApiClient(client)
      setIsReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, credentials?.AccessKeyId, logout])

  return (
    <ApiContext.Provider value={{ api: apiClient, isReady }}>
      {children}
    </ApiContext.Provider>
  )
}

export function useApi() {
  const { api } = useContext(ApiContext)
  if (!api) {
    throw new Error("useApi must be used within ApiProvider")
  }
  return api
}

export function useApiOptional() {
  const { api } = useContext(ApiContext)
  return api
}

export function useApiReady() {
  const { api, isReady } = useContext(ApiContext)
  return { api, isReady }
}
