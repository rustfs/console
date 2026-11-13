"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { RiDownloadLine, RiRefreshLine } from "@remixicon/react"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useRecoveryRead } from "@/hooks/use-recovery"
import { useMessage } from "@/lib/feedback/message"
import { formatDateTime } from "@/lib/functions"
import { asRecoveryError, RecoveryClient, RecoveryError } from "@/lib/recovery"
import {
  acceptedRequestMatches,
  mrfActionAvailability,
  mrfActionConfirmed,
  riskConfirmationMatches,
} from "@/lib/recovery-display"
import type { MrfAction, MrfResponsibility } from "@/types/recovery"
import type { MrfTarget } from "./list"
import { exportRecoveryJson, MrfStatus, RecoveryFailure, RecoveryMetadata } from "./status"

export function RecoveryDetails({
  client,
  target,
  enabled,
  onClose,
  onChanged,
}: {
  client: RecoveryClient
  target: MrfTarget
  enabled: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const message = useMessage()
  const mounted = useRef(true)
  const submitting = useRef(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<RecoveryError | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<MrfAction | null>(null)
  const [showRisk, setShowRisk] = useState(false)
  const [riskSnapshot, setRiskSnapshot] = useState<MrfResponsibility | null>(null)
  const [requestId, setRequestId] = useState("")
  const [reason, setReason] = useState("")
  const [reference, setReference] = useState("")
  const [risk, setRisk] = useState(false)
  const [unknownSource, setUnknownSource] = useState(false)
  const [changedIdentity, setChangedIdentity] = useState(false)
  const [invalidField, setInvalidField] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const acceptRiskRef = useRef<HTMLButtonElement>(null)
  const previousShowRisk = useRef(showRisk)
  const load = useCallback(
    (signal: AbortSignal) => client.mrfGet(target.nodeId, target.responsibility.responsibilityId, signal),
    [client, target.nodeId, target.responsibility.responsibilityId],
  )
  const observation = useRecoveryRead(load, { enabled, identity: client })
  const reply = observation.data?.nodes.find((node) => node.nodeId === target.nodeId)?.reply
  const current = reply?.result === "get" ? reply.observation.responsibility : null
  const observedAt = reply?.result === "get" ? reply.observation.observedAtMs : null
  const notObserved = reply?.result === "get" && current === null
  const row = current ?? target.responsibility
  const available = current ? mrfActionAvailability(current) : { refresh: false, recheck: false, acceptRisk: false }
  const reconciled = Boolean(current && attempt && acceptedRequestMatches(current, attempt))
  const locked =
    !enabled ||
    busy ||
    observation.loading ||
    observation.stale ||
    Boolean(observation.error) ||
    !current ||
    Boolean(actionError?.outcomeUnknown && !reconciled)
  const riskMatches = Boolean(riskSnapshot && riskConfirmationMatches(riskSnapshot, current))
  const riskLocked = locked || !riskMatches

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (previousShowRisk.current === showRisk) return
    previousShowRisk.current = showRisk
    const focusTarget = showRisk
      ? formRef.current?.querySelector<HTMLElement>("#recovery-reason")
      : acceptRiskRef.current
    focusTarget?.focus()
  }, [showRisk])

  const act = async (action: MrfAction) => {
    if (submitting.current || locked) return
    submitting.current = true
    setBusy(true)
    setNotice(null)
    setActionError(null)
    setAttempt(action)
    try {
      const result = await client.mrfAction(action)
      if (!mrfActionConfirmed(result, action)) throw new RecoveryError("invalid-response", true)
      if (!mounted.current) return
      const text =
        action.request.action === "recheck"
          ? "Recheck submitted. Its result is not yet confirmed."
          : action.request.action === "refresh"
            ? "Identity refreshed. Data remains unverified."
            : "Risk acceptance recorded. The unverified responsibility is retained."
      setNotice(text)
      setShowRisk(false)
      message.info(t(text))
    } catch (error) {
      if (mounted.current) setActionError(asRecoveryError(error))
    } finally {
      submitting.current = false
      if (mounted.current) {
        setBusy(false)
        onChanged()
        void observation.refresh()
      }
    }
  }

  const basicAction = (action: "refresh" | "recheck") => {
    if (!current || !available[action]) return
    void act({
      nodeId: target.nodeId,
      request: {
        action,
        responsibilityId: current.responsibilityId,
        expectedBucketIncarnationId: current.bucketIncarnationId,
      },
    })
  }

  const submitRisk = (event: React.FormEvent) => {
    event.preventDefault()
    if (!current || !riskSnapshot || !available.acceptRisk || riskLocked) return
    const bytes = (value: string) => new TextEncoder().encode(value.trim()).length
    const invalid =
      !reason.trim() || bytes(reason) > 1024
        ? "reason"
        : !reference.trim() || bytes(reference) > 256
          ? "reference"
          : !risk
            ? "risk"
            : !current.sourceBucketIncarnationId && !unknownSource
              ? "unknown-source"
              : current.status === "bucket_incarnation_changed" && !changedIdentity
                ? "changed-identity"
                : null
    setInvalidField(invalid)
    if (invalid) {
      formRef.current?.querySelector<HTMLElement>(`[id="recovery-${invalid}"]`)?.focus()
      return
    }
    void act({
      nodeId: target.nodeId,
      request: {
        action: "acceptUnverifiedRisk",
        responsibilityId: riskSnapshot.responsibilityId,
        expectedBucketIncarnationId: riskSnapshot.bucketIncarnationId,
        requestId,
        reason: reason.trim(),
        reference: reference.trim(),
        acknowledgeUnverifiedDataRisk: true,
        acknowledgeUnknownSourceIncarnation: !current.sourceBucketIncarnationId && unknownSource,
        acknowledgeBucketIncarnationMismatch: current.status === "bucket_incarnation_changed" && changedIdentity,
      },
    })
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="sm:max-w-2xl" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{t("Recovery responsibility")}</DialogTitle>
          <DialogDescription className="break-all">
            {row.bucket} / {row.object}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MrfStatus status={current ? current.status : "unknown"} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || observation.loading || !enabled}
              onClick={() => void observation.refresh()}
              className="min-h-11 sm:min-h-0"
            >
              <RiRefreshLine data-icon="inline-start" />
              {t("Refresh status")}
            </Button>
          </div>
          {observation.loading && (
            <p role="status" className="flex items-center gap-2 text-sm">
              <Spinner />
              {t("Reading responsibility")}
            </p>
          )}
          {observation.error && (
            <RecoveryFailure error={observation.error} onRetry={() => void observation.refresh()} />
          )}
          {observation.stale && (
            <p className="text-sm text-muted-foreground">{t("Previous observation · may be stale")}</p>
          )}
          {notObserved && (
            <Alert>
              <AlertTitle>{t("Current record not observed")}</AlertTitle>
              <AlertDescription>
                {t(
                  "The responsibility is not visible in this runtime. This does not confirm retirement or data integrity. The historical identity remains shown below.",
                )}
              </AlertDescription>
            </Alert>
          )}
          {observation.data && reply?.result !== "get" && (
            <Alert variant="destructive">
              <AlertDescription>
                {t("The node could not provide a responsibility observation. No result is confirmed.")}
              </AlertDescription>
            </Alert>
          )}
          <RecoveryMetadata
            items={[
              [t("Node"), target.host],
              [t("Responsibility ID"), <code key="id">{row.responsibilityId}</code>],
              [t("Source bucket identity"), row.sourceBucketIncarnationId ?? t("Unknown")],
              [t("Observed bucket identity"), row.bucketIncarnationId ?? t("Unknown")],
              [t("Version slot"), row.versionId ?? t("Null / unversioned slot")],
              [t("Pool / set"), `${row.poolIndex ?? "—"} / ${row.setIndex ?? "—"}`],
              [t("Responsibility recorded at"), formatDateTime(row.enqueuedAtMs, t("Unknown"))],
              [t("Status observed at"), observedAt ? formatDateTime(observedAt) : t("Unknown")],
              [t("Held since"), formatDateTime(row.heldSinceMs, t("Unknown"))],
              [
                t("Last identity probe"),
                row.lastIdentityProbeAtMs ? formatDateTime(row.lastIdentityProbeAtMs) : t("Unknown"),
              ],
            ]}
          />
          <Alert>
            <AlertDescription>
              {t(
                row.status === "held_unverified_legacy"
                  ? "The last eligible shard check completed, but independent integrity evidence was unavailable. This responsibility remains unverified."
                  : "This is a historical recovery responsibility, not a certificate for the current object. Refreshing identity or accepting risk does not verify content.",
              )}
            </AlertDescription>
          </Alert>
          {row.accepted && (
            <section className="flex flex-col gap-3" aria-labelledby="recovery-disposition-title">
              <h3 id="recovery-disposition-title" className="text-sm font-semibold">
                {t("Recorded risk acceptance")}
              </h3>
              <RecoveryMetadata
                items={[
                  [t("Operator"), row.accepted.actor],
                  [t("Recorded at"), formatDateTime(row.accepted.acceptedAtMs)],
                  [t("Reason"), row.accepted.reason],
                  [t("Reference"), row.accepted.reference],
                  [t("Request ID"), row.accepted.requestId],
                ]}
              />
            </section>
          )}
          {notice && (
            <Alert role="status">
              <AlertDescription>{t(notice)}</AlertDescription>
            </Alert>
          )}
          {actionError && !reconciled && <RecoveryFailure error={actionError} />}
          {reconciled && (
            <Alert role="status">
              <AlertDescription>
                {t("Risk acceptance confirmed by the matching request ID and audit fields. Data remains unverified.")}
              </AlertDescription>
            </Alert>
          )}
          {attempt && (
            <div className="flex flex-col gap-2">
              {attempt.request.requestId && (
                <p className="break-all text-xs text-muted-foreground">
                  {t("Request ID")}: <code>{attempt.request.requestId}</code>
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="min-h-11 self-start sm:min-h-0"
                onClick={() =>
                  exportRecoveryJson(`mrf-action-${row.responsibilityId}.json`, {
                    endpoint: client.endpoint,
                    request: attempt,
                    latest_observation: observation.data,
                    action_confirmed: Boolean(notice) || reconciled,
                    data_verified: false,
                    exported_at: new Date().toISOString(),
                  })
                }
              >
                <RiDownloadLine data-icon="inline-start" />
                {t("Export reconciliation details")}
              </Button>
              {actionError?.outcomeUnknown && !reconciled && (
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Keep this request ID and its exact fields for reconciliation. The Console does not retry an uncertain action.",
                  )}
                </p>
              )}
            </div>
          )}
          {!showRisk ? (
            <section className="flex flex-col gap-3" aria-labelledby="recovery-actions-title">
              <h3 id="recovery-actions-title" className="text-sm font-semibold">
                {t("Actions")}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked || !available.refresh}
                  onClick={() => basicAction("refresh")}
                  className="min-h-11 sm:min-h-0"
                >
                  {t("Refresh identity")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked || !available.recheck}
                  onClick={() => basicAction("recheck")}
                  className="min-h-11 sm:min-h-0"
                >
                  {t("Submit recheck")}
                </Button>
                <Button
                  ref={acceptRiskRef}
                  type="button"
                  variant="outline"
                  disabled={locked || !available.acceptRisk}
                  onClick={() => {
                    setRequestId(crypto.randomUUID())
                    setRiskSnapshot(current)
                    setRisk(false)
                    setUnknownSource(false)
                    setChangedIdentity(false)
                    setInvalidField(null)
                    setShowRisk(true)
                  }}
                  className="min-h-11 sm:min-h-0"
                >
                  {t("Accept unverified risk")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Recheck performs a deep shard check and may consume storage I/O. It requires matching source and current bucket identities; submission is not verification.",
                )}
              </p>
            </section>
          ) : (
            <form id="recovery-risk-form" ref={formRef} onSubmit={submitRisk} noValidate>
              <FieldGroup>
                {!riskMatches && !observation.loading && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {t(
                        "The responsibility changed after confirmation began. Go back and reopen risk acceptance to review the new identity.",
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                <Field data-invalid={invalidField === "reason"} data-disabled={riskLocked}>
                  <FieldLabel htmlFor="recovery-reason">{t("Reason")}</FieldLabel>
                  <Textarea
                    id="recovery-reason"
                    name="reason"
                    required
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    disabled={riskLocked}
                    aria-invalid={invalidField === "reason"}
                    aria-describedby="recovery-reason-help"
                    maxLength={1024}
                  />
                  <FieldDescription id="recovery-reason-help">
                    {t("Explain why you accept the risk. Maximum 1024 UTF-8 bytes.")}
                  </FieldDescription>
                </Field>
                <Field data-invalid={invalidField === "reference"} data-disabled={riskLocked}>
                  <FieldLabel htmlFor="recovery-reference">{t("Reference")}</FieldLabel>
                  <Input
                    id="recovery-reference"
                    name="reference"
                    required
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    disabled={riskLocked}
                    aria-invalid={invalidField === "reference"}
                    aria-describedby="recovery-reference-help"
                    maxLength={256}
                  />
                  <FieldDescription id="recovery-reference-help">
                    {t("Link an incident or decision record. Maximum 256 UTF-8 bytes.")}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="recovery-request-id">{t("Request ID")}</FieldLabel>
                  <Input id="recovery-request-id" name="requestId" readOnly value={requestId} className="font-mono" />
                </Field>
                <FieldSet disabled={riskLocked}>
                  <FieldLegend variant="label">{t("Acknowledge unverified data")}</FieldLegend>
                  <Field orientation="horizontal" data-invalid={invalidField === "risk"}>
                    <Checkbox
                      id="recovery-risk"
                      name="risk"
                      checked={risk}
                      onCheckedChange={(value) => setRisk(value === true)}
                      aria-invalid={invalidField === "risk"}
                    />
                    <FieldLabel htmlFor="recovery-risk">
                      {t("I accept the data risk. This does not verify data or remove the responsibility.")}
                    </FieldLabel>
                  </Field>
                  {!row.sourceBucketIncarnationId && (
                    <Field orientation="horizontal" data-invalid={invalidField === "unknown-source"}>
                      <Checkbox
                        id="recovery-unknown-source"
                        name="unknownSource"
                        checked={unknownSource}
                        onCheckedChange={(value) => setUnknownSource(value === true)}
                        aria-invalid={invalidField === "unknown-source"}
                      />
                      <FieldLabel htmlFor="recovery-unknown-source">
                        {t("I acknowledge that the original bucket identity is unknown.")}
                      </FieldLabel>
                    </Field>
                  )}
                  {row.status === "bucket_incarnation_changed" && (
                    <Field orientation="horizontal" data-invalid={invalidField === "changed-identity"}>
                      <Checkbox
                        id="recovery-changed-identity"
                        name="changedIdentity"
                        checked={changedIdentity}
                        onCheckedChange={(value) => setChangedIdentity(value === true)}
                        aria-invalid={invalidField === "changed-identity"}
                      />
                      <FieldLabel htmlFor="recovery-changed-identity">
                        {t("I acknowledge that the source and current bucket identities differ.")}
                      </FieldLabel>
                    </Field>
                  )}
                </FieldSet>
                {invalidField && (
                  <p role="alert" className="text-sm text-destructive">
                    {t("Complete the required fields and acknowledgments within their limits.")}
                  </p>
                )}
              </FieldGroup>
            </form>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => (showRisk ? setShowRisk(false) : onClose())}
            className="min-h-11 sm:min-h-0"
          >
            {t(showRisk ? "Back" : "Close")}
          </Button>
          {showRisk && (
            <Button type="submit" form="recovery-risk-form" disabled={riskLocked} className="min-h-11 sm:min-h-0">
              {busy && <Spinner data-icon="inline-start" />}
              {t("Record risk acceptance")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
