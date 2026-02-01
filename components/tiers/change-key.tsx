"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { useTiers } from "@/hooks/use-tiers"
import { useMessage } from "@/lib/feedback/message"

interface TiersChangeKeyProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tierName: string
  onSuccess?: () => void
}

export function TiersChangeKey({
  open,
  onOpenChange,
  tierName,
  onSuccess,
}: TiersChangeKeyProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { updateTiers } = useTiers()

  const [accessKey, setAccessKey] = React.useState("")
  const [secretKey, setSecretKey] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setAccessKey("")
      setSecretKey("")
    }
  }, [open])

  const closeModal = () => {
    onOpenChange(false)
    setSubmitting(false)
    setAccessKey("")
    setSecretKey("")
  }

  const submitForm = async () => {
    if (!accessKey || !secretKey) {
      message.error(t("Please fill in the correct format"))
      return
    }
    setSubmitting(true)
    try {
      await updateTiers(tierName, {
        accessKey,
        secretKey,
      })
      message.success(t("Update Success"))
      onSuccess?.()
      closeModal()
    } catch (error) {
      message.error(
        (error as Error).message || t("Update Failed")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("Update Key")}：{tierName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel>{t("Access Key")}</FieldLabel>
            <FieldContent>
              <Input
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder={t("Please enter Access Key")}
                autoComplete="off"
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("Secret Key")}</FieldLabel>
            <FieldContent>
              <Input
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                type="password"
                placeholder={t("Please enter Secret Key")}
                autoComplete="off"
              />
            </FieldContent>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal}>
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
