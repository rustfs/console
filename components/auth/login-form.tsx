"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { RiEyeLine, RiEyeOffLine, RiSettings3Line } from "@remixicon/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"
import { TOTP_CODE_LENGTH } from "@/lib/mfa"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeLogo } from "@/components/theme/logo"
import { AuthHeroStatic } from "@/components/auth/heroes/hero-static"
import { getThemeManifest } from "@/lib/theme/manifest"
import { withUtm } from "@/lib/utm"

import type { OidcProvider } from "@/types/config"

export type LoginMethod = "accessKeyAndSecretKey" | "sts"

/** The second-factor step of the login flow, when the server demands one. */
export interface SecondFactorStep {
  code: string
  setCode: (code: string) => void
  error: string
  submitting: boolean
  onSubmit: (event: React.FormEvent) => void
  onCancel: () => void
  /** The identity being authenticated, so the user knows which account this is. */
  accountName: string
}

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
  submitting?: boolean
  handleLogin: (e: React.FormEvent) => void
  oidcProviders?: OidcProvider[]
  onOidcLogin?: (providerId: string) => void
  /** Present only while the server is waiting for a second factor. */
  secondFactor?: SecondFactorStep
}

type SecretKeyInputProps = Omit<React.ComponentProps<typeof InputGroupInput>, "className" | "type">

