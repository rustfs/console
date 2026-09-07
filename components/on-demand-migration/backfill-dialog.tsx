"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { RiErrorWarningLine, RiPlayLine, RiStopCircleLine } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useOnDemandMigration } from "@/hooks/use-on-demand-migration"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { formatBytes, formatInteger } from "@/lib/functions"
import { getOnDemandMigrationErrorKind, isOnDemandMigrationBackfillActive } from "@/lib/on-demand-migration"
import { scheduleMicrotask } from "@/lib/schedule-microtask"
import type { OnDemandMigrationBackfillJob, OnDemandMigrationSkipExisting } from "@/types/on-demand-migration"

interface BackfillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketName: string
  moduleEnabled: boolean
  job: OnDemandMigrationBackfillJob | null
  onChanged: () => void | Promise<void>
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error)
}

export function OnDemandMigrationBackfillDialog({
  open,
  onOpenChange,
  bucketName,
  moduleEnabled,
  job,
  onChanged,
}: BackfillDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { startBackfill, cancelBackfill } = useOnDemandMigration()
  const [prefix, setPrefix] = React.useState("")
  const [skipExisting, setSkipExisting] = React.useState<OnDemandMigrationSkipExisting>("always")
  const [dryRun, setDryRun] = React.useState(false)
  const [operationError, setOperationError] = React.useState<unknown>(null)
  const [submitting, setSubmitting] = React.useState<"start" | "cancel" | null>(null)
  const active = isOnDemandMigrationBackfillActive(job?.state)

  React.useEffect(() => {
    if (!open) return
    scheduleMicrotask(() => {
      setPrefix("")
      setSkipExisting("always")
      setDryRun(false)
      setOperationError(null)
      setSubmitting(null)
    })
  }, [open])

  const handleStart = async () => {
    if (!moduleEnabled || active || submitting) return
    setSubmitting("start")
    setOperationError(null)
    try {
      await startBackfill(bucketName, {
        ...(prefix ? { prefix } : {}),
        skip_existing: skipExisting,
        dry_run: dryRun,
      })
      message.success(dryRun ? t("Backfill dry run started") : t("Backfill started"))
      await onChanged()
      onOpenChange(false)
    } catch (error) {
      setOperationError(error)
    } finally {
      setSubmitting(null)
    }
  }

  const performCancel = async () => {
    if (!active || submitting) return
    setSubmitting("cancel")
    setOperationError(null)
    try {
      await cancelBackfill(bucketName)
      message.success(t("Backfill cancellation requested"))
      await onChanged()
      onOpenChange(false)
    } catch (error) {
      setOperationError(error)
    } finally {
      setSubmitting(null)
    }
  }

  const confirmCancel = () => {
    dialog.warning({
      title: t("Cancel the running backfill?"),
      content: t("Objects already migrated remain in the local bucket. You can start a new job later."),
      positiveText: t("Cancel backfill"),
      negativeText: t("Keep running"),
      onPositiveClick: performCancel,
    })
  }

  const errorKind = getOnDemandMigrationErrorKind(operationError)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) onOpenChange(true)
        else if (!submitting) onOpenChange(false)
      }}
      disablePointerDismissal
    >
      <DialogContent
        className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={!submitting}
      >
        <DialogHeader className="border-b px-4 py-4 pe-12 sm:px-6">
          <DialogTitle>{active ? t("Backfill in progress") : t("Start background backfill")}</DialogTitle>
          <DialogDescription>
            {t("Bucket")}: <span className="break-all font-medium text-foreground">{bucketName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {operationError ? (
            <Alert variant="destructive">
              <RiErrorWarningLine aria-hidden />
              <AlertTitle>
                {errorKind === "backfill_running"
                  ? t("A backfill job is already running")
                  : errorKind === "module_disabled"
                    ? t("On-demand migration is not enabled on this server")
                    : errorKind === "license_denied"
                      ? t("The server rejected this operation")
                      : errorKind === "access_denied"
                        ? t("You do not have permission to control backfill")
                        : t("Backfill operation failed")}
              </AlertTitle>
              <AlertDescription>
                <p>{errorMessage(operationError)}</p>
                {errorKind === "license_denied" ? (
                  <p>
                    <Link href="/license">{t("Open license settings")}</Link>
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {!moduleEnabled ? (
            <Alert variant="destructive">
              <RiErrorWarningLine aria-hidden />
              <AlertTitle>{t("On-demand migration is not enabled on this server")}</AlertTitle>
              <AlertDescription>
                {t("Backfill cannot start until the module is enabled on every server node.")}
              </AlertDescription>
            </Alert>
          ) : null}

          {active && job ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("The source is still being scanned, so no completion percentage is shown.")}
              </p>
              <dl className="grid divide-y border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="p-3">
                  <dt className="text-xs text-muted-foreground">{t("Objects listed")}</dt>
                  <dd className="mt-1 text-base font-medium tabular-nums">{formatInteger(job.listed)}</dd>
                </div>
                <div className="p-3">
                  <dt className="text-xs text-muted-foreground">{t("Objects pulled")}</dt>
                  <dd className="mt-1 text-base font-medium tabular-nums">{formatInteger(job.pulled)}</dd>
                </div>
              </dl>
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">{t("Skipped existing")}</dt>
                  <dd className="tabular-nums">{formatInteger(job.skipped_existing)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Failed objects")}</dt>
                  <dd className={job.failed > 0 ? "text-destructive tabular-nums" : "tabular-nums"}>
                    {formatInteger(job.failed)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Migrated data")}</dt>
                  <dd className="tabular-nums">{formatBytes(job.bytes)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Job ID")}</dt>
                  <dd className="break-all font-mono text-xs">{job.job_id}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="odm-backfill-prefix">{t("Source listing prefix (optional)")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="odm-backfill-prefix"
                    name="prefix"
                    value={prefix}
                    autoComplete="off"
                    placeholder="photos/2025/"
                    aria-describedby="odm-backfill-prefix-description"
                    onChange={(event) => {
                      setPrefix(event.target.value)
                      setOperationError(null)
                    }}
                  />
                  <FieldDescription id="odm-backfill-prefix-description">
                    {t("Leave empty to scan the complete configured source namespace.")}
                  </FieldDescription>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel htmlFor="odm-backfill-skip-existing">{t("Existing local objects")}</FieldLabel>
                <FieldContent>
                  <Select
                    name="skipExisting"
                    items={[
                      { value: "always", label: t("Always skip") },
                      { value: "etag_or_size", label: t("Compare source ETag and size") },
                    ]}
                    value={skipExisting}
                    onValueChange={(value) => value && setSkipExisting(value as OnDemandMigrationSkipExisting)}
                  >
                    <SelectTrigger id="odm-backfill-skip-existing" className="w-full">
                      <SelectValue>
                        {skipExisting === "always" ? t("Always skip") : t("Compare source ETag and size")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="always">{t("Always skip")}</SelectItem>
                        <SelectItem value="etag_or_size">{t("Compare source ETag and size")}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {skipExisting === "always"
                      ? t("Any current local object is skipped.")
                      : t("Objects whose recorded source ETag and size differ are pulled again.")}
                  </FieldDescription>
                </FieldContent>
              </Field>

              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="odm-backfill-dry-run">{t("Dry Run")}</FieldLabel>
                  <FieldDescription id="odm-backfill-dry-run-description">
                    {t("List matching objects without queueing or writing any object.")}
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="odm-backfill-dry-run"
                  name="dryRun"
                  checked={dryRun}
                  aria-describedby="odm-backfill-dry-run-description"
                  onCheckedChange={setDryRun}
                />
              </Field>
            </FieldGroup>
          )}
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-0"
            onClick={() => onOpenChange(false)}
            disabled={Boolean(submitting)}
          >
            {t("Close")}
          </Button>
          {active ? (
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 sm:min-h-0"
              onClick={confirmCancel}
              disabled={Boolean(submitting)}
            >
              {submitting === "cancel" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <RiStopCircleLine data-icon="inline-start" aria-hidden />
              )}
              {submitting === "cancel" ? t("Cancelling") : t("Cancel backfill")}
            </Button>
          ) : (
            <Button
              type="button"
              className="min-h-11 sm:min-h-0"
              onClick={handleStart}
              disabled={!moduleEnabled || Boolean(submitting)}
            >
              {submitting === "start" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <RiPlayLine data-icon="inline-start" aria-hidden />
              )}
              {submitting === "start" ? t("Starting") : dryRun ? t("Start dry run") : t("Start backfill")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
