"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { S3Client } from "@aws-sdk/client-s3"
import { useAuth } from "@/contexts/auth-context"
import { configManager } from "@/lib/config"
import { getLoginRoute } from "@/lib/routes"
import type { SiteConfig } from "@/types/config"

interface S3Response {
  response?: { body?: string }
  [key: string]: unknown
}

interface S3ContextValue {
  client: S3Client | null
  isReady: boolean
}

const S3Context = createContext<S3ContextValue>({ client: null, isReady: false })

export function S3Provider({ children }: { children: React.ReactNode }) {
  const { credentials, isAuthenticated, logout } = useAuth()
  const [s3Client, setS3Client] = useState<S3Client | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !credentials?.AccessKeyId) {
      queueMicrotask(() => {
        setS3Client(null)
        setIsReady(true)
      })
      return
    }

    queueMicrotask(() => setIsReady(false))
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

      /* eslint-disable @typescript-eslint/no-explicit-any -- AWS SDK middleware types are complex */
      client.middlewareStack.add(
        ((next: any) =>
          async (args: any) => {
            try {
              const response = (await next(args)) as S3Response

              if (response.response?.body && typeof response.response.body === "string") {
                const body = response.response.body.trim()
                if (body.match(/^<\?xml[^>]*\?><[^>]*><\/[^>]*>$/)) {
                  const tagName = body.match(/<([^>]*)><\/\1>/)?.[1]
                  if (tagName) {
                    const propertyName = tagName.replace(/(?:^|_)([a-z])/g, (_, letter: string) =>
                      letter.toUpperCase()
                    )
                    return {
                      response: response.response,
                      [propertyName]: null,
                    }
                  }
                }
              }

              return response
            } catch (error: unknown) {
              const err = error as { $metadata?: { httpStatusCode?: number }; Code?: string }
              if (err?.$metadata?.httpStatusCode === 401) {
                logout()
                window.location.href = getLoginRoute()
                return { response: { statusCode: 401, headers: {} } }
              }
              if (err?.Code) {
                throw new Error(err.Code)
              }
              throw error
            }
          }) as any,
        { step: "deserialize", name: "handleXmlResponse" }
      )
      /* eslint-enable @typescript-eslint/no-explicit-any */

      setS3Client(client)
      setIsReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, credentials?.AccessKeyId, logout])

  return <S3Context.Provider value={{ client: s3Client, isReady }}>{children}</S3Context.Provider>
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
