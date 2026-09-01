"use client"

import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { RiArrowLeftLine, RiRefreshLine } from "@remixicon/react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { ChangePasswordDialog } from "@/components/account/change-password-dialog"
import { MfaDisableDialog } from "@/components/account/mfa-disable-dialog"
import { MfaRecoveryCodesDialog } from "@/components/account/mfa-recovery-codes-dialog"
import { MfaSetupDialog } from "@/components/account/mfa-setup-dialog"
import { useAccount, type AccountInfo } from "@/hooks/use-account"
import { recoveryCodesRunningLow } from "@/lib/mfa"
import { buildRoute } from "@/lib/routes"
import { formatDateTime } from "@/lib/functions"

export default function AccountSecurityPage() {
  const { t } = useTranslation()
  const { getAccountInfo } = useAccount()

  const [info, setInfo] = useState<AccountInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const result = await getAccountInfo()
      if (!result) {
        setLoadError(t("API not ready"))
        return
      }
      setInfo(result)
    } catch (error) {
      setLoadError((error as Error)?.message || t("Failed to get data"))
    } finally {
      setLoading(false)
    }
  }, [getAccountInfo, t])

  useEffect(() => {
    void load()
  }, [load])

  const mfa = info?.mfa
  const canManagePassword = info?.mutable.password ?? false
  // Enrollment needs both a mutable credential and server-side at-rest
  // protection for the shared secret; the server reports why when it refuses.
  const canManageMfa = mfa?.enrollment_available ?? false

  return (
    <Page>
      <PageHeader
        description={t("Password and two-factor authentication for your account.")}
        actions={
          <>
            <Button
              variant="outline"
              render={
                <Link href={buildRoute("/account")}>
                  <RiArrowLeftLine className="size-4" aria-hidden />
                  <span>{t("Profile")}</span>
                </Link>
              }
            />
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <h1>{t("Security")}</h1>
      </PageHeader>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              {t("Retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && !info ? (
        <div className="space-y-6" aria-live="polite">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : info ? (
        <div className="divide-y">
          {/* Peer sections separated by one divider system, no nested frames. */}
          <section className="space-y-3 pb-6" aria-labelledby="security-password-heading">
            <div>
              <h2 id="security-password-heading" className="font-heading font-semibold tracking-tight">
                {t("Password")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {canManagePassword
                  ? t("Change your password. This is also your S3 secret key.")
                  : t("This identity's password is managed outside the console.")}
              </p>
            </div>
            {canManagePassword ? (
              <Button onClick={() => setPasswordOpen(true)}>{t("Change Password")}</Button>
            ) : (
              <Alert>
                <AlertDescription>
                  {info.credentials_source === "env"
                    ? t(
                        "This identity is provisioned from the server environment (RUSTFS_ACCESS_KEY). Change it by restarting the server with new values.",
                      )
                    : t("This identity's password is managed outside the console.")}
                </AlertDescription>
              </Alert>
            )}
          </section>

          <section className="space-y-3 py-6" aria-labelledby="security-mfa-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="security-mfa-heading" className="font-heading font-semibold tracking-tight">
                  {t("Two-factor authentication")}
                </h2>
                <p className="text-sm text-muted-foreground">{t("Protect your account with an authenticator app")}</p>
              </div>
              <Badge variant={mfa?.enabled ? "default" : "secondary"}>{mfa?.enabled ? t("On") : t("Off")}</Badge>
            </div>

            {mfa?.enabled ? (
              <>
                <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
                  {mfa.activated_at && (
                    <>
                      <dt className="text-muted-foreground">{t("Enabled on")}</dt>
                      <dd>{formatDateTime(mfa.activated_at)}</dd>
                    </>
                  )}
                  {mfa.last_verified_at && (
                    <>
                      <dt className="text-muted-foreground">{t("Last used")}</dt>
                      <dd>{formatDateTime(mfa.last_verified_at)}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">{t("Recovery codes remaining")}</dt>
                  <dd>{mfa.recovery_codes_remaining}</dd>
                </dl>

                {mfa.recovery_codes_remaining === 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {t(
                        "You have no recovery codes left. Generate a new set so you can get back in if you lose your authenticator.",
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                {recoveryCodesRunningLow(mfa.recovery_codes_remaining) && (
                  <Alert>
                    <AlertDescription>
                      {t("You are running low on recovery codes. Generate a new set to be safe.")}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setRecoveryOpen(true)} disabled={!canManageMfa}>
                    {t("Generate new recovery codes")}
                  </Button>
                  <Button variant="outline" onClick={() => setSetupOpen(true)} disabled={!canManageMfa}>
                    {t("Reconfigure authenticator")}
                  </Button>
                  <Button variant="destructive" onClick={() => setDisableOpen(true)} disabled={!canManageMfa}>
                    {t("Turn off")}
                  </Button>
                </div>
                {mfa.pending && (
                  <p className="text-sm text-muted-foreground">
                    {t("A new authenticator is waiting to be confirmed. Your current one keeps working until then.")}
                  </p>
                )}
              </>
            ) : (
              <>
                {/* An unavailable feature explains itself instead of showing a
                    dead button. */}
                {!canManageMfa && mfa?.enrollment_blocked_reason && (
                  <Alert>
                    <AlertDescription>{mfa.enrollment_blocked_reason}</AlertDescription>
                  </Alert>
                )}
                <Button onClick={() => setSetupOpen(true)} disabled={!canManageMfa}>
                  {t("Enable 2FA")}
                </Button>
              </>
            )}
          </section>
        </div>
      ) : null}

      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} onChanged={() => void load()} />
      <MfaSetupDialog open={setupOpen} onOpenChange={setSetupOpen} onCompleted={() => void load()} />
      <MfaDisableDialog
        open={disableOpen}
        onOpenChange={setDisableOpen}
        accessKey={info?.access_key ?? ""}
        onDisabled={() => void load()}
      />
      <MfaRecoveryCodesDialog open={recoveryOpen} onOpenChange={setRecoveryOpen} onRegenerated={() => void load()} />
    </Page>
  )
}
