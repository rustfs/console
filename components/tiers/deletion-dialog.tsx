"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog"
import { useTiers } from "@/hooks/use-tiers"
import { useMessage } from "@/lib/feedback/message"
import {
  canRetryTierDeletion,
  isTierDeletionUnsupported,
  parseTierCleanupRetry,
  parseTierDeletionCheck,
  tierDeletionReasonKeys,
  type TierDeletionCheck,
} from "@/lib/tier-deletion"

interface TierDeletionDialogProps {
  tierName: string
  originalError: string
  onClose: () => void
  onDeleted: () => void
}

export function TierDeletionDialog({ tierName, originalError, onClose, onDeleted }: TierDeletionDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { checkTierDeletion, retryTierCleanup, removeTiers } = useTiers()
  const [check, setCheck] = React.useState<TierDeletionCheck | null>(null)
  const [error, setError] = React.useState("")
  const [retryStatus, setRetryStatus] = React.useState("")
  const [busy, setBusy] = React.useState(true)
  const [deleteError, setDeleteError] = React.useState(originalError)
  const generation = React.useRef(0)
  const pending = React.useRef(false)

  const runCheck = React.useCallback(async () => {
    if (pending.current) return
    pending.current = true
    const request = generation.current
    setBusy(true)
    setError("")
    setCheck(null)
    try {
      const response = await checkTierDeletion(tierName)
      if (request !== generation.current) return
      const result = parseTierDeletionCheck(response, tierName)
      setCheck(result)
      if (!result)
        setError(t("The server returned an unrecognized diagnosis. The original deletion error still applies."))
    } catch (caught) {
      if (request !== generation.current) return
      setError(
        isTierDeletionUnsupported(caught)
          ? t("This server does not support tier deletion diagnostics. The original deletion error still applies.")
          : (caught as Error).message || t("Unable to check tier deletion. Recheck to try again."),
      )
    } finally {
      if (request === generation.current) {
        pending.current = false
        setBusy(false)
      }
    }
  }, [checkTierDeletion, tierName, t])

  React.useEffect(() => {
    pending.current = false
    setRetryStatus("")
    setDeleteError(originalError)
    void runCheck()
    return () => {
      generation.current += 1
    }
  }, [runCheck, originalError])

  const retryCleanup = async () => {
    if (pending.current || !check?.reasons.includes("CLEANUP_PENDING")) return
    pending.current = true
    const request = generation.current
    setBusy(true)
    setError("")
    setRetryStatus("")
    try {
      const response = parseTierCleanupRetry(await retryTierCleanup(tierName), tierName)
      if (request !== generation.current) return
      if (response.status === "accepted") {
        setRetryStatus(
          t(
            "A limited object cleanup retry pass was accepted. Cleanup may still be pending. Recheck, then retry deletion.",
          ) + (response.scanTruncated ? ` ${t("The scan reached a limit; additional cleanup may remain.")}` : ""),
        )
      } else if (response.status === "busy") {
        setRetryStatus(t("Cleanup retry was deferred because the lock could not be acquired. Try again later."))
      } else {
        setRetryStatus(t("The server returned an unknown cleanup retry status. Recheck before taking further action."))
      }
    } catch (caught) {
      if (request !== generation.current) return
      setError(
        isTierDeletionUnsupported(caught)
          ? t("This server does not support object cleanup retry. Background recovery continues automatically.")
          : (caught as Error).message || t("Object cleanup retry failed. Try again later."),
      )
    } finally {
      if (request === generation.current) {
        pending.current = false
        setBusy(false)
      }
    }
  }

  const retryDelete = async () => {
    if (pending.current || !canRetryTierDeletion(check)) return
    pending.current = true
    const request = generation.current
    setBusy(true)
    setError("")
    try {
      await removeTiers(tierName)
      if (request !== generation.current) return
      message.success(t("Delete Success"))
      onDeleted()
      onClose()
    } catch (caught) {
      if (request !== generation.current) return
      setDeleteError((caught as Error).message || t("Delete Failed"))
      setCheck(null)
      setRetryStatus("")
    } finally {
      if (request === generation.current) {
        pending.current = false
        setBusy(false)
      }
    }
  }

  return (
    <Dialog
      open
      disablePointerDismissal={busy}
      onOpenChange={(open) => {
        if (!open && !pending.current) onClose()
      }}
    >
      <DialogContent className="sm:max-w-xl" aria-busy={busy}>
        <DialogHeader>
          <DialogTitle>{t("Tier deletion check")}</DialogTitle>
          <DialogDescription className="break-all">{tierName}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Alert variant="destructive" role="alert">
            <AlertTitle>{t("Delete Failed")}</AlertTitle>
            <AlertDescription className="break-words">{deleteError}</AlertDescription>
          </Alert>
          <div role="status" aria-live="polite" className="space-y-3 text-sm">
            {busy ? <p>{t("Checking or submitting request…")}</p> : null}
            {check ? (
              <>
                {canRetryTierDeletion(check) ? (
                  <p>
                    {t(
                      "No local blockers were found in this check. Retry deletion to ask the server to remove the tier configuration.",
                    )}
                  </p>
                ) : (
                  <>
                    <p className="font-medium">{t("Observed deletion blocker")}</p>
                    <ul className="list-disc space-y-2 ps-5">
                      {(check.reasons.length ? check.reasons : ["PROOF_INCOMPLETE"]).map((kind, index) => (
                        <li key={`${kind}-${index}`}>
                          {t(
                            Object.hasOwn(tierDeletionReasonKeys, kind)
                              ? tierDeletionReasonKeys[kind]
                              : "The server reported an unrecognized blocker. The original deletion error still applies.",
                          )}
                        </li>
                      ))}
                    </ul>
                    <p className="text-muted-foreground">
                      {t(
                        "The check may stop after the first blocker. Other blockers may remain; recheck after resolving it.",
                      )}
                    </p>
                  </>
                )}
              </>
            ) : null}
            {retryStatus ? <p>{retryStatus}</p> : null}
          </div>
          {error ? (
            <p role="alert" className="break-words text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {t(
              "Remote storage reachability was not checked. The final deletion request always decides whether deletion is safe.",
            )}
          </p>
          {check?.reasons.includes("CLEANUP_PENDING") ? (
            <p className="text-sm text-muted-foreground">
              {t(
                "Retry runs a limited pass for free-version object cleanup on this tier. It does not complete all recovery work or delete the tier. Automatic background recovery continues.",
              )}
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter className="sm:flex-wrap">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
            {t("Close")}
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void runCheck()}>
            {t("Recheck")}
          </Button>
          {check?.reasons.includes("CLEANUP_PENDING") ? (
            <Button type="button" disabled={busy} onClick={() => void retryCleanup()}>
              {t("Retry object cleanup")}
            </Button>
          ) : null}
          {canRetryTierDeletion(check) ? (
            <Button type="button" variant="destructive" disabled={busy} onClick={() => void retryDelete()}>
              {t("Retry deletion")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
