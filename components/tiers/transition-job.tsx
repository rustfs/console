"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiRefreshLine, RiStopCircleLine } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useTiers, type ManualTransitionJobResponse, type ManualTransitionRunReport } from "@/hooks/use-tiers"
import { useMessage } from "@/lib/feedback/message"

interface TiersTransitionJobProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tierName: string
}

function getJobId(response: ManualTransitionJobResponse | null) {
  if (!response) return ""
  return response.job_id || response.jobId || ""
}

function getJobState(response: ManualTransitionJobResponse | null) {
  if (!response) return ""
  return response.state || response.status || ""
}

function getNumber(report: ManualTransitionRunReport | undefined, key: keyof ManualTransitionRunReport) {
  const value = report?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function isTerminalState(state: string) {
  return ["completed", "partial", "failed", "cancelled", "unknown"].includes(state.toLowerCase())
}

export function TiersTransitionJob({ open, onOpenChange, tierName }: TiersTransitionJobProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { runManualTransition, getManualTransitionJob, cancelManualTransitionJob } = useTiers()

  const [bucket, setBucket] = React.useState("")
  const [prefix, setPrefix] = React.useState("")
  const [maxObjects, setMaxObjects] = React.useState("1000")
  const [dryRun, setDryRun] = React.useState(false)
  const [jobId, setJobId] = React.useState("")
  const [job, setJob] = React.useState<ManualTransitionJobResponse | null>(null)
  const [error, setError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const jobState = getJobState(job)
  const canCancel = Boolean(jobId) && (!jobState || !isTerminalState(jobState))

  React.useEffect(() => {
    if (!open) return
    setBucket("")
    setPrefix("")
    setMaxObjects("1000")
    setDryRun(false)
    setJobId("")
    setJob(null)
    setError("")
    setSubmitting(false)
  }, [open])

  const runJob = async () => {
    const sourceBucket = bucket.trim()
    if (!sourceBucket) {
      setError(t("Bucket is required"))
      return
    }

    setSubmitting(true)
    setError("")
    try {
      const limit = Number.parseInt(maxObjects, 10)
      const response = await runManualTransition({
        bucket: sourceBucket,
        prefix: prefix.trim() || undefined,
        tier: tierName || undefined,
        dryRun,
        maxObjects: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      })
      const nextJobId = getJobId(response)
      setJob(response)
      setJobId(nextJobId)
      message.success(t("Transition job started"))
    } catch (caught) {
      const errorMessage = (caught as Error).message || t("Transition job failed")
      setError(errorMessage)
      message.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const refreshJob = async () => {
    const id = jobId.trim()
    if (!id) {
      setError(t("Job ID is required"))
      return
    }

    setSubmitting(true)
    setError("")
    try {
      const response = await getManualTransitionJob(id)
      setJob(response)
      setJobId(getJobId(response) || id)
    } catch (caught) {
      const errorMessage = (caught as Error).message || t("Unable to load transition job")
      setError(errorMessage)
      message.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const cancelJob = async () => {
    const id = jobId.trim()
    if (!id) return

    setSubmitting(true)
    setError("")
    try {
      const response = await cancelManualTransitionJob(id)
      setJob(response)
      setJobId(getJobId(response) || id)
      message.success(t("Transition job cancelled"))
    } catch (caught) {
      const errorMessage = (caught as Error).message || t("Unable to cancel transition job")
      setError(errorMessage)
      message.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      disablePointerDismissal={submitting}
      onOpenChange={(nextOpen) => {
        if (!submitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[min(90dvh,44rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-4 pe-12 sm:px-6">
          <DialogTitle>{t("Manual Transition")}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <Alert>
            <AlertTitle>{t("Run lifecycle transition manually")}</AlertTitle>
            <AlertDescription>
              {t("Start a durable background job for objects in a source bucket that should transition to this tier.")}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="manual-transition-tier">{t("Target Tier")}</FieldLabel>
              <FieldContent>
                <Input id="manual-transition-tier" name="manual-transition-tier" value={tierName} readOnly />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="manual-transition-bucket">{t("Source Bucket")}</FieldLabel>
              <FieldContent>
                <Input
                  id="manual-transition-bucket"
                  name="manual-transition-bucket"
                  value={bucket}
                  onChange={(event) => setBucket(event.target.value)}
                  disabled={submitting}
                  placeholder={t("Bucket")}
                  autoComplete="off"
                  spellCheck={false}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="manual-transition-prefix">{t("Prefix")}</FieldLabel>
              <FieldContent>
                <Input
                  id="manual-transition-prefix"
                  name="manual-transition-prefix"
                  value={prefix}
                  onChange={(event) => setPrefix(event.target.value)}
                  disabled={submitting}
                  placeholder={t("Optional")}
                  autoComplete="off"
                  spellCheck={false}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="manual-transition-max-objects">{t("Max Objects")}</FieldLabel>
              <FieldContent>
                <Input
                  id="manual-transition-max-objects"
                  name="manual-transition-max-objects"
                  type="number"
                  min={1}
                  value={maxObjects}
                  onChange={(event) => setMaxObjects(event.target.value)}
                  disabled={submitting}
                />
              </FieldContent>
            </Field>
          </div>

          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="manual-transition-dry-run"
              checked={dryRun}
              onChange={(event) => setDryRun(event.target.checked)}
              disabled={submitting}
              className="mt-1 size-4"
            />
            <span>
              <span className="block font-medium">{t("Dry Run")}</span>
              <span className="text-muted-foreground">{t("Scan and report without moving objects.")}</span>
            </span>
          </label>

          <Field>
            <FieldLabel htmlFor="manual-transition-job-id">{t("Job ID")}</FieldLabel>
            <FieldContent>
              <Input
                id="manual-transition-job-id"
                name="manual-transition-job-id"
                value={jobId}
                onChange={(event) => setJobId(event.target.value)}
                disabled={submitting}
                placeholder={t("Paste an existing job ID to refresh or cancel it.")}
                autoComplete="off"
                spellCheck={false}
              />
            </FieldContent>
            <FieldDescription>{t("A job ID is returned after starting an async transition job.")}</FieldDescription>
          </Field>

          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>{t("Transition job failed")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {job ? (
            <section className="space-y-3" aria-label={t("Transition Job Status")}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold">{t("Transition Job Status")}</h2>
                {jobState ? (
                  <Badge variant={isTerminalState(jobState) ? "secondary" : "outline"}>{jobState}</Badge>
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">{t("Scanned")}</dt>
                  <dd className="font-medium">{getNumber(job.report, "scanned")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Transitioned")}</dt>
                  <dd className="font-medium">{getNumber(job.report, "transitioned")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Skipped")}</dt>
                  <dd className="font-medium">{getNumber(job.report, "skipped")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Failed")}</dt>
                  <dd className="font-medium">{getNumber(job.report, "failed")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Tier Failures")}</dt>
                  <dd className="font-medium">{getNumber(job.report, "tier_failures")}</dd>
                </div>
              </dl>
              {job.error ? <p className="text-sm text-destructive">{job.error}</p> : null}
            </section>
          ) : null}
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("Close")}
          </Button>
          <Button type="button" variant="outline" onClick={refreshJob} disabled={submitting || !jobId.trim()}>
            <RiRefreshLine className="size-4" aria-hidden />
            {t("Refresh Status")}
          </Button>
          <Button type="button" variant="outline" onClick={cancelJob} disabled={submitting || !canCancel}>
            <RiStopCircleLine className="size-4" aria-hidden />
            {t("Cancel Job")}
          </Button>
          <Button type="button" onClick={runJob} disabled={submitting}>
            {t("Start Job")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
