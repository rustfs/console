"use client"

import { useTranslation } from "react-i18next"
import { Spinner } from "@/components/ui/spinner"
import { formatDateTime, formatInteger, niceBytes } from "@/lib/functions"
import type { AccountBucketScanStatus } from "@/lib/account-bucket-usage"

interface BucketUsageValueProps {
  value?: number
  kind: "objects" | "size"
  status?: AccountBucketScanStatus
  loading: boolean
  unmeasured?: boolean
}

export function BucketUsageValue({ value, kind, status, loading, unmeasured }: BucketUsageValueProps) {
  const { t } = useTranslation()
  const progress = status?.progress
  const observed = kind === "objects" ? progress?.objectsCount : progress?.sizeBytes
  const format = (number: number) => (kind === "objects" ? formatInteger(number) : niceBytes(String(number)))

  if (typeof value !== "number" && typeof observed !== "number") {
    if (progress) return <span>—</span>
    return loading ? (
      <Spinner className="size-3 text-muted-foreground" />
    ) : (
      t(unmeasured ? "Not measured" : "Unavailable")
    )
  }

  return (
    <div className="flex flex-col items-end gap-1 whitespace-nowrap text-end tabular-nums">
      <span>{typeof value === "number" ? format(value) : t("{value} scanned", { value: format(observed!) })}</span>
      {typeof value === "number" && typeof observed === "number" && (
        <span className="text-xs text-muted-foreground">{t("{value} scanned", { value: format(observed) })}</span>
      )}
    </div>
  )
}

export function BucketUsageStatus({ bucketName, status }: { bucketName: string; status?: AccountBucketScanStatus }) {
  const { t } = useTranslation()
  const progress = status?.progress
  const timestamp = (milliseconds: number) => formatDateTime(new Date(milliseconds).toISOString())
  if (!progress && !status?.updatedAt) return null

  const stage = progress
    ? t(
        {
          enumerating: "Enumerating objects",
          scanning: "Scan in progress",
          awaiting_sources: "Waiting for scanner sources",
          completed: "Traversal complete",
        }[progress.stage],
      )
    : undefined

  return (
    <div
      className="mt-1 grid max-w-72 gap-0.5 whitespace-normal text-xs text-muted-foreground"
      role={progress ? "status" : undefined}
      aria-live={progress ? "polite" : undefined}
      aria-atomic={progress ? true : undefined}
    >
      {progress && <span className="sr-only">{t("Scan progress for {bucket}", { bucket: bucketName })}: </span>}
      {progress && (
        <>
          <span>{stage}</span>
          <time dateTime={new Date(progress.updatedAt).toISOString()}>
            {t("Checkpoint: {time}", { time: timestamp(progress.updatedAt) })}
          </time>
          <span className="sr-only">
            {typeof progress.objectsCount === "number"
              ? t("{value} scanned", { value: formatInteger(progress.objectsCount) })
              : undefined}
          </span>
        </>
      )}
      {status?.updatedAt && (
        <time dateTime={new Date(status.updatedAt).toISOString()}>
          {t("Last complete scan: {time}", { time: timestamp(status.updatedAt) })}
        </time>
      )}
    </div>
  )
}

export function BucketScanNotice({ statuses }: { statuses: Map<string, AccountBucketScanStatus> }) {
  const { t } = useTranslation()
  return [...statuses.values()].some((status) => status.progress?.objectsCount !== undefined) ? (
    <p className="text-sm text-muted-foreground">{t("Scanned usage is not the bucket total.")}</p>
  ) : null
}
