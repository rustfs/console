"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { S3Client } from "@aws-sdk/client-s3"
import { useAuth } from "@/contexts/auth-context"
import { configManager } from "@/lib/config"
import { getLoginRoute } from "@/lib/routes"
import type { SiteConfig } from "@/types/config"

interface S3Response {
  response?: { body?: string }
  [key: string]: unknown
}

function patchReplicationBody(
  body: string | undefined,
  config: { Rules?: Array<{ DeleteReplication?: { Status?: string } }> } | undefined,
): string | undefined {
  if (typeof body !== "string" || !config?.Rules?.length) return body
  let i = 0
  return body.replace(/<\/Rule>/g, () => {
    const rule = config.Rules?.[i++]
    const dr = rule?.DeleteReplication
    const tag = dr ? `<DeleteReplication><Status>${dr.Status ?? "Disabled"}</Status></DeleteReplication>` : ""
    return tag + "</Rule>"
  })
}

interface S3ContextValue {
  client: S3Client | null
  isReady: boolean
}

const S3Context = createContext<S3ContextValue>({
  client: null,
  isReady: false,
})

export function S3Provider({ children }: { children: React.ReactNode }) {
  const { credentials, isAuthenticated, logout } = useAuth()
  const [s3Client, setS3Client] = useState<S3Client | null>(null)
  const [isReady, setIsReady] = useState(false)
  const router = useRouter()

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
        ((next: any) => async (args: any) => {
          const input = args?.input
          if (
            input &&
            "ReplicationConfiguration" in input &&
            "Bucket" in input &&
            input.ReplicationConfiguration?.Rules?.length
          ) {
            const raw =
              typeof args.request?.body === "string"
                ? args.request.body
                : args.request?.body instanceof Uint8Array
                  ? new TextDecoder().decode(args.request.body)
                  : null
            if (raw) {
              const patched = patchReplicationBody(raw, input.ReplicationConfiguration)
              if (patched != null) args.request.body = patched
            }
          }
          return next(args)
        }) as any,
        { step: "serialize", name: "injectDeleteReplication", priority: "low" },
      )
      client.middlewareStack.add(
        ((next: any) => async (args: any) => {
          try {
            const response = (await next(args)) as S3Response

            if (response.response?.body && typeof response.response.body === "string") {
              const body = response.response.body.trim()
              if (body.match(/^<\?xml[^>]*\?><[^>]*><\/[^>]*>$/)) {
                const tagName = body.match(/<([^>]*)><\/\1>/)?.[1]
                if (tagName) {
                  const propertyName = tagName.replace(/(?:^|_)([a-z])/g, (_, letter: string) => letter.toUpperCase())
                  return {
                    response: response.response,
                    [propertyName]: null,
                  }
                }
              }
            }

            return response
          } catch (error: unknown) {
            const err = error as {
              $metadata?: { httpStatusCode?: number }
              Code?: string
              name?: string
              message?: string
            }
            if (err?.$metadata?.httpStatusCode === 401) {
              logout()
              router.replace("/auth/login/")
              return { response: { statusCode: 401, headers: {} } }
            }
            if (err?.$metadata?.httpStatusCode === 403) {
              const codeText = (err?.Code || err?.name || "").toLowerCase()
              const isUnauthorizedAccess = codeText === "unauthorizedaccess"
              const isInvalidAccessKey = codeText === "invalidaccesskeyid"
              if (isUnauthorizedAccess || isInvalidAccessKey) {
                logout()
                router.replace("/auth/login/")
                return { response: { statusCode: 401, headers: {} } }
              }
            }
            if (err?.Code) {
              throw new Error(err.Code)
            }
            throw error
          }
        }) as any,
        { step: "deserialize", name: "handleXmlResponse" },
      )
      /* eslint-enable @typescript-eslint/no-explicit-any */

      setS3Client(client)
      setIsReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, credentials?.AccessKeyId, credentials?.SecretAccessKey, credentials?.SessionToken, logout, router])

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
