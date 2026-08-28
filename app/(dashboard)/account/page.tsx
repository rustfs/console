"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { RiRefreshLine, RiShieldKeyholeLine } from "@remixicon/react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { useAccount, type AccountInfo } from "@/hooks/use-account"
import { buildRoute } from "@/lib/routes"

export default function AccountPage() {
  const { t } = useTranslation()
  const { getAccountInfo } = useAccount()

  const [info, setInfo] = useState<AccountInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

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
      // A failed read must never render as an empty profile: the previous value
      // stays on screen (if any) and the failure is stated explicitly.
      setLoadError((error as Error)?.message || t("Failed to get data"))
    } finally {
      setLoading(false)
    }
  }, [getAccountInfo, t])

  useEffect(() => {
    void load()
  }, [load])

  const identityTypeLabel = (value: AccountInfo["identity_type"]) => {
    switch (value) {
      case "root":
        return t("Root credential")
      case "iam":
        return t("IAM user")
      case "sts":
        return t("Temporary session")
      case "service-account":
        return t("Service account")
    }
  }

  return (
    <Page>
      <PageHeader
        description={t("The identity you are signed in as.")}
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
            <Button
              render={
                <Link href={buildRoute("/account/security")}>
                  <RiShieldKeyholeLine className="size-4" aria-hidden />
                  <span>{t("Security")}</span>
                </Link>
              }
            />
          </>
        }
      >
        <h1>{t("Profile")}</h1>
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
        <div className="space-y-3" aria-live="polite">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-5 w-52" />
        </div>
      ) : info ? (
        <>
          {/* Passive metadata as a definition list, not a grid of cards: these
              are facts to read, not objects to select. */}
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[max-content_1fr]">
            <dt className="text-sm text-muted-foreground">{t("Username")}</dt>
            <dd className="font-mono break-all">{info.access_key}</dd>

            <dt className="text-sm text-muted-foreground">{t("Role")}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span>{info.is_admin ? t("Administrator") : t("User")}</span>
              <Badge variant="secondary">{identityTypeLabel(info.identity_type)}</Badge>
            </dd>

            <dt className="text-sm text-muted-foreground">{t("Status")}</dt>
            <dd>{info.status === "enabled" ? t("Enabled") : t("Disabled")}</dd>

            <dt className="text-sm text-muted-foreground">{t("Two-factor authentication")}</dt>
            <dd>{info.mfa.enabled ? t("On") : t("Off")}</dd>

            {info.policies.length > 0 && (
              <>
                <dt className="text-sm text-muted-foreground">{t("Policies")}</dt>
                <dd className="flex flex-wrap gap-1">
                  {info.policies.map((policy) => (
                    <Badge key={policy} variant="outline">
                      {policy}
                    </Badge>
                  ))}
                </dd>
              </>
            )}

            {info.member_of.length > 0 && (
              <>
                <dt className="text-sm text-muted-foreground">{t("Groups")}</dt>
                <dd className="flex flex-wrap gap-1">
                  {info.member_of.map((group) => (
                    <Badge key={group} variant="outline">
                      {group}
                    </Badge>
                  ))}
                </dd>
              </>
            )}

            {info.session_access_key && (
              <>
                <dt className="text-sm text-muted-foreground">{t("Session access key")}</dt>
                <dd className="font-mono text-sm break-all text-muted-foreground">{info.session_access_key}</dd>
              </>
            )}
          </dl>

          {/* Root cannot be edited here, and saying so beats a disabled control
              with no explanation. */}
          {info.credentials_source === "env" && (
            <Alert>
              <AlertDescription>
                {t(
                  "This identity is provisioned from the server environment (RUSTFS_ACCESS_KEY). Its username and password are changed by restarting the server with new values, not from the console.",
                )}
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : null}
    </Page>
  )
}
