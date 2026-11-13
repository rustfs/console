"use client"

import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { exportFile } from "@/lib/export-file"
import { formatDateTime } from "@/lib/functions"
import { JOB_STATUS_LABELS, MRF_STATUS_LABELS } from "@/lib/recovery-display"
import type { RecoveryError } from "@/lib/recovery"
import type { MrfObservation } from "@/types/recovery"

export function MrfStatus({ status }: { status: string }) {
  const { t } = useTranslation()
  return <Badge variant="secondary">{t(MRF_STATUS_LABELS[status] ?? "Unknown")}</Badge>
}

export function JobStatus({ status }: { status: string }) {
  const { t } = useTranslation()
  return (
    <Badge variant={["mismatch", "failed"].includes(status) ? "destructive" : "secondary"}>
      {t(JOB_STATUS_LABELS[status] ?? "Unknown")}
    </Badge>
  )
}

const ERRORS: Record<string, string> = {
  denied: "You do not have permission for this recovery operation.",
  unsupported: "This server does not support this recovery interface. Check the server version.",
  "not-found": "The requested record was not found. Its result is unconfirmed.",
  conflict: "The identity or state changed. Read the record again before acting.",
  "invalid-response": "The response could not be validated. No result is confirmed.",
  timeout: "The request exceeded its time budget.",
  network: "The server could not be reached.",
  busy: "The recovery controller is busy. Wait before retrying.",
  "invalid-input": "Check the bucket, identifier, and input file.",
  "receipt-mismatch": "This receipt does not match the current endpoint or the stored job.",
  pagination: "The observation cannot continue. Restart from the first page.",
}

export function RecoveryFailure({ error, onRetry }: { error: RecoveryError; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>{t(error.outcomeUnknown ? "Action result unconfirmed" : "Recovery request failed")}</AlertTitle>
      <AlertDescription>
        <p>{t(ERRORS[error.code] ?? "The server could not be reached.")}</p>
        {error.outcomeUnknown && (
          <p>
            {t("The action may have been persisted. Read the same responsibility before considering another action.")}
          </p>
        )}
        {onRetry && (
          <Button type="button" variant="outline" onClick={onRetry} className="min-h-11 sm:min-h-0">
            {t("Retry")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function ObservationCoverage({ data }: { data: MrfObservation }) {
  const { t } = useTranslation()
  const responding = data.nodes.filter(
    (node) => node.state === "ok" && (node.reply?.result !== "summary" || node.reply.summary.checkpointReadable),
  ).length
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <span>
        {t("Nodes responding on this page: {responding} / {expected} expected", {
          responding,
          expected: data.expectedNodes,
        })}
      </span>
      <span>
        {t("Observation window")}: {formatDateTime(data.observationStartedAtMs)} –{" "}
        {formatDateTime(data.observationFinishedAtMs)}
      </span>
      {(!data.pageComplete || data.nextCursor || responding !== data.nodes.length) && (
        <Badge variant="outline">{t("Partial observation")}</Badge>
      )}
    </div>
  )
}

export function RecoveryMetadata({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="break-all text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function exportRecoveryJson(filename: string, data: unknown) {
  exportFile(
    { headers: { "content-type": "application/json" }, data: new Blob([JSON.stringify(data, null, 2)]) },
    filename,
  )
}
