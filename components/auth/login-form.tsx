"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { RiSettings3Line } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { LanguageSwitcher } from "@/components/language-switcher"
import { AuthShell } from "@/components/auth/shell"
import { brand } from "@/config/brand"

import type { OidcProvider } from "@/types/config"

export type LoginMethod = "accessKeyAndSecretKey" | "sts"

export interface LoginFormProps {
  method: LoginMethod
  setMethod: (m: LoginMethod) => void
  accessKeyAndSecretKey: { accessKeyId: string; secretAccessKey: string }
  setAccessKeyAndSecretKey: React.Dispatch<React.SetStateAction<{ accessKeyId: string; secretAccessKey: string }>>
  sts: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken: string
  }
  setSts: React.Dispatch<
    React.SetStateAction<{
      accessKeyId: string
      secretAccessKey: string
      sessionToken: string
    }>
  >
  handleLogin: (e: React.FormEvent) => void
  oidcProviders?: OidcProvider[]
  onOidcLogin?: (providerId: string) => void
}

export function LoginForm({
  method,
  setMethod,
  accessKeyAndSecretKey,
  setAccessKeyAndSecretKey,
  sts,
  setSts,
  handleLogin,
  oidcProviders,
  onOidcLogin,
}: LoginFormProps) {
  const { t } = useTranslation()

  return (
    <AuthShell
      eyebrow={t("Login")}
      title={t("Login")}
      description={brand.description}
      sideTitle={brand.title}
      sideDescription={brand.description}
      utilitySlot={
        <>
          <LanguageSwitcher />
          <ThemeSwitcher />
          <Link
            href="/config"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            title={t("Server Configuration")}
          >
            <RiSettings3Line className="h-4 w-4" />
          </Link>
        </>
      }
      footerSlot={
        <div className="flex items-center justify-between gap-3 px-2 text-sm text-slate-600 dark:text-white/65">
          <span>{t("Login Problems?")}</span>
          <Link href={brand.websiteUrl} className="font-medium text-blue-600 hover:underline dark:text-blue-300">
            {t("Get Help")}
          </Link>
        </div>
      }
    >
      <Tabs value={method} onValueChange={(v) => setMethod(v as LoginMethod)} className="flex flex-col gap-5">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl border border-slate-200 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/6">
          <TabsTrigger className="rounded-xl" value="accessKeyAndSecretKey">
            {t("Key Login")}
          </TabsTrigger>
          <TabsTrigger className="rounded-xl" value="sts">
            {t("STS Login")}
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleLogin} autoComplete="off" className="space-y-6">
          <div className="grid gap-y-5">
            {method === "accessKeyAndSecretKey" ? (
              <>
                <Field>
                  <FieldLabel htmlFor="accessKey">{t("Account")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="accessKey"
                      value={accessKeyAndSecretKey.accessKeyId}
                      onChange={(e) =>
                        setAccessKeyAndSecretKey((prev) => ({
                          ...prev,
                          accessKeyId: e.target.value,
                        }))
                      }
                      autoComplete="username"
                      type="text"
                      placeholder={t("Please enter account")}
                      className="h-11 rounded-xl"
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="secretKey">{t("Key")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="secretKey"
                      value={accessKeyAndSecretKey.secretAccessKey}
                      onChange={(e) =>
                        setAccessKeyAndSecretKey((prev) => ({
                          ...prev,
                          secretAccessKey: e.target.value,
                        }))
                      }
                      autoComplete="current-password"
                      type="password"
                      placeholder={t("Please enter key")}
                      className="h-11 rounded-xl"
                    />
                  </FieldContent>
                </Field>
              </>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="stsAccessKey">{t("STS Username")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="stsAccessKey"
                      value={sts.accessKeyId}
                      onChange={(e) =>
                        setSts((prev) => ({
                          ...prev,
                          accessKeyId: e.target.value,
                        }))
                      }
                      autoComplete="new-password"
                      type="text"
                      placeholder={t("Please enter STS username")}
                      className="h-11 rounded-xl"
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="stsSecretKey">{t("STS Key")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="stsSecretKey"
                      value={sts.secretAccessKey}
                      onChange={(e) =>
                        setSts((prev) => ({
                          ...prev,
                          secretAccessKey: e.target.value,
                        }))
                      }
                      autoComplete="new-password"
                      type="password"
                      placeholder={t("Please enter STS key")}
                      className="h-11 rounded-xl"
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="sessionToken">{t("STS Session Token")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="sessionToken"
                      value={sts.sessionToken}
                      onChange={(e) =>
                        setSts((prev) => ({
                          ...prev,
                          sessionToken: e.target.value,
                        }))
                      }
                      autoComplete="new-password"
                      type="text"
                      placeholder={t("Please enter STS session token")}
                      className="h-11 rounded-xl"
                    />
                  </FieldContent>
                </Field>
              </>
            )}
          </div>

          <Button type="submit" variant="default" className="h-11 w-full justify-center rounded-xl">
            {t("Login")}
          </Button>
        </form>
      </Tabs>

      {oidcProviders && oidcProviders.length > 0 && onOidcLogin && (
        <div className="space-y-3">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
            <span className="mx-3 flex-shrink text-xs text-slate-500 dark:text-white/50">{t("Or continue with")}</span>
            <div className="flex-grow border-t border-slate-200 dark:border-white/10" />
          </div>
          <div className="grid gap-2">
            {oidcProviders.map((provider) => (
              <Button
                key={provider.provider_id}
                type="button"
                variant="outline"
                className="h-11 w-full justify-center rounded-xl"
                onClick={() => onOidcLogin(provider.provider_id)}
              >
                {t("Login with {name}", { name: provider.display_name })}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  )
}
