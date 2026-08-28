"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
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
import { CopyInput } from "@/components/copy-input"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { RecoveryCodesPanel } from "@/components/account/recovery-codes-panel"
import { useAccount } from "@/hooks/use-account"
import { formatManualSetupKey, qrSvgToDataUri, TOTP_CODE_LENGTH, type MfaEnrollment } from "@/lib/mfa"

type Step = "loading" | "scan" | "codes" | "failed"

interface MfaSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after the factor is active and the codes are acknowledged. */
  onCompleted: () => void
}

/**
 * Turning on two-factor authentication, start to finish.
 *
 * One dialog with internal steps rather than a chain of dialogs: the design
 * guide rules out nesting, and this is one decision ("protect this account")
 * even though it takes three screens. Keeping it in one surface also means the
 * recovery codes cannot be orphaned by a parent closing underneath them.
 *
 * The secret lives in component state only. It is never written to storage, and
 * it disappears when the dialog unmounts.
 */
export function MfaSetupDialog({ open, onOpenChange, onCompleted }: MfaSetupDialogProps) {
  const { t } = useTranslation()
  const { enrollMfa, activateMfa } = useAccount()
  const codeInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("loading")
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null)
  const [loadError, setLoadError] = useState("")
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  const startEnrollment = useCallback(async () => {
    setStep("loading")
    setLoadError("")
    setCode("")
    setCodeError("")
    try {
      const result = await enrollMfa()
      if (!result) {
        setLoadError(t("API not ready"))
        setStep("failed")
        return
      }
      setEnrollment(result)
      setStep("scan")
    } catch (error) {
      setLoadError((error as Error)?.message || t("Failed to get data"))
      setStep("failed")
    }
  }, [enrollMfa, t])

  useEffect(() => {
    if (!open) return
    void startEnrollment()
  }, [open, startEnrollment])

  const reset = () => {
    setStep("loading")
    setEnrollment(null)
    setLoadError("")
    setCode("")
    setCodeError("")
    setVerifying(false)
    setRecoveryCodes([])
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // Once the codes are on screen they exist nowhere else, so this step owns
    // its own dismissal through the acknowledge button.
    if (!nextOpen && step === "codes") return
    if (!nextOpen && verifying) return
    onOpenChange(nextOpen)
    if (!nextOpen) reset()
  }

  const verify = async () => {
    if (verifying) return
    if (code.length !== TOTP_CODE_LENGTH) {
      setCodeError(t("Enter the 6-digit code from your authenticator app"))
      codeInputRef.current?.focus()
      return
    }

    setVerifying(true)
    setCodeError("")
    try {
      const result = await activateMfa(code)
      setRecoveryCodes(result?.recovery_codes ?? [])
      setStep("codes")
    } catch (error) {
      setCodeError((error as Error)?.message || t("Invalid verification code"))
      setCode("")
      codeInputRef.current?.focus()
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        className="max-h-[min(90dvh,44rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg"
        aria-busy={step === "loading" || verifying}
        showCloseButton={step !== "codes"}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{step === "codes" ? t("Save your recovery codes") : t("Two-factor authentication")}</DialogTitle>
          <DialogDescription>
            {step === "codes"
              ? t("Two-factor authentication is now on.")
              : t("Scan this QR code with your authenticator app.")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {step === "loading" && (
            <div className="space-y-4" aria-live="polite">
              <Skeleton className="mx-auto size-48" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {step === "failed" && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
              {/* Retry sits with the failure it addresses. */}
              <Button type="button" variant="outline" onClick={() => void startEnrollment()}>
                {t("Retry")}
              </Button>
            </div>
          )}

          {step === "scan" && enrollment && (
            <div className="space-y-5">
              <div className="flex justify-center">
                <Image
                  // Server-rendered SVG, embedded as data rather than injected
                  // as markup so it can never become a script sink.
                  src={qrSvgToDataUri(enrollment.qr_svg)}
                  alt={t("QR code for two-factor authentication setup")}
                  width={192}
                  height={192}
                  className="size-48 border bg-white p-2"
                  unoptimized
                />
              </div>

              <Field>
                <FieldLabel htmlFor="mfa-manual-key">{t("Can't scan? Manual setup key")}</FieldLabel>
                <FieldContent>
                  <CopyInput
                    id="mfa-manual-key"
                    value={formatManualSetupKey(enrollment.secret_base32)}
                    readonly
                    className="font-mono"
                    dir="ltr"
                  />
                </FieldContent>
                <FieldDescription>
                  {t("Time-based, {digits} digits, {period}s period.", {
                    digits: enrollment.digits,
                    period: enrollment.period_seconds,
                  })}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="mfa-setup-code">{t("Enter the 6-digit code")}</FieldLabel>
                <FieldContent>
                  <InputOTP
                    id="mfa-setup-code"
                    ref={codeInputRef}
                    maxLength={TOTP_CODE_LENGTH}
                    value={code}
                    onChange={(value) => {
                      setCode(value)
                      setCodeError("")
                    }}
                    onComplete={() => void verify()}
                    disabled={verifying}
                    autoFocus
                    // Codes are always LTR even in a right-to-left locale.
                    dir="ltr"
                    aria-invalid={Boolean(codeError)}
                    aria-describedby={codeError ? "mfa-setup-code-error" : undefined}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: TOTP_CODE_LENGTH }, (_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </FieldContent>
                <FieldError id="mfa-setup-code-error">{codeError}</FieldError>
              </Field>
            </div>
          )}

          {step === "codes" && (
            <RecoveryCodesPanel
              codes={recoveryCodes}
              acknowledgeLabel={t("Done")}
              onAcknowledge={() => {
                onCompleted()
                onOpenChange(false)
                reset()
              }}
            />
          )}
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3">
          {step === "codes" ? (
            <p className="text-sm text-muted-foreground">{t("These codes are shown only once.")}</p>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={verifying}>
                {t("Cancel")}
              </Button>
              <Button type="button" onClick={() => void verify()} disabled={step !== "scan" || verifying}>
                {verifying ? <Spinner className="size-4" /> : null}
                <span>{t("Verify and enable")}</span>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
