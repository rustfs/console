"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { summarizeBucketUsage } from "@/lib/account-bucket-usage"
import { formatInteger, niceBytes } from "@/lib/functions"

export function BucketUsageOverview({
  names,
  usage,
  unavailable,
}: {
  names: string[]
  usage: Map<string, { objectsCount: number; sizeBytes: number }>
  unavailable: boolean
}) {
  const { t } = useTranslation()
  const summary = unavailable ? undefined : summarizeBucketUsage(names, usage)
  const distribution =
    summary && summary.sizeBytes > 0
      ? names
          .map((name) => ({ name, size: usage.get(name)!.sizeBytes }))
          .filter((bucket) => bucket.size > 0)
          .sort((a, b) => b.size - a.size)
      : []

  return (
    <section
      className="bucket-overview grid gap-6 border-b pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end"
      aria-label={t("Storage Usage Statistics")}
    >
      <dl className="grid grid-cols-[1.6fr_1fr_1fr] items-end gap-5">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">{t("Size")}</dt>
          <dd className="mt-2 break-words font-heading text-4xl font-semibold tracking-tight tabular-nums lg:text-5xl">
            {summary ? niceBytes(String(summary.sizeBytes)) : t("Unknown")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("Objects")}</dt>
          <dd className="mt-2 font-heading text-2xl font-medium tabular-nums">
            {summary ? formatInteger(summary.objectsCount) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("Buckets")}</dt>
          <dd className="mt-2 font-heading text-2xl font-medium tabular-nums">
            {unavailable ? "—" : formatInteger(names.length)}
          </dd>
        </div>
      </dl>
      {distribution.length ? (
        <div className="min-w-0 space-y-3">
          <div className="flex h-3 gap-0.5 overflow-hidden" aria-hidden="true">
            {distribution.slice(0, 4).map(({ name, size }, index) => (
              <span key={name} className="bg-brand" style={{ flex: size, opacity: Math.max(0.25, 1 - index * 0.12) }} />
            ))}
            {distribution.length > 4 ? (
              <span
                className="bg-muted-foreground/25"
                style={{ flex: distribution.slice(4).reduce((total, bucket) => total + bucket.size, 0) }}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
            {distribution.slice(0, 4).map(({ name, size }) => (
              <Link
                key={name}
                href={`/browser?bucket=${encodeURIComponent(name)}`}
                className="group flex min-w-0 max-w-full items-baseline gap-2 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="truncate text-muted-foreground group-hover:text-link">{name}</span>
                <span className="shrink-0 font-mono tabular-nums">{niceBytes(String(size))}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
