"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { RiDownloadLine, RiRefreshLine, RiSearchLine } from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table/data-table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useDataTable } from "@/hooks/use-data-table"
import { useRecoveryRead } from "@/hooks/use-recovery"
import { formatDateTime, niceBytes } from "@/lib/functions"
import { asRecoveryError, parseRecoveryReceipt, RecoveryClient, RecoveryError } from "@/lib/recovery"
import { integrityEvidenceLabel } from "@/lib/recovery-display"
import type { IntegrityItemResult, IntegrityJob, RecoveryReceipt } from "@/types/recovery"
import { exportRecoveryJson, JobStatus, RecoveryFailure, RecoveryMetadata } from "./status"

function JobResults({ job }: { job: IntegrityJob }) {
  const { t } = useTranslation()
  type Row = { index: number; item: IntegrityJob["request"]["items"][number]; result: IntegrityItemResult }
  const rows = useMemo(
    () => job.request.items.map((item, index) => ({ index, item, result: job.results[index] })),
    [job],
  )
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "object",
        header: t("Selected object / version"),
        cell: ({ row }) => (
          <div className="flex min-w-0 max-w-sm flex-col gap-2 whitespace-normal">
            <span className="break-all font-mono">{row.original.item.key}</span>
            <span className="break-all text-xs text-muted-foreground">
              {row.original.item.version_id === null
                ? t("Current version when executed")
                : row.original.item.version_id === "null"
                  ? t("Null / unversioned slot")
                  : row.original.item.version_id}
            </span>
            {row.original.item.target_key && (
              <span className="break-all text-xs">
                {t("Target key")}: {row.original.item.target_key}
              </span>
            )}
          </div>
        ),
      },
      {
        id: "result",
        header: t("Result / evidence"),
        cell: ({ row }) => <ResultDetail result={row.original.result} />,
      },
    ],
    [t],
  )
  const { table } = useDataTable({ data: rows, columns, disablePagination: true, getRowId: (row) => String(row.index) })
  return (
    <>
      <div className="hidden md:block">
        <DataTable table={table} caption={t("Independent integrity job item results")} />
      </div>
      <div className="flex flex-col gap-4 md:hidden">
        {rows.map(({ index, item, result }) => (
          <article key={index} className="flex min-w-0 flex-col gap-4 border p-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h4 className="break-all font-mono text-sm font-medium">{item.key}</h4>
              <p className="break-all text-xs text-muted-foreground">
                {item.version_id === null
                  ? t("Current version when executed")
                  : item.version_id === "null"
                    ? t("Null / unversioned slot")
                    : item.version_id}
              </p>
              {item.target_key && (
                <p className="break-all text-xs">
                  {t("Target key")}: {item.target_key}
                </p>
              )}
            </div>
            <ResultDetail result={result} />
          </article>
        ))}
      </div>
    </>
  )
}

function ResultDetail({ result }: { result: IntegrityItemResult }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 max-w-sm flex-col gap-2 whitespace-normal">
      <div>
        <JobStatus status={result.state} />
      </div>
      <span className="text-xs">{t(integrityEvidenceLabel(result.evidence_source))}</span>
      {result.detail && <p className="break-all text-xs text-muted-foreground">{result.detail}</p>}
      <details className="min-w-0 text-xs">
        <summary className="cursor-pointer py-1 focus-visible:outline-ring">
          {t("Observed identity and digest")}
        </summary>
        <dl className="mt-2 flex min-w-0 flex-col gap-2">
          <div>
            <dt className="text-muted-foreground">{t("Source fingerprint")}</dt>
            <dd className="break-all font-mono">{result.source_fingerprint ?? t("Unknown")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("Expected SHA-256 (Base64)")}</dt>
            <dd className="break-all font-mono">{result.expected_sha256 ?? t("Unknown")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("Observed source size")}</dt>
            <dd>{result.source_size === null ? t("Unknown") : niceBytes(String(result.source_size))}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("Target version")}</dt>
            <dd className="break-all font-mono">{result.target_version_id ?? t("Unknown")}</dd>
          </div>
        </dl>
      </details>
    </div>
  )
}

