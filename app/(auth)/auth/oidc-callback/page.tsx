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
  const redirectPath = useRef("/browser")

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

    redirectPath.current = isSafeRedirectPath(credentials.redirect, "/browser")

    loginWithStsCredentials({
      AccessKeyId: credentials.accessKey,
      SecretAccessKey: credentials.secretKey,
      SessionToken: credentials.sessionToken,
      Expiration: credentials.expiration,
    })
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
    if (credentialsSet && isAuthenticated) {
      router.replace(redirectPath.current)
    }
  }, [credentialsSet, isAuthenticated, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-neutral-800">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto" />
        <p className="text-gray-600 dark:text-neutral-400">{t("Completing SSO login...")}</p>
      </div>
    </div>
  )
}
