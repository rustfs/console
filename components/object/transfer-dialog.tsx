"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { useS3 } from "@/contexts/s3-context"
import { useBucket } from "@/hooks/use-bucket"
import { usePermissions } from "@/hooks/use-permissions"
import { buildBucketPath } from "@/lib/bucket-path"
import { useMessage } from "@/lib/feedback/message"
import {
  ObjectTransferError,
  transferObject,
  validateObjectTransfer,
  type ObjectTransferProgress,
  type ObjectTransferRequest,
} from "@/lib/object-transfer"

interface ObjectTransferDialogProps {
  mode: ObjectTransferRequest["mode"]
  bucket: string
  objectKey: string
  onClose: () => void
  onRefresh: () => void
  returnFocus: () => HTMLElement | null
}

export function ObjectTransferDialog({
  mode,
  bucket,
  objectKey,
  onClose,
  onRefresh,
  returnFocus,
}: ObjectTransferDialogProps) {
  const { t } = useTranslation()
  const client = useS3()
  const message = useMessage()
  const { listBuckets } = useBucket()
  const { canCapability } = usePermissions()
  const [targetBucket, setTargetBucket] = React.useState(bucket)
  const [targetKey, setTargetKey] = React.useState(objectKey)
  const [buckets, setBuckets] = React.useState<string[]>([bucket])
  const [bucketLoadState, setBucketLoadState] = React.useState<"loading" | "loaded" | "error">("loading")
  const [bucketLoadAttempt, setBucketLoadAttempt] = React.useState(0)
  const [validation, setValidation] = React.useState<ReturnType<typeof validateObjectTransfer>>(null)
  const [error, setError] = React.useState<ObjectTransferError | null>(null)
  const [progress, setProgress] = React.useState<ObjectTransferProgress | null>(null)
  const submittingRef = React.useRef(false)
  const bucketRef = React.useRef<HTMLInputElement>(null)
  const keyRef = React.useRef<HTMLInputElement>(null)
  const id = React.useId()
  const request: ObjectTransferRequest = { mode, sourceBucket: bucket, sourceKey: objectKey, targetBucket, targetKey }
  const submitting = progress !== null
  const action = mode === "copy" ? t("Copy") : t("Move")

  React.useEffect(() => {
    let cancelled = false
    setBucketLoadState("loading")
    listBuckets({ force: bucketLoadAttempt > 0 })
      .then((response) => {
        if (cancelled) return
        setBuckets([
          ...new Set([bucket, ...(response.Buckets ?? []).flatMap((item) => (item.Name ? [item.Name] : []))]),
        ])
        setBucketLoadState("loaded")
      })
      .catch(() => {
        if (!cancelled) setBucketLoadState("error")
      })
    return () => {
      cancelled = true
    }
  }, [bucket, bucketLoadAttempt, listBuckets])

  React.useEffect(() => {
    if (!submitting) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [submitting])

  const submit = async () => {
    if (submittingRef.current || error?.copied) return
    const nextValidation = validateObjectTransfer(request)
    setValidation(nextValidation)
    setError(null)
    if (nextValidation) {
      ;(nextValidation.field === "bucket" ? bucketRef : keyRef).current?.focus()
      return
    }
    if (
      !canCapability(mode === "copy" ? "objects.copy" : "objects.move", { bucket, objectKey }) ||
      !canCapability("objects.transferDestination", { bucket: targetBucket, objectKey: targetKey })
    ) {
      setError(new ObjectTransferError("You do not have permission to transfer this object to the destination."))
      return
    }

    submittingRef.current = true
    try {
      await transferObject(client, request, setProgress)
      message.success(mode === "copy" ? t("Object copied") : t("Object moved"))
      onRefresh()
      onClose()
    } catch (cause) {
      setError(
        cause instanceof ObjectTransferError
          ? cause
          : new ObjectTransferError(
              "Copy could not be confirmed. The source was not deleted. Check the destination before retrying.",
              false,
              cause,
            ),
      )
      onRefresh()
    } finally {
      submittingRef.current = false
      setProgress(null)
    }
  }

  const targetPrefix = targetKey.slice(0, targetKey.lastIndexOf("/") + 1)
  const progressLabel =
    progress?.phase === "deleting"
      ? t("Removing the source object")
      : progress?.phase === "copying"
        ? t("Copying object")
        : t("Preparing object transfer")

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submittingRef.current) onClose()
      }}
      disablePointerDismissal
    >
      <DialogContent
        className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton={false}
        initialFocus={keyRef}
        finalFocus={returnFocus}
        aria-busy={submitting}
      >
        <DialogHeader className="px-4 pt-4 pb-3">
          <DialogTitle>{mode === "copy" ? t("Copy Object") : t("Move Object")}</DialogTitle>
          <DialogDescription className="truncate" title={`${bucket}/${objectKey}`}>
            {t("Source")}:{" "}
            <bdi>
              {bucket}/{objectKey}
            </bdi>
          </DialogDescription>
        </DialogHeader>
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
          noValidate
        >
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-1">
            {bucket.length + objectKey.length > 80 ? (
              <p className="break-all text-xs text-muted-foreground">
                {t("Source")}:{" "}
                <bdi>
                  {bucket}/{objectKey}
                </bdi>
              </p>
            ) : null}
            <FieldGroup>
              <Field data-invalid={validation?.field === "bucket"}>
                <FieldLabel htmlFor={`${id}-bucket`}>{t("Destination Bucket")}</FieldLabel>
                <Input
                  ref={bucketRef}
                  id={`${id}-bucket`}
                  name="destination-bucket"
                  className="min-h-11 sm:min-h-0"
                  list={`${id}-buckets`}
                  value={targetBucket}
                  onChange={(event) => {
                    setTargetBucket(event.target.value)
                    setValidation(null)
                    setError(null)
                  }}
                  disabled={submitting || error?.copied}
                  autoComplete="off"
                  spellCheck={false}
                  dir="ltr"
                  required
                  aria-invalid={validation?.field === "bucket"}
                  aria-describedby={`${id}-bucket-help${validation?.field === "bucket" ? ` ${id}-bucket-error` : ""}`}
                />
                <datalist id={`${id}-buckets`}>
                  {buckets.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <FieldDescription id={`${id}-bucket-help`}>
                  {bucketLoadState === "loading" ? <span role="status">{t("Loading")} </span> : null}
                  {bucketLoadState === "error"
                    ? t("Bucket suggestions could not be loaded. Enter a bucket name or retry.")
                    : t("Select or enter a bucket name on this server.")}
                  {bucketLoadState === "error" ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      disabled={submitting}
                      onClick={() => setBucketLoadAttempt((value) => value + 1)}
                    >
                      {t("Retry")}
                    </Button>
                  ) : null}
                </FieldDescription>
                {validation?.field === "bucket" ? (
                  <FieldError id={`${id}-bucket-error`}>{t(validation.message)}</FieldError>
                ) : null}
              </Field>
              <Field data-invalid={validation?.field === "key"}>
                <FieldLabel htmlFor={`${id}-key`}>{t("Destination Object Path")}</FieldLabel>
                <Input
                  ref={keyRef}
                  id={`${id}-key`}
                  name="destination-object-path"
                  className="min-h-11 sm:min-h-0"
                  value={targetKey}
                  onChange={(event) => {
                    setTargetKey(event.target.value)
                    setValidation(null)
                    setError(null)
                  }}
                  disabled={submitting || error?.copied}
                  autoComplete="off"
                  spellCheck={false}
                  dir="ltr"
                  required
                  aria-invalid={validation?.field === "key"}
                  aria-describedby={`${id}-key-help${validation?.field === "key" ? ` ${id}-key-error` : ""}`}
                />
                <FieldDescription id={`${id}-key-help`}>
                  {t("Use the full path, including the object name. Existing objects will not be overwritten.")}
                </FieldDescription>
                {validation?.field === "key" ? (
                  <FieldError id={`${id}-key-error`}>{t(validation.message)}</FieldError>
                ) : null}
              </Field>
            </FieldGroup>
            {mode === "move" ? (
              <p className="text-xs text-muted-foreground">
                {t("The source is deleted only after copying succeeds. Versioned buckets retain historical versions.")}
              </p>
            ) : null}
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>
                  <p>{t(error.message)}</p>
                  {error.cause instanceof Error ? <p className="break-words">{t(error.cause.message)}</p> : null}
                  {error.copied ? (
                    <p className="break-all">
                      <bdi>
                        {targetBucket}/{targetKey}
                      </bdi>
                    </p>
                  ) : null}
                  <Link className="underline" href={buildBucketPath(targetBucket, targetPrefix)} onClick={onClose}>
                    {t("View destination")}
                  </Link>
                </AlertDescription>
              </Alert>
            ) : null}
            {progress ? (
              <div className="flex flex-col gap-2" role="status" aria-live="polite">
                <div className="flex items-center gap-2">
                  <Spinner aria-hidden />
                  <span>{progressLabel}</span>
                </div>
                {progress.totalBytes > 5 * 1024 ** 3 && progress.phase === "copying" ? (
                  <Progress
                    className="w-full"
                    aria-label={t("Copying object")}
                    max={progress.totalBytes}
                    value={progress.copiedBytes}
                  />
                ) : null}
                <p className="text-xs text-muted-foreground">{t("Keep this page open until the transfer finishes.")}</p>
              </div>
            ) : null}
          </div>
          <DialogFooter className="p-4">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 sm:min-h-0"
              disabled={submitting}
              onClick={onClose}
            >
              {error?.copied ? t("Close") : t("Cancel")}
            </Button>
            {!error?.copied ? (
              <Button type="submit" className="min-h-11 sm:min-h-0" disabled={submitting}>
                {submitting ? <Spinner data-icon="inline-start" aria-hidden /> : null}
                {action}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