function ProtectionConfiguration({ client, enabled }: { client: RecoveryClient; enabled: boolean }) {
  const { t } = useTranslation()
  const [requested, setRequested] = useState(false)
  const loader = useCallback((signal: AbortSignal) => client.integrityReadiness(signal), [client])
  const state = useRecoveryRead(loader, { enabled: enabled && requested, identity: client })
  const yesNo = (value: boolean) => t(value ? "Yes" : "No")
  return (
    <section aria-labelledby="recovery-protection-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="recovery-protection-title" className="text-base font-semibold">
          {t("New-write protection")}
        </h3>
        <Button
          type="button"
          variant="outline"
          disabled={!enabled || state.loading}
          className="min-h-11 sm:min-h-0"
          onClick={() => (requested ? void state.refresh() : setRequested(true))}
        >
          {state.loading && <Spinner data-icon="inline-start" />}
          {t("Check local configuration")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {t(
          "Configuration and operator attestation do not qualify the deployment. Compatibility, recovery, and performance evidence must cover every participating process before protected migration.",
        )}
      </p>
      {!enabled && (
        <p className="text-sm text-muted-foreground">
          {t("Protection configuration requires the ServerInfo permission.")}
        </p>
      )}
      {state.error && <RecoveryFailure error={state.error} onRetry={() => void state.refresh()} />}
      {state.data && (
        <>
          {state.stale && (
            <p role="status" className="text-sm text-muted-foreground">
              {t("Previous observation · may be stale")}
            </p>
          )}
          <RecoveryMetadata
            items={[
              [t("Local reader support"), yesNo(state.data.local_reader_supported)],
              [t("Protected writes requested here"), yesNo(state.data.write_requested)],
              [t("Fleet operator attestation"), yesNo(state.data.fleet_operator_attested)],
              [t("New writes enabled on responding node"), yesNo(state.data.new_writes_enabled_here)],
              [t("Deployment qualification"), t("Requires an external qualification report")],
            ]}
          />
          <Alert>
            <AlertDescription>
              {t(
                "This is one responding node's configuration, not fleet-wide evidence. Disabling new protected writes does not remove protection from existing objects; rollback requires a qualified compatible version.",
              )}
            </AlertDescription>
          </Alert>
        </>
      )}
    </section>
  )
}

export function RecoveryIntegrity({
  client,
  canReadJobs,
  canReadReadiness,
}: {
  client: RecoveryClient
  canReadJobs: boolean
  canReadReadiness: boolean
}) {
  const { t } = useTranslation()
  const [bucket, setBucket] = useState("")
  const [jobId, setJobId] = useState("")
  const [target, setTarget] = useState<{ bucket: string; id: string; receipt?: RecoveryReceipt } | null>(null)
  const [inputError, setInputError] = useState<{
    field: "bucket" | "jobId" | "receipt"
    error: RecoveryError
  } | null>(null)
  const [importing, setImporting] = useState(false)
  const importEpoch = useRef(0)
  const formRef = useRef<HTMLFormElement>(null)
  const receiptRef = useRef<HTMLInputElement>(null)
  const loader = useCallback(
    async (signal: AbortSignal) => {
      if (!target) throw new RecoveryError("invalid-input")
      const job = target.receipt
        ? await client.importReceipt(target.receipt, signal)
        : await client.integrityJob(target.bucket, target.id, signal)
      return { job, retrievedAt: new Date().toISOString() }
    },
    [client, target],
  )
  const result = useRecoveryRead(loader, { enabled: canReadJobs && target !== null, identity: client })

  useEffect(() => {
    if (inputError?.field === "receipt" && !importing) receiptRef.current?.focus()
  }, [inputError, importing])

  const query = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canReadJobs || result.loading || importing) return
    const validBucket = bucket.trim().length > 0 && !bucket.includes("/")
    const validId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId.trim()) &&
      jobId.trim() !== "00000000-0000-0000-0000-000000000000"
    if (!validBucket || !validId) {
      setInputError({ field: validBucket ? "jobId" : "bucket", error: new RecoveryError("invalid-input") })
      formRef.current?.querySelector<HTMLElement>(validBucket ? "#recovery-job-id" : "#recovery-job-bucket")?.focus()
      return
    }
    setInputError(null)
    setTarget({ bucket: bucket.trim(), id: jobId.trim() })
  }

  const importFile = async (file: File | undefined) => {
    if (!file || !canReadJobs || result.loading || importing) return
    const epoch = ++importEpoch.current
    setImporting(true)
    setInputError(null)
    try {
      if (file.size > 8 * 1024 * 1024) throw new RecoveryError("invalid-input")
      let value: unknown
      try {
        value = JSON.parse(await file.text())
      } catch {
        throw new RecoveryError("invalid-input")
      }
      const receipt = parseRecoveryReceipt(value, client.endpoint)
      if (epoch !== importEpoch.current) return
      setBucket(receipt.job.bucket)
      setJobId(receipt.job.id)
      setTarget({ bucket: receipt.job.bucket, id: receipt.job.id, receipt })
    } catch (error) {
      if (epoch === importEpoch.current) setInputError({ field: "receipt", error: asRecoveryError(error) })
    } finally {
      if (epoch === importEpoch.current) setImporting(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section aria-labelledby="recovery-audit-title" className="flex flex-col gap-4">
        <h2 id="recovery-audit-title" className="text-lg font-semibold">
          {t("Independent object verification")}
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t(
            "Use the CLI to select explicit objects from inventory, state the digest source and processing budget, then create a paused job. Save its receipt before explicitly resuming.",
          )}
        </p>
        <pre className="max-w-full overflow-x-auto bg-muted p-4 text-xs leading-relaxed">
          <code>
            {
              "rc admin integrity inventory ALIAS BUCKET --json\nrc admin integrity audit --help\nrc admin integrity resume --help"
            }
          </code>
        </pre>
        <Alert>
          <AlertTitle>{t("Select objects independently of MRF")}</AlertTitle>
          <AlertDescription>
            {t(
              'MRF null identifies a historical null slot. In an audit manifest, JSON null selects the current version; the string "null" selects the null version slot. Reusing the object name does not bind the audit to a historical responsibility.',
            )}
          </AlertDescription>
        </Alert>
        <p className="text-xs text-muted-foreground">
          {t(
            "Audits read the full object and write checkpoints. Older servers may also stage the full payload; reserve the per-object budget. Migration stages verified bytes and reads the target back. Rates apply per stream, not to total disk or network traffic.",
          )}
        </p>
      </section>
      <Separator />
      <section aria-labelledby="recovery-job-title" className="flex min-w-0 flex-col gap-5">
        <h2 id="recovery-job-title" className="text-lg font-semibold">
          {t("Find verification results")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "Import a CLI receipt or enter a bucket and job ID. The Console reads the persisted result from this endpoint; the receipt itself is not evidence of success.",
          )}
        </p>
        {!canReadJobs && (
          <Alert>
            <AlertDescription>{t("Reading integrity jobs requires the DescribeBatchJob permission.")}</AlertDescription>
          </Alert>
        )}
        <form ref={formRef} onSubmit={query} noValidate>
          <FieldGroup className="sm:flex-row sm:items-end">
            <Field className="sm:flex-1" data-disabled={!canReadJobs} data-invalid={inputError?.field === "bucket"}>
              <FieldLabel htmlFor="recovery-job-bucket">{t("Bucket")}</FieldLabel>
              <Input
                id="recovery-job-bucket"
                name="bucket"
                autoComplete="off"
                value={bucket}
                onChange={(event) => setBucket(event.target.value)}
                disabled={!canReadJobs || importing}
                required
                aria-invalid={inputError?.field === "bucket"}
                aria-describedby={inputError?.field === "bucket" ? "recovery-input-error" : undefined}
              />
            </Field>
            <Field className="sm:flex-1" data-disabled={!canReadJobs} data-invalid={inputError?.field === "jobId"}>
              <FieldLabel htmlFor="recovery-job-id">{t("Job ID")}</FieldLabel>
              <Input
                id="recovery-job-id"
                name="jobId"
                autoComplete="off"
                spellCheck={false}
                value={jobId}
                onChange={(event) => setJobId(event.target.value)}
                disabled={!canReadJobs || importing}
                required
                aria-invalid={inputError?.field === "jobId"}
                aria-describedby={inputError?.field === "jobId" ? "recovery-input-error" : undefined}
              />
            </Field>
            <Button
              type="submit"
              disabled={!canReadJobs || result.loading || importing}
              className="min-h-11 sm:min-h-0"
            >
              {result.loading ? <Spinner data-icon="inline-start" /> : <RiSearchLine data-icon="inline-start" />}
              {t("Find job")}
            </Button>
          </FieldGroup>
        </form>
        <Field
          className="max-w-lg"
          data-disabled={!canReadJobs || result.loading || importing}
          data-invalid={inputError?.field === "receipt"}
        >
          <FieldLabel htmlFor="recovery-receipt">{t("Import CLI receipt")}</FieldLabel>
          <Input
            ref={receiptRef}
            type="file"
            id="recovery-receipt"
            name="receipt"
            accept="application/json,.json"
            disabled={!canReadJobs || result.loading || importing}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              void importFile(file)
            }}
            aria-invalid={inputError?.field === "receipt"}
            aria-describedby={
              inputError?.field === "receipt" ? "recovery-receipt-help recovery-input-error" : "recovery-receipt-help"
            }
          />
          <FieldDescription id="recovery-receipt-help">
            {t("JSON, up to 8 MiB. The endpoint, job request, and bucket identity must match.")}
          </FieldDescription>
        </Field>
        {inputError && (
          <div id="recovery-input-error">
            <RecoveryFailure error={inputError.error} />
          </div>
        )}
        {result.error && <RecoveryFailure error={result.error} onRetry={() => void result.refresh()} />}
        {(result.loading || importing) && (
          <p role="status" className="flex items-center gap-2 text-sm">
            <Spinner />
            {t("Reading verification result")}
          </p>
        )}
        {result.data && (
          <section aria-labelledby="recovery-result-title" className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id="recovery-result-title" className="text-base font-semibold">
                {t("Stored job result")}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void result.refresh()}
                  disabled={result.loading}
                  className="min-h-11 sm:min-h-0"
                >
                  <RiRefreshLine data-icon="inline-start" />
                  {t("Refresh result")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    exportRecoveryJson(`integrity-${result.data!.job.id}.json`, {
                      endpoint: client.endpoint,
                      job: result.data!.job,
                      retrieved_at: result.data!.retrievedAt,
                      checked_at: null,
                      mrf_disposition: "unchanged_by_this_job",
                      digest_source_reference: target?.receipt?.digest_source_reference ?? null,
                    })
                  }
                  className="min-h-11 sm:min-h-0"
                >
                  <RiDownloadLine data-icon="inline-start" />
                  {t("Export result")}
                </Button>
              </div>
            </div>
            {result.stale && (
              <p role="status" className="text-sm text-muted-foreground">
                {t("Previous observation · may be stale")}
              </p>
            )}
            <RecoveryMetadata
              items={[
                [t("Job ID"), result.data.job.id],
                [t("State"), <JobStatus key="state" status={result.data.job.state} />],
                [t("Bucket"), result.data.job.bucket],
                [t("Execution bucket identity"), result.data.job.bucket_incarnation],
                [
                  t("Verification mode"),
                  t(result.data.job.request.mode === "audit" ? "Integrity audit" : "Protected migration"),
                ],
                [t("Result retrieved at"), formatDateTime(result.data.retrievedAt)],
                [t("Actual verification time"), t("Unknown · not recorded by this job format")],
                [t("Digest source reference (receipt)"), target?.receipt?.digest_source_reference ?? t("Unknown")],
              ]}
            />
            <Alert>
              <AlertTitle>{t("Completion is not an all-pass result")}</AlertTitle>
              <AlertDescription>
                {t(
                  "Review every item's state and evidence source. A matching digest does not certify every physical shard or retire the original MRF responsibility. A recorded running state does not prove a worker is currently active.",
                )}
              </AlertDescription>
            </Alert>
            {result.data.job.last_error && (
              <Alert variant="destructive">
                <AlertDescription className="break-all">{result.data.job.last_error}</AlertDescription>
              </Alert>
            )}
            <JobResults job={result.data.job} />
          </section>
        )}
      </section>
      <Separator />
      <ProtectionConfiguration client={client} enabled={canReadReadiness} />
    </div>
  )
}
