"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { RiArrowRightLine, RiRefreshLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/data-table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useDataTable } from "@/hooks/use-data-table"
import { useMrfSummary } from "@/hooks/use-recovery"
import { formatDateTime } from "@/lib/functions"
import type { MrfNodeObservation } from "@/types/recovery"
import { ObservationCoverage, RecoveryFailure } from "./status"

export function RecoverySummary({ enabled }: { enabled: boolean }) {
  const { t, i18n } = useTranslation()
  const summary = useMrfSummary({ enabled })
  const samples =
    summary.data?.nodes.flatMap((node) =>
      node.state === "ok" && node.reply?.result === "summary" && node.reply.summary.checkpointReadable
        ? [node.reply.summary]
        : [],
    ) ?? []
  const number = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(value)
  const counters = samples.length
    ? [
        samples.reduce((n, sample) => n + sample.activeResponsibilityCount, 0),
        samples.reduce(
          (n, sample) =>
            n +
            sample.heldCount +
            sample.legacyGenerationUnknownCount +
            sample.bucketIncarnationChangedCount +
            sample.operatorAcceptedCount,
          0,
        ),
        samples.reduce((n, sample) => n + sample.operatorAcceptedCount, 0),
        samples.reduce((n, sample) => n + sample.bestEffortQueueDepth, 0),
      ]
    : null
  const labels = [
    "Active responsibilities",
    "Unverified responsibilities",
    "Including accepted risk",
    "Best-effort queue",
  ]
  const nodes = useMemo(() => summary.data?.nodes ?? [], [summary.data])
  const columns = useMemo<ColumnDef<MrfNodeObservation>[]>(
    () => [
      {
        accessorKey: "host",
        header: t("Node"),
        cell: ({ row }) => <span className="block max-w-sm whitespace-normal break-all">{row.original.host}</span>,
      },
      {
        id: "coverage",
        header: t("Observation"),
        cell: ({ row }) => (
          <Badge variant="outline">
            {t(
              row.original.reply?.result === "summary" && !row.original.reply.summary.checkpointReadable
                ? "Checkpoint unreadable"
                : row.original.state === "ok"
                  ? "Observed"
                  : "Unavailable",
            )}
          </Badge>
        ),
      },
      {
        id: "sample",
        header: t("Sampled at"),
        cell: ({ row }) =>
          row.original.reply?.result === "summary"
            ? formatDateTime(row.original.reply.summary.sampledAtMs, t("Unknown"))
            : t("Unknown"),
      },
      {
        id: "reason",
        header: t("Details"),
        cell: ({ row }) => (
          <span className="block max-w-sm whitespace-normal break-all font-mono text-xs">
            {row.original.reply?.result === "error"
              ? row.original.reply.code
              : row.original.state === "ok"
                ? "—"
                : row.original.state}
          </span>
        ),
      },
    ],
    [t],
  )
  const { table } = useDataTable({ data: nodes, columns, disablePagination: true })

  if (!enabled)
    return (
      <Alert>
        <AlertDescription>{t("MRF observations and actions require the Heal permission.")}</AlertDescription>
      </Alert>
    )
  return (
    <section aria-labelledby="recovery-overview-title" className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="recovery-overview-title" className="text-lg font-semibold">
          {t("Responsibility overview")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void summary.load()}
            disabled={summary.loading}
            className="min-h-11 sm:min-h-0"
          >
            {summary.loading ? <Spinner data-icon="inline-start" /> : <RiRefreshLine data-icon="inline-start" />}
            {t(summary.cursor ? "Restart observation" : "Refresh")}
          </Button>
          {summary.data?.nextCursor && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void summary.load(summary.data?.nextCursor ?? undefined)}
              disabled={summary.loading}
              className="min-h-11 sm:min-h-0"
            >
              {t("Next node page")}
              <RiArrowRightLine data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("Counters describe the sampled nodes on this page. An idle queue does not establish data integrity.")}
      </p>
      {summary.error && <RecoveryFailure error={summary.error} onRetry={() => void summary.refresh()} />}
      {summary.stale && summary.data && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("Previous observation · may be stale")}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4" aria-busy={summary.loading}>
        {labels.map((label, index) => (
          <div key={label} className="flex flex-col gap-2">
            <dt className="text-xs text-muted-foreground">{t(label)}</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {summary.loading && !summary.data ? (
                <Skeleton className="h-8 w-20" />
              ) : counters ? (
                number(counters[index])
              ) : (
                t("Unknown")
              )}
            </dd>
          </div>
        ))}
      </dl>
      {summary.data && (
        <>
          <ObservationCoverage data={summary.data} />
          <details className="min-w-0">
            <summary className="cursor-pointer py-2 text-sm font-medium focus-visible:outline-ring">
              {t("Node observations and sampling times")}
            </summary>
            <DataTable table={table} caption={t("Node observations and sampling times")} className="mt-3" />
          </details>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {t(
          "The visible summary refreshes every 15 seconds, with backoff after failures. Hidden pages pause reads; details load only on request.",
        )}
      </p>
    </section>
  )
}
