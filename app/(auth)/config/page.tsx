"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
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
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ConfigPageContent />
    </Suspense>
  )
}

function ConfigPageContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const message = useMessage()
  const theme = getThemeManifest()
  const docs = theme.links.documentation ?? "https://docs.rustfs.com/"

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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-muted p-4 sm:p-6 lg:p-20">
      <Image
        src={buildRoute("/backgrounds/scillate.svg")}
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 z-0 opacity-45 object-cover"
      />
      <div className="z-10 mx-auto flex w-full max-w-7xl flex-col overflow-hidden border bg-card shadow-none lg:min-h-[560px] lg:flex-row">
        <div className="hidden w-1/2 lg:block">
          <AuthHeroStatic />
        </div>
        <div className="flex w-full flex-col items-center justify-center bg-card lg:w-1/2">
          <div className="max-w-sm w-full space-y-6 p-4 sm:p-7">
            <ThemeLogo width={112} height={24} priority />
            <div className="py-6">
              <h1 className="block text-2xl font-bold text-foreground">{t("Server Configuration")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("Please configure your RustFS server address")}</p>
            </div>

            <div className="mt-5 space-y-4">
              <form onSubmit={validateAndSave} autoComplete="off">
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
                        placeholder={t("Please enter server address (e.g., http://localhost:9000)")}
                      />
                    </FieldContent>
                    <FieldDescription>
                      {t("Example: http://localhost:9000 or https://your-domain.com")}
                    </FieldDescription>
                  </Field>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button type="submit" className="w-full sm:flex-1" disabled={isSaving}>
                      {t("Save Configuration")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={resetToCurrentHost}
                      disabled={isSaving}
                    >
                      {t("Reset")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={skipConfig}
                      disabled={isSaving}
                    >
                      {t("Skip")}
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            <div className="my-8">
              <p className="text-sm text-muted-foreground">
                {t("Need help?")}{" "}
                <Link href={docs} className="text-foreground underline-offset-4 hover:underline">
                  {t("View Documentation")}
                </Link>
              </p>
            </div>

            <div className="mx-auto flex w-1/2 items-center justify-around gap-4">
              <div className="inline-flex">
                <ThemeSwitcher />
              </div>
              <div className="inline-flex">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
