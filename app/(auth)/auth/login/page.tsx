"use client"

import { useEffect, Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { LoginForm, type LoginMethod } from "@/components/auth/login-form"
import { useAuth } from "@/contexts/auth-context"
import { useMessage } from "@/lib/feedback/message"
import { configManager } from "@/lib/config"
import { fetchOidcProviders, initiateOidcLogin } from "@/lib/oidc"
import type { OidcProvider } from "@/types/config"

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
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
    if (isAuthenticated) {
      router.replace("/browser")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (searchParams.get("unauthorized") === "true") {
      message.warning(t("Your session has expired. Please log in again."))
      router.replace("/auth/login")
    }
  }, [searchParams, message, t, router])

  // Fetch OIDC providers on mount
  useEffect(() => {
    configManager.loadConfig().then((config) => {
      if (config?.serverHost) {
        fetchOidcProviders(config.serverHost).then(setOidcProviders)
      }
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const credentials = method === "accessKeyAndSecretKey" ? accessKeyAndSecretKey : sts

    try {
      const currentConfig = await configManager.loadConfig()
      await login(credentials, currentConfig)

      message.success(t("Login Success"))
      router.replace("/browser")
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
