"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { AppLoadingShell } from "@/components/app-loading-shell"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeLogo } from "@/components/theme/logo"
import { AuthHeroStatic } from "@/components/auth/heroes/hero-static"
import { useMessage } from "@/lib/feedback/message"
import { buildRoute, getLoginRoute } from "@/lib/routes"
import { configManager } from "@/lib/config"
import { checkServerHealth } from "@/lib/config-helpers"
import { getThemeManifest } from "@/lib/theme/manifest"

export default function ConfigPage() {
  return (
    <Suspense fallback={<AppLoadingShell />}>
      <ConfigPageContent />
    </Suspense>
  )
}

function ConfigPageContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const message = useMessage()
  const theme = getThemeManifest()
  const docs = theme.links.documentation ?? "https://docs.rustfs.com/?ref=console"

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
            `${t("Unable to reach RustFS server health endpoint")}: ${healthResult.error ?? t("Request failed")}`,
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
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-muted p-4 sm:p-8 lg:p-12">
      <Image
        src={buildRoute("/backgrounds/scillate.svg")}
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 z-0 object-cover opacity-30"
      />
      <div className="z-10 mx-auto flex w-full max-w-6xl flex-col overflow-hidden border bg-card shadow-none lg:min-h-[600px] lg:flex-row">
        <div className="hidden lg:block lg:w-5/12">
          <AuthHeroStatic />
        </div>
        <div className="flex w-full flex-col items-center justify-center bg-card lg:w-7/12">
          <div className="w-full max-w-md p-6 sm:p-8 lg:p-10">
            <ThemeLogo width={112} height={24} className="lg:hidden" priority />
            <div className="mt-8 lg:mt-0">
              <h1 className="block font-heading text-2xl font-semibold tracking-tight text-foreground">
                {t("Server Configuration")}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("Please configure your RustFS server address")}</p>
            </div>

            <div className="mt-8 space-y-4">
              <form onSubmit={validateAndSave} autoComplete="off" aria-busy={isSaving}>
                <div className="grid gap-y-6">
                  <Field>
                    <FieldLabel htmlFor="serverHost">{t("Server Address")}</FieldLabel>
                    <FieldDescription>{t("Leave empty to use current host as default")}</FieldDescription>
                    <FieldContent>
                      <Input
                        id="serverHost"
                        name="serverHost"
                        value={serverHost}
                        onChange={(e) => setServerHost(e.target.value)}
                        type="url"
                        autoComplete="off"
                        spellCheck={false}
                        className="h-11 text-base sm:h-8 sm:text-xs"
                        placeholder={t("Please enter server address (e.g., http://localhost:9000)")}
                      />
                    </FieldContent>
                    <FieldDescription>
                      {t("Example: http://localhost:9000 or https://your-domain.com")}
                    </FieldDescription>
                  </Field>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="submit"
                      className="h-11 w-full text-sm sm:h-8 sm:flex-1 sm:text-xs"
                      disabled={isSaving}
                    >
                      {t("Save Configuration")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full text-sm sm:h-8 sm:w-auto sm:text-xs"
                      onClick={resetToCurrentHost}
                      disabled={isSaving}
                    >
                      {t("Reset")}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-full text-sm sm:h-8 sm:w-auto sm:text-xs"
                      onClick={skipConfig}
                      disabled={isSaving}
                    >
                      {t("Skip")}
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t pt-5">
              <p className="min-w-0 text-sm text-muted-foreground">
                {t("Need help?")}{" "}
                <Link href={docs} className="text-foreground underline-offset-4 hover:underline">
                  {t("View Documentation")}
                </Link>
              </p>
              <div className="flex shrink-0 items-center gap-1 [&_[data-slot=button]]:size-10 sm:[&_[data-slot=button]]:size-8">
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
