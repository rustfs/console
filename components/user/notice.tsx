"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiDownloadLine, RiErrorWarningLine } from "@remixicon/react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  title?: string
}

export function UserNotice({ open, onOpenChange, data, onClose, title }: UserNoticeProps) {
  const { t } = useTranslation()
  const accessKey = data?.credentials?.accessKey ?? ""
  const secretKey = data?.credentials?.secretKey ?? ""
  const url = data?.url ?? ""
  const hasCredentials = Boolean(accessKey && secretKey)

  const closeModal = React.useCallback(() => {
    onOpenChange(false)
    onClose?.()
  }, [onOpenChange, onClose])

  const exportFile = React.useCallback(() => {
    if (!accessKey || !secretKey) return
    download(
      "credentials.json",
      JSON.stringify({
        url,
        accessKey,
        secretKey,
        api: "s3v4",
        path: "auto",
      }),
    )
    closeModal()
  }, [url, accessKey, secretKey, closeModal])

  return (
    <Dialog open={open} onOpenChange={() => undefined} disablePointerDismissal>
      <DialogContent
        className="max-h-[min(90dvh,40rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>{title ?? t("New user has been created")}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4">
          <div className="flex gap-3 border bg-muted/30 p-3" role="note">
            <RiErrorWarningLine className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{t("Warning")}</p>
              <p className="text-sm text-muted-foreground">
                {t("The secret key is shown only once. Copy or export it before closing.")}
              </p>
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="created-access-key">{t("Access Key")}</FieldLabel>
            <FieldContent>
              <CopyInput
                id="created-access-key"
                value={accessKey}
                readOnly
                copyIcon
                copyLabel={`${t("Copy")} ${t("Access Key")}`}
                aria-label={t("Access Key")}
                className="w-full"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="created-secret-key">{t("Secret Key")}</FieldLabel>
            <FieldContent>
              <CopyInput
                id="created-secret-key"
                value={secretKey}
                readOnly
                copyIcon
                copyLabel={`${t("Copy")} ${t("Secret Key")}`}
                aria-label={t("Secret Key")}
                className="w-full"
              />
            </FieldContent>
          </Field>
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3">
          <Button type="button" variant="outline" onClick={closeModal}>
            {t("Close")}
          </Button>
          <Button type="button" variant="default" onClick={exportFile} disabled={!hasCredentials}>
            <RiDownloadLine className="size-4" aria-hidden />
            {t("Download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
