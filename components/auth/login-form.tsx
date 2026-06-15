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
  const website = theme.links.website ?? "https://www.rustfs.com"

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
        <div className="relative flex w-full flex-col items-center justify-center bg-card lg:w-1/2">
          <div className="absolute end-4 top-4 z-10">
            <Link
              href="/config"
              className="inline-flex h-8 w-8 items-center justify-center border bg-background text-muted-foreground shadow-none transition-colors hover:bg-accent hover:text-accent-foreground"
              title={t("Server Configuration")}
              aria-label={t("Server Configuration")}
            >
              <RiSettings3Line className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="max-w-sm w-full space-y-6 p-4 sm:p-7">
            <ThemeLogo width={112} height={24} priority />

            <div className="space-y-4">
              <Tabs value={method} onValueChange={(v) => setMethod(v as LoginMethod)} className="flex flex-col gap-4">
                <TabsList className="w-full">
                  <TabsTrigger className="w-1/2" value="accessKeyAndSecretKey">
                    {t("Key Login")}
                  </TabsTrigger>
                  <TabsTrigger className="w-1/2" value="sts">
                    {t("STS Login")}
                  </TabsTrigger>
                </TabsList>

                <form onSubmit={handleLogin} autoComplete="off">
                  <div className="grid gap-y-6">
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
                              placeholder={t("Please enter STS session token")}
                            />
                          </FieldContent>
                        </Field>
                      </>
                    )}

                    <Button type="submit" variant="default" className="w-full justify-center">
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
                      className="w-full justify-center"
                      onClick={() => onOidcLogin(provider.provider_id)}
                    >
                      {t("Login with {name}", { name: provider.display_name })}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">
                {t("Login Problems?")}{" "}
                <Link href={website} className="text-foreground underline-offset-4 hover:underline">
                  {t("Get Help")}
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
