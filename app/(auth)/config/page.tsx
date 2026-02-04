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
import { AuthHeroStatic } from "@/components/auth/heroes/hero-static"
import { useMessage } from "@/lib/feedback/message"
import { buildRoute, getLoginRoute } from "@/lib/routes"
import logoImage from "@/assets/logo.svg"
import { configManager } from "@/lib/config"

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

  const validateAndSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (serverHost) {
        let urlToValidate = serverHost.trim()

        if (!urlToValidate.match(/^https?:\/\//)) {
          urlToValidate = "https://" + urlToValidate
        }

        new URL(urlToValidate)

        const urlToSave = serverHost.match(/^https?:\/\//) ? serverHost : urlToValidate
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-neutral-800 lg:p-20">
      <Image
        src={buildRoute("/backgrounds/scillate.svg")}
        alt=""
        fill
        className="absolute inset-0 z-0 opacity-45 object-cover"
      />
      <div className="z-10 mx-auto flex max-h-[85vh] w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-lg shadow-lg dark:border-neutral-700 dark:bg-neutral-800 lg:flex-row">
        <div className="hidden w-1/2 lg:block">
          <AuthHeroStatic />
        </div>
        <div className="flex w-full flex-col items-center justify-center bg-white dark:border-neutral-700 dark:bg-neutral-900 lg:w-1/2">
          <div className="max-w-sm w-full space-y-6 p-4 sm:p-7">
            <Image src={logoImage} alt="RustFS" width={112} height={24} className="max-w-28" />
            <div className="py-6">
              <h1 className="block text-2xl font-bold text-gray-800 dark:text-white">{t("Server Configuration")}</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
                {t("Please configure your RustFS server address")}
              </p>
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
                        value={serverHost}
                        onChange={(e) => setServerHost(e.target.value)}
                        type="text"
                        placeholder={t("Please enter server address (e.g., http://localhost:9000)")}
                      />
                    </FieldContent>
                    <FieldDescription>
                      {t("Example: http://localhost:9000 or https://your-domain.com")}
                    </FieldDescription>
                  </Field>

                  <div className="flex gap-3">
                    <Button type="submit" className="flex-1">
                      {t("Save Configuration")}
                    </Button>

                    <Button type="button" variant="outline" onClick={resetToCurrentHost}>
                      {t("Reset")}
                    </Button>

                    <Button type="button" variant="outline" onClick={skipConfig}>
                      {t("Skip")}
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            <div className="my-8">
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                {t("Need help?")}{" "}
                <Link href="https://docs.rustfs.com" className="text-blue-600 hover:underline">
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
