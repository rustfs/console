"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { CopyInput } from "@/components/copy-input"
import { download } from "@/lib/export-file"

export interface CredentialsData {
  credentials?: { accessKey?: string; secretKey?: string }
  url?: string
}

interface UserNoticeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: CredentialsData | null
  onClose?: () => void
}

export function UserNotice({ open, onOpenChange, data, onClose }: UserNoticeProps) {
  const { t } = useTranslation()
  const accessKey = data?.credentials?.accessKey ?? ""
  const secretKey = data?.credentials?.secretKey ?? ""
  const url = data?.url ?? ""

  const closeModal = React.useCallback(() => {
    onOpenChange(false)
    onClose?.()
  }, [onOpenChange, onClose])

  const exportFile = React.useCallback(() => {
    download(
      "credentials.json",
      JSON.stringify({
        url,
        accessKey,
        secretKey,
        api: "s3v4",
        path: "auto",
      })
    )
    closeModal()
  }, [url, accessKey, secretKey, closeModal])

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("New user has been created")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>{t("Access Key")}</FieldLabel>
            <FieldContent>
              <CopyInput
                value={accessKey}
                readOnly
                copyIcon
                className="w-full"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel>{t("Secret Key")}</FieldLabel>
            <FieldContent>
              <CopyInput
                value={secretKey}
                readOnly
                copyIcon
                className="w-full"
              />
            </FieldContent>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeModal}>
            {t("Cancel")}
          </Button>
          <Button variant="default" onClick={exportFile}>
            {t("Export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
