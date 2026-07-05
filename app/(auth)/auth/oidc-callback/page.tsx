"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useMessage } from "@/lib/feedback/message"
import { parseOidcCallback } from "@/lib/oidc"
import { isSafeRedirectPath } from "@/lib/routes"
import { useTranslation } from "react-i18next"

export default function OidcCallbackPage() {
  const router = useRouter()
  const { loginWithStsCredentials, isAuthenticated } = useAuth()
  const message = useMessage()
  const { t } = useTranslation()
  const processed = useRef(false)
  const [credentialsSet, setCredentialsSet] = useState(false)
  const redirectPath = useRef("/")

  // Step 1: Parse hash and store credentials
  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const hash = window.location.hash
    const credentials = parseOidcCallback(hash)

    if (!credentials) {
      message.error(t("SSO login failed: invalid callback"))
      router.replace("/auth/login")
      return
    }

    redirectPath.current = isSafeRedirectPath(credentials.redirect, "/")

    loginWithStsCredentials(
      {
        AccessKeyId: credentials.accessKey,
        SecretAccessKey: credentials.secretKey,
        SessionToken: credentials.sessionToken,
        Expiration: credentials.expiration,
      },
      credentials.logoutToken ? { logoutToken: credentials.logoutToken } : undefined,
    )
      .then(() => {
        message.success(t("SSO Login Success"))
        setCredentialsSet(true)
      })
      .catch(() => {
        message.error(t("SSO Login Failed"))
        router.replace("/auth/login")
      })
  }, [loginWithStsCredentials, router, message, t])

  // Step 2: Wait for auth state to update before navigating
  useEffect(() => {
    if (!credentialsSet || !isAuthenticated) return

    if (redirectPath.current !== "/") {
      router.replace(redirectPath.current)
      return
    }

    router.replace("/")
  }, [credentialsSet, isAuthenticated, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/25 border-t-primary" />
        <p className="text-muted-foreground">{t("Completing SSO login…")}</p>
      </div>
    </div>
  )
}
