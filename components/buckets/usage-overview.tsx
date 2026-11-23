"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { summarizeBucketUsage } from "@/lib/account-bucket-usage"
import { formatInteger, niceBytes } from "@/lib/functions"

export function BucketUsageOverview({
  names,
  usage,
  unavailable,
  usageAvailable = true,
  usageLoading = false,
}: {
  names: string[]
  usage: Map<string, { objectsCount: number; sizeBytes: number } | null>
  usageLoading?: boolean
  usageAvailable?: boolean
  unavailable: boolean
}) {
  const { t, i18n } = useTranslation()
  const summary = !unavailable && usageAvailable ? summarizeBucketUsage(names, usage) : undefined
  const hasValues = summary && (summary.measuredBuckets > 0 || names.length === 0)
  const measurementReported = summary && (names.length === 0 || names.some((name) => usage.has(name)))
  const statisticsState = usageLoading
    ? t("Loading…")
    : measurementReported
      ? t("Statistics pending")
      : t("Statistics unavailable")
  const coverage = measurementReported
    ? `${t("Measured buckets")} · ${formatInteger(summary.measuredBuckets)} / ${formatInteger(names.length)}`
    : usageLoading
      ? t("Loading…")
      : t("Usage unavailable")
  const distribution =
    summary && summary.measuredBuckets === names.length && summary.sizeBytes !== undefined && summary.sizeBytes > 0
      ? names
          .map((name) => ({ name, size: usage.get(name)!.sizeBytes }))
          .filter((bucket) => bucket.size > 0)
          .sort((a, b) => b.size - a.size)
      : []
  const segments = distribution.slice(0, 4).map(({ name, size }, index) => ({
    name,
    size,
    color: ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"][index],
    href: `/browser?bucket=${encodeURIComponent(name)}` as string | undefined,
  }))
  if (distribution.length > 4) {
    segments.push({
      name: t("Other buckets"),
      size: distribution.slice(4).reduce((total, bucket) => total + bucket.size, 0),
      color: "bg-muted-foreground",
      href: undefined,
    })
  }
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 1 })
  const share = (size: number) => {
    const ratio = size / summary!.sizeBytes!
    if (ratio < 0.001) return `<${percent.format(0.001)}`
    if (ratio > 0.999 && ratio < 1) return `>${percent.format(0.999)}`
    return percent.format(ratio)
  }

  return (
    <section
      className="bucket-overview grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end"
      aria-label={t("Storage Usage Statistics")}
    >
      <div className="min-w-0">
        <div className="grid grid-cols-2 items-end gap-5 sm:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)]">
          {hasValues ? (
            <dl className="col-span-2 grid grid-cols-2 items-end gap-5 sm:col-span-1 sm:grid-cols-[1.6fr_1fr]">
              {summary.sizeBytes !== undefined && (
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{t("Measured size")}</dt>
                  <dd className="mt-2 break-words font-heading text-4xl font-semibold tracking-tight tabular-nums lg:text-5xl">
                    {niceBytes(String(summary.sizeBytes))}
                  </dd>
                </div>
              )}
              {summary.objectsCount !== undefined && (
                <div>
                  <dt className="text-xs text-muted-foreground">{t("Measured objects")}</dt>
                  <dd className="mt-2 font-heading text-2xl font-medium tabular-nums">
                    {formatInteger(summary.objectsCount)}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="col-span-2 text-lg font-medium sm:col-span-1" role="status">
              {statisticsState}
            </p>
          )}
          {!unavailable && (
            <dl>
              <dt className="text-xs text-muted-foreground">{t("Visible buckets")}</dt>
              <dd className="mt-2 font-heading text-2xl font-medium tabular-nums">{formatInteger(names.length)}</dd>
            </dl>
          )}
        </div>
        {hasValues && (
          <p className="mt-3 text-xs text-muted-foreground" role="status">
            {coverage}
          </p>
        )}
      </div>
      {segments.length ? (
        <div className="min-w-0 space-y-3">
          <h2 className="text-xs text-muted-foreground">{t("Bucket size distribution")}</h2>
          <div className="flex h-3 gap-0.5 overflow-hidden" aria-hidden="true">
            {segments.map(({ name, size, color }) => (
              <span key={name} className={color} style={{ flex: size }} />
            ))}
          </div>
          <ul className="grid gap-2 text-xs">
            {segments.map(({ name, size, color, href }) => (
              <li key={name} className="flex min-w-0 items-center gap-2">
                <span className={`size-2 shrink-0 ${color}`} aria-hidden="true" />
                {href ? (
                  <Link
                    href={href}
                    title={name}
                    className="min-w-0 flex-1 truncate text-muted-foreground hover:text-link focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <bdi>{name}</bdi>
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 text-muted-foreground">{name}</span>
                )}
                <span className="shrink-0 font-mono tabular-nums" dir="ltr">
                  {niceBytes(String(size))}
                </span>
                <span className="w-16 shrink-0 text-end tabular-nums">
                  <bdi>{share(size)}</bdi>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
