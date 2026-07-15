"use client"

import Link from "next/link"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { RiSettings3Line } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeLogo } from "@/components/theme/logo"
import { AuthHeroStatic } from "@/components/auth/heroes/hero-static"
import { buildRoute } from "@/lib/routes"
import { getThemeManifest } from "@/lib/theme/manifest"
import { withUtm } from "@/lib/utm"

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
  const theme = getThemeManifest()
  const website = withUtm(theme.links.website ?? "https://www.rustfs.com", "login-form")

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
        <div className="hidden lg:block lg:w-1/2">
          <AuthHeroStatic />
        </div>
        <div className="relative flex w-full flex-col items-center justify-center bg-card lg:w-1/2">
          <div className="absolute end-4 top-4 z-10">
            <Link
              href="/config"
              className="inline-flex size-11 items-center justify-center border bg-background text-muted-foreground shadow-none transition-colors hover:bg-accent hover:text-accent-foreground sm:size-9"
              title={t("Server Configuration")}
              aria-label={t("Server Configuration")}
            >
              <RiSettings3Line className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="w-full max-w-sm space-y-7 p-6 sm:p-8 lg:p-10">
            <ThemeLogo width={112} height={24} className="lg:hidden" priority />
            <h1 className="sr-only">{t("Login")}</h1>

            <div className="space-y-4">
              <Tabs value={method} onValueChange={(v) => setMethod(v as LoginMethod)} className="flex flex-col gap-4">
                <TabsList className="h-11 w-full border bg-muted/60 sm:h-9">
                  <TabsTrigger className="w-1/2 text-sm sm:text-xs" value="accessKeyAndSecretKey">
                    {t("Key Login")}
                  </TabsTrigger>
                  <TabsTrigger className="w-1/2 text-sm sm:text-xs" value="sts">
                    {t("STS Login")}
                  </TabsTrigger>
                </TabsList>

                <form onSubmit={handleLogin} autoComplete="off">
                  <div className="grid gap-y-5">
                    {method === "accessKeyAndSecretKey" ? (
                      <>
                        <Field>
                          <FieldLabel htmlFor="accessKey">{t("Account")}</FieldLabel>
                          <FieldContent>
                            <Input
                              id="accessKey"
                              name="accessKey"
                              value={accessKeyAndSecretKey.accessKeyId}
                              onChange={(e) =>
                                setAccessKeyAndSecretKey((prev) => ({
                                  ...prev,
                                  accessKeyId: e.target.value,
                                }))
                              }
                              autoComplete="username"
                              type="text"
                              spellCheck={false}
                              required
                              className="h-11 text-base sm:h-8 sm:text-xs"
                              placeholder={t("Please enter account")}
                            />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="secretKey">{t("Key")}</FieldLabel>
                          <FieldContent>
                            <Input
                              id="secretKey"
                              name="secretKey"
                              value={accessKeyAndSecretKey.secretAccessKey}
                              onChange={(e) =>
                                setAccessKeyAndSecretKey((prev) => ({
                                  ...prev,
                                  secretAccessKey: e.target.value,
                                }))
                              }
                              autoComplete="current-password"
                              type="password"
                              spellCheck={false}
                              required
                              className="h-11 text-base sm:h-8 sm:text-xs"
                              placeholder={t("Please enter key")}
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
                              name="stsAccessKey"
                              value={sts.accessKeyId}
                              onChange={(e) =>
                                setSts((prev) => ({
                                  ...prev,
                                  accessKeyId: e.target.value,
                                }))
                              }
                              autoComplete="new-password"
                              type="text"
                              spellCheck={false}
                              required
                              className="h-11 text-base sm:h-8 sm:text-xs"
                              placeholder={t("Please enter STS username")}
                            />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="stsSecretKey">{t("STS Key")}</FieldLabel>
                          <FieldContent>
                            <Input
                              id="stsSecretKey"
                              name="stsSecretKey"
                              value={sts.secretAccessKey}
                              onChange={(e) =>
                                setSts((prev) => ({
                                  ...prev,
                                  secretAccessKey: e.target.value,
                                }))
                              }
                              autoComplete="new-password"
                              type="password"
                              spellCheck={false}
                              required
                              className="h-11 text-base sm:h-8 sm:text-xs"
                              placeholder={t("Please enter STS key")}
                            />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="sessionToken">{t("STS Session Token")}</FieldLabel>
                          <FieldContent>
                            <Input
                              id="sessionToken"
                              name="sessionToken"
                              value={sts.sessionToken}
                              onChange={(e) =>
                                setSts((prev) => ({
                                  ...prev,
                                  sessionToken: e.target.value,
                                }))
                              }
                              autoComplete="new-password"
                              type="text"
                              spellCheck={false}
                              required
                              className="h-11 text-base sm:h-8 sm:text-xs"
                              placeholder={t("Please enter STS session token")}
                            />
                          </FieldContent>
                        </Field>
                      </>
                    )}

                    <Button
                      type="submit"
                      variant="default"
                      className="h-11 w-full justify-center text-sm sm:h-8 sm:text-xs"
                    >
                      {t("Login")}
                    </Button>
                  </div>
                </form>
              </Tabs>
            </div>

            {oidcProviders && oidcProviders.length > 0 && onOidcLogin && (
              <div className="space-y-3">
                <div className="relative flex items-center">
                  <div className="flex-grow border-t" />
                  <span className="mx-3 flex-shrink text-xs text-muted-foreground">{t("Or continue with")}</span>
                  <div className="flex-grow border-t" />
                </div>
                <div className="grid gap-2">
                  {oidcProviders.map((provider) => (
                    <Button
                      key={provider.provider_id}
                      type="button"
                      variant="outline"
                      className="h-11 w-full justify-center text-sm sm:h-8 sm:text-xs"
                      onClick={() => onOidcLogin(provider.provider_id)}
                    >
                      {t("Login with {name}", { name: provider.display_name })}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 border-t pt-5">
              <p className="min-w-0 text-sm text-muted-foreground">
                {t("Login Problems?")}{" "}
                <Link href={website} className="text-foreground underline-offset-4 hover:underline">
                  {t("Get Help")}
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
