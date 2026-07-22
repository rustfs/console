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
  if (state === "not_reported") return t("Not reported")
  return t("Unknown")
}

function getStatusVariant(state: OperationalStatus): "secondary" | "destructive" | "default" | "outline" | "ghost" {
  if (state === "healthy") return "secondary"
  if (state === "degraded") return "destructive"
  if (state === "stale") return "default"
  if (state === "not_reported") return "ghost"
  return "outline"
}

function getDefaultDescription(state: OperationalStatus, t: Translate) {
  if (state === "healthy") return t("No issue was reported by this source.")
  if (state === "degraded") return t("This status source requires attention.")
  if (state === "stale") return t("Previously reported data may be out of date.")
  if (state === "not_reported") return t("This status source was not reported by the server.")
  return t("The server reported this status source with an unknown condition.")
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
  troubleshootingHref,
  showLastSuccessfulUpdate,
  t,
  locale,
}: {
  label: string
  diagnostic: StatusDiagnostic
  troubleshooting?: string
  troubleshootingHref?: string
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
        {diagnostic.historicalStallTimeouts !== undefined ? (
          <div className="space-y-1 text-xs">
            <p className="text-foreground">
              {t("Historical internode stall timeouts")}: {diagnostic.historicalStallTimeouts}
            </p>
            <p>
              {t("This lifetime counter has no sampling window and does not indicate current degradation by itself.")}
            </p>
          </div>
        ) : null}
        {diagnostic.hint ? (
          <p className="break-words text-xs [overflow-wrap:anywhere]">
            {t("Backend guidance")}: {diagnostic.hint}
          </p>
        ) : null}
        {troubleshooting ? (
          <p className="text-xs text-foreground">
            {t("Troubleshooting")}: {troubleshooting}
          </p>
        ) : null}
        {troubleshootingHref ? (
          <a
            className="w-fit text-xs font-medium text-foreground underline underline-offset-4"
            href={troubleshootingHref}
            target="_blank"
            rel="noreferrer"
          >
            {t("Open the real multi-node metrics verification guide")}
          </a>
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
  diagnostics?: ClusterDiagnostics
  usageFreshness?: StatusDiagnostic
  t: Translate
  locale?: string
}) {
  const notReported: StatusDiagnostic = { state: "not_reported" }
  const peerHealth = diagnostics?.peerHealth ?? notReported
  const storageReadiness = diagnostics?.storageReadiness ?? notReported
  const resolvedUsageFreshness = usageFreshness ?? diagnostics?.usageFreshness ?? notReported
  const listingHealth = diagnostics?.listingHealth ?? notReported
  const workloadAdmission = diagnostics?.workloadAdmission ?? notReported
  const rows = [
    { label: t("Peer Health"), diagnostic: peerHealth },
    { label: t("Storage Readiness"), diagnostic: storageReadiness },
    { label: t("Usage Freshness"), diagnostic: resolvedUsageFreshness, showLastSuccessfulUpdate: true },
    {
      label: t("Listing and Metacache"),
      diagnostic: listingHealth,
      troubleshooting: t(
        "Correlate time-windowed walk_dir metrics and metacache logs before treating listing symptoms as a disk failure.",
      ),
      troubleshootingHref: "https://github.com/rustfs/backlog/issues/1392#issuecomment-5040442761",
    },
    { label: t("Workload Admission"), diagnostic: workloadAdmission },
  ]

  return (
    <Card className="shadow-none">
      <CardHeader>
        <h2 id="status-sources-title" className="text-base font-semibold">
          {t("Status Sources")}
        </h2>
        <CardDescription>
          {t("Review peer, storage, usage, listing, and workload admission health independently.")}
        </CardDescription>
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
                troubleshootingHref={row.troubleshootingHref}
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
