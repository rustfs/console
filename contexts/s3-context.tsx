"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { S3Client } from "@aws-sdk/client-s3"
import { useAuth } from "@/contexts/auth-context"
import { addApiPrefixMiddleware } from "@/lib/api-prefix-middleware"
import { addDeleteReplicationMiddleware } from "@/lib/bucket-replication-delete"
import { configManager } from "@/lib/config"
import { addS3ErrorMiddleware } from "@/lib/s3-error-middleware"
import { scheduleMicrotask } from "@/lib/schedule-microtask"
import type { SiteConfig } from "@/types/config"
import { isSameSession, type SessionCredentials } from "@/lib/auth-session"

interface S3ContextValue {
  client: S3Client | null
  isReady: boolean
}

const S3Context = createContext<S3ContextValue>({
  client: null,
  isReady: false,
})

export function S3Provider({ children }: { children: React.ReactNode }) {
  const { credentials, isAuthenticated, expireSession } = useAuth()
  const [s3Client, setS3Client] = useState<{ client: S3Client; credentials: SessionCredentials } | null>(null)
  const [isReady, setIsReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || !credentials?.AccessKeyId) {
      scheduleMicrotask(() => {
        setS3Client(null)
        setIsReady(true)
      })
      return
    }

    scheduleMicrotask(() => setIsReady(false))
    let cancelled = false

    configManager.loadConfig().then((siteConfig: SiteConfig) => {
      if (cancelled) return

      const client = new S3Client({
        endpoint: siteConfig.s3.endpoint,
        region: siteConfig.s3.region || "us-east-1",
        forcePathStyle: true,
        // https://github.com/aws/aws-sdk-js-v3/issues/6834#issuecomment-2611346849
        requestChecksumCalculation: "WHEN_REQUIRED",
        credentials: {
          accessKeyId: credentials?.AccessKeyId || "",
          secretAccessKey: credentials?.SecretAccessKey || "",
          sessionToken: credentials?.SessionToken || "",
        },
      })

      addApiPrefixMiddleware(client)

      addDeleteReplicationMiddleware(client)

      addS3ErrorMiddleware(client, () => {
        if (expireSession(credentials)) router.replace("/auth/login/?unauthorized=true")
      })

      setS3Client({ client, credentials })
      setIsReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, credentials, expireSession, router])

  const currentClient =
    isAuthenticated && s3Client && isSameSession(credentials, s3Client.credentials) ? s3Client.client : null
  return (
    <S3Context.Provider value={{ client: currentClient, isReady: isReady && (!isAuthenticated || !!currentClient) }}>
      {children}
    </S3Context.Provider>
  )
}

export function useS3() {
  const { client } = useContext(S3Context)
  if (!client) {
    throw new Error("useS3 must be used within S3Provider")
  }
  return client
}

export function useS3Optional() {
  const { client } = useContext(S3Context)
  return client
}

export function useS3Ready() {
  const { client, isReady } = useContext(S3Context)
  return { client, isReady }
}
