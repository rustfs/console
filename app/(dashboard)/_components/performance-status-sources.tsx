"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { ClusterDiagnostics, OperationalStatus, StatusDiagnostic } from "@/lib/performance-data"

type Translate = (key: string) => string

function getStatusLabel(state: OperationalStatus, t: Translate) {
  if (state === "healthy") return t("Healthy")
  if (state === "degraded") return t("Degraded")
  if (state === "stale") return t("Stale")
  return t("Unknown")
}

function getStatusVariant(state: OperationalStatus): "secondary" | "destructive" | "default" | "outline" {
  if (state === "healthy") return "secondary"
  if (state === "degraded") return "destructive"
  if (state === "stale") return "default"
  return "outline"
}

function getDefaultDescription(state: OperationalStatus, t: Translate) {
  if (state === "healthy") return t("No issue was reported by this source.")
  if (state === "degraded") return t("This status source requires attention.")
  if (state === "stale") return t("Previously reported data may be out of date.")
  return t("This status source was not reported by the server.")
}

function formatTimestamp(value: string, locale: string | undefined) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return value
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" }).format(timestamp)
}

function DiagnosticRow({
  label,
  diagnostic,
  troubleshooting,
  showLastSuccessfulUpdate,
  t,
  locale,
}: {
  label: string
  diagnostic: StatusDiagnostic
  troubleshooting?: string
  showLastSuccessfulUpdate?: boolean
  t: Translate
  locale?: string
}) {
  const scope = diagnostic.scope
  const scopeParts = [
    scope?.bucket ? `${t("Bucket")}: ${scope.bucket}` : undefined,
    scope?.prefix ? `${t("Prefix")}: ${scope.prefix}` : undefined,
    scope?.set ? `${t("Set")}: ${scope.set}` : undefined,
    scope?.timeout ? `${t("Timeout")}: ${scope.timeout}` : undefined,
  ].filter(Boolean)

  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6">
      <dt className="flex min-w-0 items-center justify-between gap-3 sm:flex-col sm:items-start sm:justify-start">
        <span className="font-medium text-foreground">{label}</span>
        <Badge variant={getStatusVariant(diagnostic.state)}>{getStatusLabel(diagnostic.state, t)}</Badge>
      </dt>
      <dd className="flex min-w-0 flex-col gap-2 text-muted-foreground">
        <p className="break-words text-foreground [overflow-wrap:anywhere]">
          {diagnostic.reason ?? getDefaultDescription(diagnostic.state, t)}
        </p>
        {diagnostic.lastSuccessfulUpdate || showLastSuccessfulUpdate ? (
          <p className="text-xs">
            {t("Last successful update")}:{" "}
            {diagnostic.lastSuccessfulUpdate ? formatTimestamp(diagnostic.lastSuccessfulUpdate, locale) : t("Unknown")}
          </p>
        ) : null}
        {diagnostic.lastError ? (
          <p className="break-words text-xs [overflow-wrap:anywhere]">
            {t("Last error")}: {diagnostic.lastError}
          </p>
        ) : null}
        {scopeParts.length ? (
          <p className="break-words text-xs [overflow-wrap:anywhere]">{scopeParts.join(" · ")}</p>
        ) : null}
        {diagnostic.source ? (
          <p className="break-words text-xs [overflow-wrap:anywhere]">
            {t("Source")}: {diagnostic.source}
          </p>
        ) : null}
        {troubleshooting ? (
          <p className="text-xs text-foreground">
            {t("Troubleshooting")}: {troubleshooting}
          </p>
        ) : null}
      </dd>
    </div>
  )
}

export function PerformanceStatusSources({
  diagnostics,
  usageFreshness,
  t,
  locale,
}: {
  diagnostics: ClusterDiagnostics
  usageFreshness: StatusDiagnostic
  t: Translate
  locale?: string
}) {
  const listingNeedsTimeoutGuidance =
    diagnostics.listingHealth.state === "degraded" &&
    Boolean(
      diagnostics.listingHealth.scope?.timeout ||
      `${diagnostics.listingHealth.reason ?? ""} ${diagnostics.listingHealth.lastError ?? ""}`.match(
        /timeout|latency/i,
      ),
    )
  const rows = [
    { label: t("Peer Health"), diagnostic: diagnostics.peerHealth },
    { label: t("Storage Readiness"), diagnostic: diagnostics.storageReadiness },
    { label: t("Usage Freshness"), diagnostic: usageFreshness, showLastSuccessfulUpdate: true },
    {
      label: t("Listing and Metacache"),
      diagnostic: diagnostics.listingHealth,
      troubleshooting: listingNeedsTimeoutGuidance
        ? t("Check listing timeout and storage latency before treating this as a disk failure.")
        : undefined,
    },
  ]

  return (
    <Card className="shadow-none">
      <CardHeader>
        <h2 id="status-sources-title" className="text-base font-semibold">
          {t("Status Sources")}
        </h2>
        <CardDescription>{t("Review peer, storage, usage, and listing health independently.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl aria-labelledby="status-sources-title">
          {rows.map((row, index) => (
            <React.Fragment key={row.label}>
              {index ? <Separator /> : null}
              <DiagnosticRow
                label={row.label}
                diagnostic={row.diagnostic}
                troubleshooting={row.troubleshooting}
                showLastSuccessfulUpdate={row.showLastSuccessfulUpdate}
                t={t}
                locale={locale}
              />
            </React.Fragment>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
