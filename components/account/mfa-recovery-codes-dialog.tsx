"use client"

import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { RecoveryCodesPanel } from "@/components/account/recovery-codes-panel"
import { useAccount } from "@/hooks/use-account"
import { isSubmittableCode } from "@/lib/mfa"

interface MfaRecoveryCodesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegenerated: () => void
}

/**
 * Replaces the recovery code set.
 *
 * Requires a current second factor first: regenerating is equivalent to minting
 * ten new bypasses for the account, so it must not be reachable from a session
 * alone. Generating also invalidates the previous set, which the copy says
 * plainly because a user who keeps the old printout would otherwise be locked
 * out believing they were safe.
 */
export function MfaRecoveryCodesDialog({ open, onOpenChange, onRegenerated }: MfaRecoveryCodesDialogProps) {
  const { t } = useTranslation()
  const { regenerateRecoveryCodes } = useAccount()
  const codeRef = useRef<HTMLInputElement>(null)

  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState("")
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [codes, setCodes] = useState<string[] | null>(null)

  const reset = () => {
    setCode("")
    setCodeError("")
    setSubmitError("")
    setSubmitting(false)
    setCodes(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // Same rule as setup: while the new codes are on screen they exist nowhere
    // else, so the panel owns dismissal.
    if (!nextOpen && codes) return
    if (!nextOpen && submitting) return
    onOpenChange(nextOpen)
    if (!nextOpen) reset()
  }

  const submit = async () => {
    if (submitting) return
    if (!isSubmittableCode(code)) {
      setCodeError(code ? t("That does not look like a valid code") : t("Enter a code from your authenticator app"))
      codeRef.current?.focus()
      return
    }

    setSubmitting(true)
    setSubmitError("")
    try {
      const result = await regenerateRecoveryCodes(code)
      setCodes(result?.recovery_codes ?? [])
    } catch (error) {
      setSubmitError((error as Error)?.message || t("Update failed"))
      setCode("")
      codeRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        className="max-h-[min(90dvh,44rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg"
        aria-busy={submitting}
        showCloseButton={!codes}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{codes ? t("Save your recovery codes") : t("Generate new recovery codes")}</DialogTitle>
          <DialogDescription>
            {codes
              ? t("Your previous recovery codes no longer work.")
              : t("Your existing recovery codes will stop working.")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {codes ? (
            <RecoveryCodesPanel
              codes={codes}
              acknowledgeLabel={t("Done")}
              onAcknowledge={() => {
                onRegenerated()
                onOpenChange(false)
                reset()
              }}
            />
          ) : (
            <form
              id="mfa-recovery-codes-form"
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <Field>
                <FieldLabel htmlFor="mfa-regenerate-code">{t("Authentication code")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="mfa-regenerate-code"
                    ref={codeRef}
                    value={code}
                    onChange={(event) => {
                      setCode(event.target.value)
                      setCodeError("")
                    }}
                    autoComplete="one-time-code"
                    spellCheck={false}
                    dir="ltr"
                    className="font-mono"
                    required
                    disabled={submitting}
                    aria-invalid={Boolean(codeError)}
                    aria-describedby={codeError ? "mfa-regenerate-code-error" : "mfa-regenerate-code-hint"}
                  />
                </FieldContent>
                <FieldDescription id="mfa-regenerate-code-hint">
                  {t("A 6-digit code, or one of your recovery codes.")}
                </FieldDescription>
                <FieldError id="mfa-regenerate-code-error">{codeError}</FieldError>
              </Field>
            </form>
          )}
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3">
          {codes ? (
            <p className="text-sm text-muted-foreground">{t("These codes are shown only once.")}</p>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
                {t("Cancel")}
              </Button>
              <Button type="submit" form="mfa-recovery-codes-form" disabled={submitting}>
                {submitting ? <Spinner className="size-4" /> : null}
                <span>{t("Generate")}</span>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
