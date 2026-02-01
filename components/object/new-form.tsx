"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useObject } from "@/hooks/use-object"
import { useMessage } from "@/lib/feedback/message"
interface ObjectNewFormProps {
  show: boolean
  onShowChange: (show: boolean) => void
  bucketName: string
  prefix: string
  asPrefix?: boolean
  onSuccess?: () => void
}

function buildObjectKey(prefix: string, cleanedKey: string, suffix: string): string {
  const base = prefix ? prefix.replace(/\/$/, "") : ""
  const parts = base ? [base, cleanedKey] : [cleanedKey]
  return parts.filter(Boolean).join("/") + suffix
}

export function ObjectNewForm({
  show,
  onShowChange,
  bucketName,
  prefix,
  asPrefix = false,
  onSuccess,
}: ObjectNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const objectApi = useObject(bucketName)
  const [objectKey, setObjectKey] = React.useState("")

  const displayType = asPrefix ? t("New Folder") : t("New File")

  const handlePutObject = async () => {
    const suffix = asPrefix ? "/" : ""
    const cleanedKey = objectKey.replace(/^\/+|\/+$/g, "")
    const fullKey = buildObjectKey(prefix, cleanedKey, suffix)

    try {
      await objectApi.putObject(fullKey, "")
      onShowChange(false)
      setObjectKey("")
      message.success(t("Create Success"))
      onSuccess?.()
    } catch (err) {
      message.error((err as Error)?.message ?? t("Create Failed"))
    }
  }

  return (
    <Dialog open={show} onOpenChange={onShowChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("New Form", { type: displayType })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>{t("Overwrite Warning")}</AlertDescription>
          </Alert>
          <Input
            value={objectKey}
            onChange={(e) => setObjectKey(e.target.value)}
            placeholder={t("Name Placeholder", { type: displayType })}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onShowChange(false)}>
            {t("Close")}
          </Button>
          <Button
            variant="default"
            disabled={!objectKey.trim()}
            onClick={handlePutObject}
          >
            {t("Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
