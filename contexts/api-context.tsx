"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ApiClient } from "@/lib/api-client"
import { AwsClient } from "@/lib/aws4fetch"
import { ApiErrorHandler } from "@/lib/api-error-handler"
import { useAuth } from "@/contexts/auth-context"
import { configManager } from "@/lib/config"
import { getLoginRoute, buildRoute } from "@/lib/routes"

interface ApiContextValue {
  api: ApiClient | null
  isReady: boolean
}

const ApiContext = createContext<ApiContextValue>({ api: null, isReady: false })

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { credentials, isAuthenticated, logout } = useAuth()
  const [apiClient, setApiClient] = useState<ApiClient | null>(null)
  const [isReady, setIsReady] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

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
          router.replace("/auth/login/")
        },
        onForbidden: async (url) => {
          // If the forbidden error happens on the accountinfo endpoint, it means the session is invalid
          // or the user has no permissions at all. In this case, we should log out.
          if (url?.includes("/is-admin") || url?.includes("/accountinfo") || url?.includes("/version")) {
            logout()
            router.replace("/auth/login/")
            return
          }

          if (pathname === "/403/") return
          router.replace("/403/")
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
  }, [isAuthenticated, credentials?.AccessKeyId, credentials?.SecretAccessKey, credentials?.SessionToken, logout, pathname, router])

  return <ApiContext.Provider value={{ api: apiClient, isReady }}>{children}</ApiContext.Provider>
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
