"use client"

import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAccount } from "@/hooks/use-account"
import { useMessage } from "@/lib/feedback/message"

/** Mirrors the server's `SECRET_KEY_MIN_LEN`. */
const PASSWORD_MIN_LENGTH = 8

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}

/**
 * Rotates the caller's own secret key.
 *
 * Asks for the current secret even though the request is already signed: the
 * console signs with a short-lived session, so a signature proves the session is
 * live, not that the person at the keyboard knows the password. Without this a
 * borrowed browser tab could change the account's credentials.
 */
export function ChangePasswordDialog({ open, onOpenChange, onChanged }: ChangePasswordDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { changePassword } = useAccount()

  const currentRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)

  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState({ current: "", next: "", confirm: "" })
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setCurrent("")
    setNext("")
    setConfirm("")
    setErrors({ current: "", next: "", confirm: "" })
    setSubmitError("")
    setSubmitting(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // Dismissal is blocked mid-flight so a half-applied rotation cannot be
    // hidden by an accidental click.
    if (submitting && !nextOpen) return
    onOpenChange(nextOpen)
    if (!nextOpen) reset()
  }

  const validate = () => {
    const nextErrors = {
      current: current ? "" : t("Please enter your current password"),
      next: !next
        ? t("Please enter new password")
        : next.length < PASSWORD_MIN_LENGTH
          ? t("Password must be at least 8 characters")
          : next === current
            ? t("The new password must be different from the current one")
            : "",
      confirm: !confirm
        ? t("Please enter new password again")
        : confirm !== next
          ? t("The two passwords are inconsistent")
          : "",
    }
    setErrors(nextErrors)

    // Focus the first invalid field rather than leaving the user to hunt for it.
    if (nextErrors.current) currentRef.current?.focus()
    else if (nextErrors.next) nextRef.current?.focus()
    else if (nextErrors.confirm) confirmRef.current?.focus()

    return !nextErrors.current && !nextErrors.next && !nextErrors.confirm
  }

  const submit = async () => {
    if (submitting || !validate()) return

    setSubmitting(true)
    setSubmitError("")
    try {
      const result = await changePassword(current, next)
      const revoked = result?.sessions_revoked ?? 0
      message.success(
        revoked > 0 ? t("Password updated. Other sessions have been signed out.") : t("Password updated."),
      )
      onChanged?.()
      handleOpenChange(false)
    } catch (error) {
      // Kept inline, not only as a toast: the user needs the reason next to the
      // form they must correct, and their input is preserved so they can.
      setSubmitError((error as Error)?.message || t("Update failed"))
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
          <DialogTitle>{t("Change Password")}</DialogTitle>
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
              <FieldLabel htmlFor="account-password-current">{t("Current Password")}</FieldLabel>
              <FieldContent>
                <Input
                  id="account-password-current"
                  ref={currentRef}
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  type="password"
                  autoComplete="current-password"
                  spellCheck={false}
                  required
                  disabled={submitting}
                  aria-invalid={Boolean(errors.current)}
                  aria-describedby={errors.current ? "account-password-current-error" : undefined}
                />
              </FieldContent>
              <FieldError id="account-password-current-error">{errors.current}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="account-password-new">{t("New Password")}</FieldLabel>
              <FieldContent>
                <Input
                  id="account-password-new"
                  ref={nextRef}
                  value={next}
                  onChange={(event) => setNext(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  spellCheck={false}
                  minLength={PASSWORD_MIN_LENGTH}
                  required
                  disabled={submitting}
                  aria-invalid={Boolean(errors.next)}
                  aria-describedby={errors.next ? "account-password-new-error" : "account-password-new-hint"}
                />
              </FieldContent>
              <FieldDescription id="account-password-new-hint">
                {t("At least 8 characters. This is also your S3 secret key.")}
              </FieldDescription>
              <FieldError id="account-password-new-error">{errors.next}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="account-password-confirm">{t("Confirm New Password")}</FieldLabel>
              <FieldContent>
                <Input
                  id="account-password-confirm"
                  ref={confirmRef}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  spellCheck={false}
                  required
                  disabled={submitting}
                  aria-invalid={Boolean(errors.confirm)}
                  aria-describedby={errors.confirm ? "account-password-confirm-error" : undefined}
                />
              </FieldContent>
              <FieldError id="account-password-confirm-error">{errors.confirm}</FieldError>
            </Field>

            <p className="text-sm text-muted-foreground">
              {t("Changing your password signs out your other sessions and invalidates the old secret key.")}
            </p>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-4 py-3">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner className="size-4" /> : null}
              <span>{t("Update Password")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
