"use client"

import { useEffect, Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { LoginForm, type LoginMethod } from "@/components/auth/login-form"
import { AppLoadingShell } from "@/components/app-loading-shell"
import { useAuth } from "@/contexts/auth-context"
import { useMessage } from "@/lib/feedback/message"
import { configManager } from "@/lib/config"
import { fetchOidcProviders, initiateOidcLogin } from "@/lib/oidc"
import type { OidcProvider } from "@/types/config"

export default function LoginPage() {
  return (
    <Suspense fallback={<AppLoadingShell />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = useMessage()
  const { login, isAuthenticated } = useAuth()
  const { t } = useTranslation()

  const [method, setMethod] = useState<LoginMethod>("accessKeyAndSecretKey")
  const [accessKeyAndSecretKey, setAccessKeyAndSecretKey] = useState({
    accessKeyId: "",
    secretAccessKey: "",
  })
  const [sts, setSts] = useState({
    accessKeyId: "",
    secretAccessKey: "",
    sessionToken: "",
  })
  const [oidcProviders, setOidcProviders] = useState<OidcProvider[]>([])

  useEffect(() => {
    if (!isAuthenticated) return
    router.replace("/")
  }, [isAuthenticated, router])

  useEffect(() => {
    if (searchParams.get("unauthorized") === "true") {
      message.warning(t("Your session has expired. Please log in again."))
      router.replace("/auth/login")
    }
  }, [searchParams, message, t, router])

  // Fetch OIDC providers after the first paint path has had a chance to settle.
  useEffect(() => {
    let cancelled = false
    const loadOidcProviders = () => {
      configManager.loadConfig().then((config) => {
        if (cancelled) return
        if (config?.serverHost) {
          fetchOidcProviders(config.serverHost).then((providers) => {
            if (!cancelled) setOidcProviders(providers)
          })
        }
      })
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(loadOidcProviders)
      return () => {
        cancelled = true
        idleWindow.cancelIdleCallback?.(idleId)
      }
    }

    const timerId = window.setTimeout(loadOidcProviders, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const credentials = method === "accessKeyAndSecretKey" ? accessKeyAndSecretKey : sts

    try {
      const currentConfig = await configManager.loadConfig()
      await login(credentials, currentConfig)

      message.success(t("Login Success"))
    } catch {
      message.error(t("Login Failed"))
    }
  }

  const handleOidcLogin = async (providerId: string) => {
    const config = await configManager.loadConfig()
    initiateOidcLogin(config.serverHost, providerId)
  }

  return (
    <LoginForm
      method={method}
      setMethod={setMethod}
      accessKeyAndSecretKey={accessKeyAndSecretKey}
      setAccessKeyAndSecretKey={setAccessKeyAndSecretKey}
      sts={sts}
      setSts={setSts}
      handleLogin={handleLogin}
      oidcProviders={oidcProviders}
      onOidcLogin={handleOidcLogin}
    />
  )
}
