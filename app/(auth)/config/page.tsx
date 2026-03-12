"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { LanguageSwitcher } from "@/components/language-switcher"
import { AuthShell } from "@/components/auth/shell"
import { useMessage } from "@/lib/feedback/message"
import { getLoginRoute } from "@/lib/routes"
import { configManager } from "@/lib/config"
import { checkServerHealth } from "@/lib/config-helpers"
import { brand } from "@/config/brand"

export default function ConfigPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ConfigPageContent />
    </Suspense>
  )
}

function ConfigPageContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const message = useMessage()

  const [serverHost, setServerHost] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("rustfs-server-host") ?? "") : "",
  )
  const [isSaving, setIsSaving] = useState(false)

  const validateAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (serverHost) {
        let urlToValidate = serverHost.trim()

        if (!urlToValidate.match(/^https?:\/\//)) {
          urlToValidate = "https://" + urlToValidate
        }

        new URL(urlToValidate)

        const urlToSave = urlToValidate

        const healthResult = await checkServerHealth(urlToSave)
        if (!healthResult.healthy) {
          message.error(
            `${t("Unable to reach RustFS server health endpoint", { productName: brand.productName })}: ${healthResult.error ?? t("Request failed")}`,
          )
          return
        }

        localStorage.setItem("rustfs-server-host", urlToSave)

        if (!serverHost.match(/^https?:\/\//)) {
          setServerHost(urlToValidate)
        }
      } else {
        localStorage.removeItem("rustfs-server-host")
      }

      configManager.clearCache()

      message.success(t("Server configuration saved successfully"))

      setTimeout(() => {
        window.location.href = getLoginRoute()
      }, 200)
    } catch (error) {
      message.error(t("Invalid server address format") + ": " + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const resetToCurrentHost = async () => {
    localStorage.removeItem("rustfs-server-host")
    configManager.clearCache()
    setServerHost("")
    message.success(t("Reset to default successfully"))

    setTimeout(() => {
      window.location.href = getLoginRoute()
    }, 200)
  }

  const skipConfig = () => {
    router.push("/auth/login")
  }

  return (
    <AuthShell
      eyebrow={t("Server Configuration")}
      title={t("Server Configuration")}
      description={t("Please configure your RustFS server address", { productName: brand.productName })}
      sideTitle={t("Server Configuration")}
      sideDescription={t("Please configure your RustFS server address", { productName: brand.productName })}
      utilitySlot={
        <>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </>
      }
      footerSlot={
        <div className="flex items-center justify-between gap-3 px-2 text-sm text-slate-600 dark:text-white/65">
          <span>{t("Need help?")}</span>
          <Link href={brand.docsUrl} className="font-medium text-blue-600 hover:underline dark:text-blue-300">
            {t("View Documentation")}
          </Link>
        </div>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-white/4 dark:text-white/65">
        {t("Leave empty to use current host as default")}
      </div>

      <form onSubmit={validateAndSave} autoComplete="off" className="space-y-6">
        <Field>
          <FieldLabel htmlFor="serverHost">{t("Server Address")}</FieldLabel>
          <FieldContent>
            <Input
              id="serverHost"
              value={serverHost}
              onChange={(e) => setServerHost(e.target.value)}
              type="text"
              placeholder={t("Please enter server address (e.g., http://localhost:9000)")}
              className="h-11 rounded-xl"
            />
          </FieldContent>
          <FieldDescription>{t("Example: http://localhost:9000 or https://your-domain.com")}</FieldDescription>
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Button type="submit" className="h-11 rounded-xl sm:col-span-2" disabled={isSaving}>
            {t("Save Configuration")}
          </Button>

          <Button type="button" variant="outline" onClick={resetToCurrentHost} disabled={isSaving} className="h-11 rounded-xl">
            {t("Reset")}
          </Button>
          <Button type="button" variant="ghost" onClick={skipConfig} disabled={isSaving} className="h-11 rounded-xl sm:col-span-3">
            {t("Skip")}
          </Button>
        </div>
      </form>
    </AuthShell>
  )
}
