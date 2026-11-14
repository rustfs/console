"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ApiClient } from "@/lib/api-client"
import { AwsClient } from "@/lib/aws4fetch"
import { ApiErrorHandler } from "@/lib/api-error-handler"
import { useAuth } from "@/contexts/auth-context"
import { configManager } from "@/lib/config"
import { scheduleMicrotask } from "@/lib/schedule-microtask"
import { isSameSession, type SessionCredentials } from "@/lib/auth-session"

interface ApiContextValue {
  api: ApiClient | null
  isReady: boolean
}

const ApiContext = createContext<ApiContextValue>({ api: null, isReady: false })

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const { credentials, isAuthenticated, expireSession, isCurrentSession, getIsLoggingOut } = useAuth()
  const [apiClient, setApiClient] = useState<{ client: ApiClient; credentials: SessionCredentials } | null>(null)
  const [isReady, setIsReady] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (!isAuthenticated || !credentials?.AccessKeyId) {
      scheduleMicrotask(() => {
        setApiClient(null)
        setIsReady(true)
      })
      return
    }

    scheduleMicrotask(() => setIsReady(false))
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
          if (expireSession(credentials)) router.replace("/auth/login/?unauthorized=true")
        },
        onForbidden: async () => {
          if (getIsLoggingOut() || !isCurrentSession(credentials)) return

          if (pathnameRef.current === "/403/") return
          router.replace("/403/")
        },
      })

      const client = new ApiClient(adminApiClient, {
        baseUrl: siteConfig.api.baseURL,
        headers: { "Content-Type": "application/json" },
        errorHandler,
      })

      setApiClient({ client, credentials })
      setIsReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, credentials, expireSession, isCurrentSession, getIsLoggingOut, router])

  const currentClient =
    isAuthenticated && apiClient && isSameSession(credentials, apiClient.credentials) ? apiClient.client : null
  return (
    <ApiContext.Provider value={{ api: currentClient, isReady: isReady && (!isAuthenticated || !!currentClient) }}>
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
