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
import { useAccount } from "@/hooks/use-account"
import { isSubmittableCode } from "@/lib/mfa"
import { useMessage } from "@/lib/feedback/message"

interface MfaDisableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The identity being unprotected, named so the consequence is unambiguous. */
  accessKey: string
  onDisabled: () => void
}

/**
 * Turns two-factor authentication off.
 *
 * Destructive: it removes a protection, and the recovery codes go with it. So it
 * names the account, states the consequence, and asks for both factors — the
 * authenticator code *and* the account password. Requiring only the code would
 * let a session that someone walked away from strip the protection with a single
 * shoulder-surfed number.
 */
export function MfaDisableDialog({ open, onOpenChange, accessKey, onDisabled }: MfaDisableDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { disableMfa } = useAccount()

  const codeRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState({ code: "", password: "" })
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setCode("")
    setPassword("")
    setErrors({ code: "", password: "" })
    setSubmitError("")
    setSubmitting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (submitting && !nextOpen) return
    onOpenChange(nextOpen)
    if (!nextOpen) reset()
  }

  const submit = async () => {
    if (submitting) return

    const nextErrors = {
      code: !code
        ? t("Enter a code from your authenticator app or a recovery code")
        : isSubmittableCode(code)
          ? ""
          : t("That does not look like a valid code"),
      password: password ? "" : t("Please enter your current password"),
    }
    setErrors(nextErrors)
    if (nextErrors.code) {
      codeRef.current?.focus()
      return
    }
    if (nextErrors.password) {
      passwordRef.current?.focus()
      return
    }

    setSubmitting(true)
    setSubmitError("")
    try {
      await disableMfa(code, password)
      message.success(t("Two-factor authentication is off."))
      onDisabled()
      handleOpenChange(false)
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
        className="max-h-[min(90dvh,40rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg"
        aria-busy={submitting}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{t("Turn off two-factor authentication")}</DialogTitle>
          <DialogDescription>
            {t("{account} will be protected by its password alone, and the recovery codes will stop working.", {
              account: accessKey,
            })}
          </DialogDescription>
        </DialogHeader>

        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="mfa-disable-code">{t("Authentication code")}</FieldLabel>
              <FieldContent>
                <Input
                  id="mfa-disable-code"
                  ref={codeRef}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value)
                    setErrors((current) => ({ ...current, code: "" }))
                  }}
                  autoComplete="one-time-code"
                  inputMode="text"
                  spellCheck={false}
                  dir="ltr"
                  className="font-mono"
                  required
                  disabled={submitting}
                  aria-invalid={Boolean(errors.code)}
                  aria-describedby={errors.code ? "mfa-disable-code-error" : "mfa-disable-code-hint"}
                />
              </FieldContent>
              <FieldDescription id="mfa-disable-code-hint">
                {t("A 6-digit code, or one of your recovery codes.")}
              </FieldDescription>
              <FieldError id="mfa-disable-code-error">{errors.code}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="mfa-disable-password">{t("Current Password")}</FieldLabel>
              <FieldContent>
                <Input
                  id="mfa-disable-password"
                  ref={passwordRef}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setErrors((current) => ({ ...current, password: "" }))
                  }}
                  type="password"
                  autoComplete="current-password"
                  spellCheck={false}
                  required
                  disabled={submitting}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "mfa-disable-password-error" : undefined}
                />
              </FieldContent>
              <FieldError id="mfa-disable-password-error">{errors.password}</FieldError>
            </Field>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 border-t bg-muted/20 px-4 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? <Spinner className="size-4" /> : null}
              <span>{t("Turn off")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
