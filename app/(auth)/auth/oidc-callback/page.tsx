"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useFirstAccessibleDashboardRoute } from "@/hooks/use-first-accessible-dashboard-route"
import { useMessage } from "@/lib/feedback/message"
import { parseOidcCallback } from "@/lib/oidc"
import { isSafeRedirectPath } from "@/lib/routes"
import { useTranslation } from "react-i18next"

export default function OidcCallbackPage() {
  const router = useRouter()
  const { loginWithStsCredentials, isAuthenticated } = useAuth()
  const { route: firstAccessibleRoute, isReady: hasResolvedFirstRoute } = useFirstAccessibleDashboardRoute()
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

    if (hasResolvedFirstRoute && firstAccessibleRoute) {
      router.replace(firstAccessibleRoute)
    }
  }, [credentialsSet, isAuthenticated, hasResolvedFirstRoute, firstAccessibleRoute, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-neutral-800">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto" />
        <p className="text-gray-600 dark:text-neutral-400">{t("Completing SSO login...")}</p>
      </div>
    </div>
  )
}
