"use client"

import * as React from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
  const hasSupportingDetail = Boolean(
    diagnostic.lastSuccessfulUpdate ||
    showLastSuccessfulUpdate ||
    diagnostic.lastError ||
    scopeParts.length ||
    diagnostic.source ||
    diagnostic.historicalStallTimeouts !== undefined ||
    diagnostic.hint ||
    troubleshooting ||
    troubleshootingHref,
  )

  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,7rem)_minmax(0,1fr)] sm:items-start sm:gap-4">
      <dt className="min-w-0 font-medium text-foreground">{label}</dt>
      <dd>
        <Badge variant={getStatusVariant(diagnostic.state)}>{getStatusLabel(diagnostic.state, t)}</Badge>
      </dd>
      <dd className="flex min-w-0 flex-col gap-1.5 text-muted-foreground">
        <p className="break-words text-foreground [overflow-wrap:anywhere]">
          {diagnostic.reason ?? getDefaultDescription(diagnostic.state, t)}
        </p>
        {hasSupportingDetail ? (
          <div className="flex flex-col gap-1 text-xs">
            {diagnostic.lastSuccessfulUpdate || showLastSuccessfulUpdate ? (
              <p>
                {t("Last successful update")}:{" "}
                {diagnostic.lastSuccessfulUpdate
                  ? formatTimestamp(diagnostic.lastSuccessfulUpdate, locale)
                  : t("Unknown")}
              </p>
            ) : null}
            {diagnostic.lastError ? (
              <p className="break-words [overflow-wrap:anywhere]">
                {t("Last error")}: {diagnostic.lastError}
              </p>
            ) : null}
            {scopeParts.length ? (
              <p className="break-words [overflow-wrap:anywhere]">{scopeParts.join(" · ")}</p>
            ) : null}
            {diagnostic.source ? (
              <p className="break-words [overflow-wrap:anywhere]">
                {t("Source")}: <code>{diagnostic.source}</code>
              </p>
            ) : null}
            {diagnostic.historicalStallTimeouts !== undefined ? (
              <>
                <p className="text-foreground">
                  {t("Historical internode stall timeouts")}: {diagnostic.historicalStallTimeouts}
                </p>
                <p>
                  {t(
                    "This lifetime counter has no sampling window and does not indicate current degradation by itself.",
                  )}
                </p>
              </>
            ) : null}
            {diagnostic.hint ? (
              <p className="break-words [overflow-wrap:anywhere]">
                {t("Backend guidance")}: {diagnostic.hint}
              </p>
            ) : null}
            {troubleshooting ? (
              <p className="text-foreground">
                {t("Troubleshooting")}: {troubleshooting}
              </p>
            ) : null}
            {troubleshootingHref ? (
              <a
                className="w-fit font-medium text-foreground underline underline-offset-4"
                href={troubleshootingHref}
                target="_blank"
                rel="noreferrer"
              >
                {t("Open the real multi-node metrics verification guide")}
              </a>
            ) : null}
          </div>
        ) : null}
      </dd>
    </div>
  )
}

function PerformanceStatusSourcesContent({
  diagnostics,
  usageFreshness,
  t,
  locale,
}: {
  diagnostics: ClusterDiagnostics
  usageFreshness?: StatusDiagnostic
  t: Translate
  locale?: string
}) {
  const rows = [
    { label: t("Peer Health"), diagnostic: diagnostics.peerHealth },
    { label: t("Storage Readiness"), diagnostic: diagnostics.storageReadiness },
    {
      label: t("Usage Freshness"),
      diagnostic: usageFreshness ?? diagnostics.usageFreshness,
      showLastSuccessfulUpdate: true,
    },
    {
      label: t("Listing and Metacache"),
      diagnostic: diagnostics.listingHealth,
      troubleshooting: t(
        "Correlate time-windowed walk_dir metrics and metacache logs before treating listing symptoms as a disk failure.",
      ),
      troubleshootingHref: "https://docs.rustfs.com/operations/monitoring",
    },
    { label: t("Workload Admission"), diagnostic: diagnostics.workloadAdmission },
  ]
  const hasAttention = rows.some(({ diagnostic }) => ["degraded", "stale", "unknown"].includes(diagnostic.state))
  const reportedRows = rows.filter(({ diagnostic }) => diagnostic.state !== "not_reported")
  const attentionCount = rows.filter(({ diagnostic }) =>
    ["degraded", "stale", "unknown"].includes(diagnostic.state),
  ).length
  const [open, setOpen] = React.useState(hasAttention)
  const previousHasAttention = React.useRef(hasAttention)

  React.useEffect(() => {
    if (hasAttention && !previousHasAttention.current) setOpen(true)
    previousHasAttention.current = hasAttention
  }, [hasAttention])

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/diagnostics">
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-4 py-4">
          <div className="min-w-0">
            <h2 id="diagnostic-details-title" className="text-base font-semibold">
              {t("Diagnostic Details")}
            </h2>
            <CardDescription>
              {hasAttention
                ? `${attentionCount} ${t("Diagnostic items need confirmation")}`
                : reportedRows.length
                  ? t("All reported diagnostics are healthy.")
                  : t("No diagnostic sources were reported by the server.")}
            </CardDescription>
          </div>
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 self-start sm:min-h-0"
                aria-controls="diagnostic-details-content"
              >
                <span className="group-data-[state=open]/diagnostics:hidden">{t("Expand")}</span>
                <span className="hidden group-data-[state=open]/diagnostics:inline">{t("Collapse")}</span>
                <RiArrowDownSLine
                  data-icon="inline-end"
                  className="transition-transform duration-200 group-data-[state=open]/diagnostics:rotate-180"
                  aria-hidden
                />
              </Button>
            }
          />
        </CardHeader>
        <CollapsibleContent id="diagnostic-details-content">
          <Separator />
          <CardContent className="py-1">
            <dl aria-labelledby="diagnostic-details-title">
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
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
  if (!diagnostics) return null

  return (
    <PerformanceStatusSourcesContent diagnostics={diagnostics} usageFreshness={usageFreshness} t={t} locale={locale} />
  )
}
