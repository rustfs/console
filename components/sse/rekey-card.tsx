"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiRefreshLine } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useSSE } from "@/hooks/use-sse"
import { useMessage } from "@/lib/feedback/message"
import {
  buildRekeyStartRequest,
  isRekeyAlreadyRunningError,
  isRekeyNeverRanError,
  isRekeyUnsupportedError,
} from "@/lib/sse/rekey"
import type { KmsRekeyJobSnapshot } from "@/types/kms"

const POLL_INTERVAL_MS = 3000

function getRekeyStateBadgeVariant(state: KmsRekeyJobSnapshot["state"]) {
  if (state === "running") return "secondary" as const
  if (state === "cancelled") return "destructive" as const
  return "outline" as const
}

interface RekeyCardProps {
  rewrapSupported: boolean
}

export function RekeyCard({ rewrapSupported }: RekeyCardProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { startRekey, getRekeyStatus, cancelRekey } = useSSE()

  const [snapshot, setSnapshot] = React.useState<KmsRekeyJobSnapshot | null>(null)
  const [neverRan, setNeverRan] = React.useState(false)
  const [statusErrorMessage, setStatusErrorMessage] = React.useState<string | null>(null)
  const [loadingSnapshot, setLoadingSnapshot] = React.useState(rewrapSupported)
  const [startingSweep, setStartingSweep] = React.useState(false)
  const [cancellingSweep, setCancellingSweep] = React.useState(false)
  const [bucketsInput, setBucketsInput] = React.useState("")
  const [prefixInput, setPrefixInput] = React.useState("")
  const [confirmStartOpen, setConfirmStartOpen] = React.useState(false)
  const requestRef = React.useRef(0)

  const refreshSnapshot = React.useCallback(async () => {
    const requestId = ++requestRef.current
    try {
      const result = await getRekeyStatus()
      if (requestId !== requestRef.current) return
      setSnapshot(result)
      setNeverRan(false)
      setStatusErrorMessage(null)
    } catch (error) {
      if (requestId !== requestRef.current) return
      if (isRekeyNeverRanError(error)) {
        setSnapshot(null)
        setNeverRan(true)
        setStatusErrorMessage(null)
      } else {
        setStatusErrorMessage((error as Error).message || t("Failed to load rekey sweep status"))
      }
    } finally {
      if (requestId === requestRef.current) setLoadingSnapshot(false)
    }
  }, [getRekeyStatus, t])

  React.useEffect(() => {
    if (!rewrapSupported) return
    void refreshSnapshot()
  }, [refreshSnapshot, rewrapSupported])

  const isSweepRunning = snapshot?.state === "running"

  React.useEffect(() => {
    if (!isSweepRunning) return
    const intervalId = setInterval(() => {
      void refreshSnapshot()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [isSweepRunning, refreshSnapshot])

  const handleStartSweep = async () => {
    setConfirmStartOpen(false)
    setStartingSweep(true)
    try {
      const result = await startRekey(buildRekeyStartRequest(bucketsInput, prefixInput))
      requestRef.current++
      setSnapshot(result)
      setNeverRan(false)
      setStatusErrorMessage(null)
      message.success(t("Rekey sweep started"))
    } catch (error) {
      if (isRekeyAlreadyRunningError(error)) {
        message.warning(t("A rekey sweep is already running. Showing its progress."))
        await refreshSnapshot()
      } else if (isRekeyUnsupportedError(error)) {
        message.error(t("The configured KMS backend does not support rewrapping data-key envelopes."))
      } else {
        message.error((error as Error).message || t("Failed to start rekey sweep"))
      }
    } finally {
      setStartingSweep(false)
    }
  }

  const handleCancelSweep = async () => {
    setCancellingSweep(true)
    try {
      const result = await cancelRekey()
      requestRef.current++
      setSnapshot(result)
      message.success(t("Rekey sweep cancellation requested"))
    } catch (error) {
      if (isRekeyNeverRanError(error)) {
        setSnapshot(null)
        setNeverRan(true)
      } else {
        message.error((error as Error).message || t("Failed to cancel rekey sweep"))
      }
    } finally {
      setCancellingSweep(false)
    }
  }

  return (
    <>
      <Card className="shadow-none">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-base font-semibold sm:text-lg">{t("Rekey Existing Objects")}</h2>
              <CardDescription>
                {t(
                  "After rotating a master key, rewrap the data-key envelopes of existing objects to the current key version.",
                )}
              </CardDescription>
            </div>
            {rewrapSupported ? (
              <Button
                size="sm"
                variant="outline"
                disabled={loadingSnapshot || startingSweep || cancellingSweep}
                onClick={() => void refreshSnapshot()}
              >
                {loadingSnapshot ? <Spinner className="size-4" /> : <RiRefreshLine className="size-4" aria-hidden />}
                {t("Refresh")}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!rewrapSupported ? (
            <Alert>
              <AlertTitle>{t("Not available for this backend")}</AlertTitle>
              <AlertDescription>
                {t("The configured KMS backend does not support rewrapping data-key envelopes.")}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <FieldGroup className="grid gap-4 lg:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="rekeyBuckets">{t("Buckets")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="rekeyBuckets"
                      name="rekeyBuckets"
                      value={bucketsInput}
                      onChange={(event) => setBucketsInput(event.target.value)}
                      autoComplete="off"
                      placeholder={t("Leave blank to sweep all buckets")}
                      spellCheck={false}
                      disabled={isSweepRunning || startingSweep}
                    />
                  </FieldContent>
                  <FieldDescription>
                    {t("Comma-separated bucket names. Leave blank to sweep all buckets.")}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="rekeyPrefix">{t("Object Key Prefix")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="rekeyPrefix"
                      name="rekeyPrefix"
                      value={prefixInput}
                      onChange={(event) => setPrefixInput(event.target.value)}
                      autoComplete="off"
                      placeholder={t("Optional prefix such as photos/")}
                      spellCheck={false}
                      disabled={isSweepRunning || startingSweep}
                    />
                  </FieldContent>
                  <FieldDescription>{t("Only objects whose keys start with this prefix are swept.")}</FieldDescription>
                </Field>
              </FieldGroup>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {isSweepRunning ? (
                  <Button size="sm" variant="outline" disabled={cancellingSweep} onClick={handleCancelSweep}>
                    {cancellingSweep ? <Spinner className="size-4" /> : null}
                    {t("Cancel Sweep")}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  disabled={loadingSnapshot || isSweepRunning || startingSweep || Boolean(statusErrorMessage)}
                  onClick={() => setConfirmStartOpen(true)}
                >
                  {startingSweep ? <Spinner className="size-4" /> : null}
                  {t("Start Rekey Sweep")}
                </Button>
              </div>

              {statusErrorMessage ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("Failed to load rekey sweep status")}</AlertTitle>
                  <AlertDescription>{statusErrorMessage}</AlertDescription>
                </Alert>
              ) : loadingSnapshot ? (
                <div className="flex items-center justify-center border py-10">
                  <Spinner className="size-5" />
                </div>
              ) : neverRan ? (
                <div className="border border-dashed py-10 text-center text-sm text-muted-foreground">
                  {t("No rekey sweep has run yet")}
                </div>
              ) : snapshot ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={getRekeyStateBadgeVariant(snapshot.state)} className="uppercase">
                      {snapshot.state === "running"
                        ? t("Running")
                        : snapshot.state === "cancelled"
                          ? t("Sweep cancelled")
                          : t("Sweep completed")}
                    </Badge>
                    {isSweepRunning && snapshot.current_bucket ? (
                      <span className="break-all text-sm text-muted-foreground">
                        {t("Scanning bucket {bucket}", { bucket: snapshot.current_bucket })}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">{t("Versions scanned")}</p>
                      <p className="text-sm font-medium text-foreground">{snapshot.scanned}</p>
                    </div>
                    <div className="border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">{t("Rewrapped")}</p>
                      <p className="text-sm font-medium text-foreground">{snapshot.rewrapped}</p>
                    </div>
                    <div className="border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">{t("Already current")}</p>
                      <p className="text-sm font-medium text-foreground">{snapshot.already_current}</p>
                    </div>
                    <div className="border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">{t("Not applicable")}</p>
                      <p className="text-sm font-medium text-foreground">{snapshot.not_applicable}</p>
                    </div>
                    <div
                      className={
                        snapshot.failed > 0
                          ? "border border-destructive bg-destructive/10 p-3"
                          : "border bg-muted/40 p-3"
                      }
                    >
                      <p className={snapshot.failed > 0 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                        {t("Versions failed")}
                      </p>
                      <p
                        className={
                          snapshot.failed > 0
                            ? "text-sm font-medium text-destructive"
                            : "text-sm font-medium text-foreground"
                        }
                      >
                        {snapshot.failed}
                      </p>
                    </div>
                  </div>
                  {!isSweepRunning && snapshot.failed > 0 ? (
                    <Alert variant="destructive">
                      <AlertTitle>{t("Some object versions failed to rewrap")}</AlertTitle>
                      <AlertDescription>
                        {t(
                          "The sweep is idempotent: run it again to retry only the failed versions. Details are in the server log.",
                        )}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmStartOpen} onOpenChange={setConfirmStartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Start Rekey Sweep")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This scans the metadata of every selected object version and issues KMS calls to rewrap outdated envelopes. On large buckets this can take a long time.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartSweep}>{t("Start Rekey Sweep")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