function SecretKeyInput({ id, ...props }: SecretKeyInputProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const visibilityLabel = visible ? t("Hide key") : t("Show key")

  return (
    <InputGroup className="h-11 sm:h-10">
      <InputGroupInput
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        className="h-11 text-base sm:h-10 sm:text-sm"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          size="icon-sm"
          aria-label={visibilityLabel}
          aria-controls={id}
          title={visibilityLabel}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <RiEyeOffLine aria-hidden /> : <RiEyeLine aria-hidden />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

export function LoginForm({
  method,
  setMethod,
  accessKeyAndSecretKey,
  setAccessKeyAndSecretKey,
  sts,
  setSts,
  handleLogin,
  submitting = false,
  oidcProviders,
  onOidcLogin,
  secondFactor,
}: LoginFormProps) {
  const { t } = useTranslation()
  const [secondFactorMethod, setSecondFactorMethod] = useState<"totp" | "recovery">("totp")
  const theme = getThemeManifest()
  const website = withUtm(theme.links.website ?? "https://www.rustfs.com", "login-form")

  return (
    <div className="auth-shell min-h-dvh bg-background">
      <div className="grid min-h-dvh w-full lg:grid-cols-[1.05fr_1fr]">
        <div className="hidden lg:block">
          <AuthHeroStatic />
        </div>
        <div className="relative flex min-h-dvh w-full flex-col items-center justify-center bg-background px-4 py-20 sm:px-8">
          <div className="absolute end-4 top-4 z-10">
            <Link
              href="/config"
              className="inline-flex size-11 items-center justify-center border bg-background text-muted-foreground shadow-none transition-colors hover:bg-accent hover:text-accent-foreground sm:size-10"
              title={t("Server Configuration")}
              aria-label={t("Server Configuration")}
            >
              <RiSettings3Line className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="w-full max-w-sm space-y-8">
            <ThemeLogo width={112} height={24} className="lg:hidden" priority />
            <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight">{t("Login")}</h1>

            {secondFactor ? (
              // A separate step, not an extra field: the password has already
              // been accepted, and mixing the two would invite the user to
              // re-enter credentials that are no longer in question.
              <form className="space-y-5" onSubmit={secondFactor.onSubmit} autoComplete="off">
                <div className="space-y-1">
                  <h2 className="font-heading font-semibold tracking-tight">{t("Two-factor authentication")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("Enter the code from your authenticator app for {account}.", {
                      account: secondFactor.accountName,
                    })}
                  </p>
                </div>

                <Field>
                  <FieldLabel htmlFor="login-mfa-code">{t("Authentication code")}</FieldLabel>
                  <FieldContent>
                    <InputOTP
                      id="login-mfa-code"
                      maxLength={TOTP_CODE_LENGTH}
                      value={secondFactorMethod === "totp" ? secondFactor.code : ""}
                      onChange={(code) => {
                        setSecondFactorMethod("totp")
                        secondFactor.setCode(code)
                      }}
                      disabled={secondFactor.submitting}
                      autoFocus
                      dir="ltr"
                      aria-invalid={Boolean(secondFactor.error)}
                      aria-describedby={secondFactor.error ? "login-mfa-code-error" : undefined}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: TOTP_CODE_LENGTH }, (_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </FieldContent>
                  <FieldError id="login-mfa-code-error">{secondFactor.error}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="login-mfa-recovery">{t("Or use a recovery code")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="login-mfa-recovery"
                      name="recoveryCode"
                      value={secondFactorMethod === "recovery" ? secondFactor.code : ""}
                      onChange={(e) => {
                        setSecondFactorMethod("recovery")
                        secondFactor.setCode(e.target.value)
                      }}
                      autoComplete="one-time-code"
                      spellCheck={false}
                      dir="ltr"
                      disabled={secondFactor.submitting}
                      className="h-11 font-mono text-base sm:h-10 sm:text-sm"
                      placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                    />
                  </FieldContent>
                </Field>

                <div className="grid gap-2">
                  <Button
                    type="submit"
                    className="h-11 w-full justify-center text-sm sm:h-10 sm:text-sm"
                    disabled={secondFactor.submitting}
                  >
                    {secondFactor.submitting ? <Spinner className="size-4" /> : null}
                    <span>{t("Verify")}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 w-full justify-center text-sm sm:h-10 sm:text-sm"
                    onClick={secondFactor.onCancel}
                    disabled={secondFactor.submitting}
                  >
                    {t("Back")}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <Tabs value={method} onValueChange={(v) => setMethod(v as LoginMethod)} className="flex flex-col gap-4">
                  <TabsList className="h-11 w-full border bg-muted sm:h-10">
                    <TabsTrigger className="w-1/2 text-sm" disabled={submitting} value="accessKeyAndSecretKey">
                      {t("Key Login")}
                    </TabsTrigger>
                    <TabsTrigger className="w-1/2 text-sm" disabled={submitting} value="sts">
                      {t("STS Login")}
                    </TabsTrigger>
                  </TabsList>

                  <form onSubmit={handleLogin} autoComplete="off" aria-busy={submitting}>
                    <fieldset disabled={submitting} className="grid min-w-0 gap-y-5">
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
                                className="h-11 text-base sm:h-10 sm:text-sm"
                                placeholder={t("Please enter account")}
                              />
                            </FieldContent>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="secretKey">{t("Key")}</FieldLabel>
                            <FieldContent>
                              <SecretKeyInput
                                key="access-key-secret"
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
                                spellCheck={false}
                                required
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
                                className="h-11 text-base sm:h-10 sm:text-sm"
                                placeholder={t("Please enter STS username")}
                              />
                            </FieldContent>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="stsSecretKey">{t("STS Key")}</FieldLabel>
                            <FieldContent>
                              <SecretKeyInput
                                key="sts-secret"
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
                                spellCheck={false}
                                required
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
                                className="h-11 text-base sm:h-10 sm:text-sm"
                                placeholder={t("Please enter STS session token")}
                              />
                            </FieldContent>
                          </Field>
                        </>
                      )}

                      <Button
                        type="submit"
                        variant="default"
                        className="h-11 w-full justify-center text-sm sm:h-10 sm:text-sm"
                      >
                        {submitting ? <Spinner className="size-4" /> : null}
                        {t("Login")}
                      </Button>
                    </fieldset>
                  </form>
                </Tabs>
              </div>
            )}

            {!secondFactor && oidcProviders && oidcProviders.length > 0 && onOidcLogin && (
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
                      className="h-11 w-full justify-center text-sm sm:h-10 sm:text-sm"
                      disabled={submitting}
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
                <Link href={website} className="text-link underline-offset-4 hover:underline">
                  {t("Get Help")}
                </Link>
              </p>
              <div className="flex shrink-0 items-center gap-1">
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
