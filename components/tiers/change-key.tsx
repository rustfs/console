"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { useTiers } from "@/hooks/use-tiers"
import { useMessage } from "@/lib/feedback/message"

interface TiersChangeKeyProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tierName: string
  onSuccess?: () => void
}

export function TiersChangeKey({ open, onOpenChange, tierName, onSuccess }: TiersChangeKeyProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { updateTiers } = useTiers()

  const [accessKey, setAccessKey] = React.useState("")
  const [secretKey, setSecretKey] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const submittingRef = React.useRef(false)

  React.useEffect(() => {
    if (open) {
      setAccessKey("")
      setSecretKey("")
    }
  }, [open])

  const closeModal = () => {
    if (submittingRef.current) return
    onOpenChange(false)
    setAccessKey("")
    setSecretKey("")
  }

  const submitForm = async () => {
    if (submittingRef.current) return
    if (!accessKey || !secretKey) {
      message.error(t("Please fill in the correct format"))
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    try {
      await updateTiers(tierName, {
        accessKey,
        secretKey,
      })
      message.success(t("Update Success"))
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      message.error((error as Error).message || t("Update Failed"))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submittingRef.current) onOpenChange(nextOpen)
      }}
      disablePointerDismissal={submitting}
    >
      <DialogContent className="sm:max-w-lg" aria-busy={submitting}>
        <DialogHeader>
          <DialogTitle>
            {t("Update Key")}：{tierName}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Field>
            <FieldLabel htmlFor="tier-change-access-key">{t("Access Key")}</FieldLabel>
            <FieldContent>
              <Input
                id="tier-change-access-key"
                name="tier-change-access-key"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder={t("Please enter Access Key")}
                autoComplete="off"
                spellCheck={false}
                disabled={submitting}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="tier-change-secret-key">{t("Secret Key")}</FieldLabel>
            <FieldContent>
              <Input
                id="tier-change-secret-key"
                name="tier-change-secret-key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                type="password"
                placeholder={t("Please enter Secret Key")}
                autoComplete="off"
                spellCheck={false}
                disabled={submitting}
              />
            </FieldContent>
          </Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={submitting}>
            {t("Cancel")}
          </Button>
          <Button onClick={submitForm} disabled={submitting}>
            {t("Submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
