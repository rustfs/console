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
import { AuthHeroStatic } from "@/components/auth/heroes/hero-static"
import { buildRoute } from "@/lib/routes"
import logoImage from "@/assets/logo.svg"

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
}

export function LoginForm({
  method,
  setMethod,
  accessKeyAndSecretKey,
  setAccessKeyAndSecretKey,
  sts,
  setSts,
  handleLogin,
}: LoginFormProps) {
  const { t } = useTranslation()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-neutral-800 lg:p-20">
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
        <div className="relative flex w-full flex-col items-center justify-center bg-white dark:border-neutral-700 dark:bg-neutral-900 lg:w-1/2">
          <div className="absolute right-4 top-4 z-10">
            <Link
              href="/config"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              title={t("Server Configuration")}
            >
              <RiSettings3Line className="text-sm" />
            </Link>
          </div>

          <div className="max-w-sm w-full space-y-6 p-4 sm:p-7">
            <Image src={logoImage} alt="RustFS" width={112} height={24} className="max-w-28" />

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

            <div>
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                {t("Login Problems?")}{" "}
                <Link href="https://www.rustfs.com" className="text-blue-600 hover:underline">
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
