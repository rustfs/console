"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiDownloadLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Item, ItemContent, ItemHeader, ItemTitle } from "@/components/ui/item"
import { useObject } from "@/hooks/use-object"
import { useCapabilityChecks, usePermissions } from "@/hooks/use-permissions"
import { useMessage } from "@/lib/feedback/message"
import { downloadUrl } from "@/lib/export-file"
import { getAttachmentContentDisposition } from "@/lib/content-disposition"
import { normalizeDateToIso } from "@/lib/safe-date"
import { formatDateTimeWithOffset } from "@/lib/functions"

interface ObjectViewProps {
  bucketName: string
  objectKey: string
}

export function ObjectView({ bucketName, objectKey }: ObjectViewProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const objectApi = useObject(bucketName)
  const { canCapability, checkCapability } = usePermissions()
  const context = { bucket: bucketName, objectKey }
  const canDownload = canCapability("objects.download", context)
  useCapabilityChecks(objectKey ? [{ capability: "objects.download", context }] : [])
  const [object, setObject] = React.useState<Record<string, unknown> | null>(null)

  React.useEffect(() => {
    if (objectKey) {
      objectApi
        .getObjectInfo(objectKey)
        .then((info) => setObject(info as Record<string, unknown>))
        .catch(() => setObject(null))
    } else {
      setObject(null)
    }
  }, [objectKey, objectApi])

  const download = async () => {
    if (!canDownload || !objectKey) return
    try {
      if (!(await checkCapability("objects.download", context))) {
        message.error(t("Access Denied"))
        return
      }
      const filename = objectKey.split("/").pop() ?? ""
      const url = await objectApi.getSignedUrl(objectKey, 3600, getAttachmentContentDisposition(filename))
      downloadUrl(url, filename)
      message.success(t("Download ready"))
    } catch (err) {
      message.error((err as Error)?.message ?? t("Download Failed"))
    }
  }

  const lastModified = normalizeDateToIso((object?.LastModified as string | Date | undefined) ?? undefined)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canDownload ? (
          <Button variant="outline" size="sm" onClick={download}>
            <RiDownloadLine className="size-4" aria-hidden />
            {t("Download")}
          </Button>
        ) : null}
      </div>

      <Item variant="outline" className="flex-col items-stretch gap-4">
        <ItemHeader className="items-center">
          <ItemTitle>{t("Info")}</ItemTitle>
        </ItemHeader>
        <ItemContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">{t("Object Name")}</span>
            <span className="max-w-[60%] truncate" title={String(object?.Key ?? "")}>
              {String(object?.Key ?? "")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">{t("Object Size")}</span>
            <span>{String(object?.ContentLength ?? "-")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">{t("Object Type")}</span>
            <span className="max-w-[60%] truncate">{String(object?.ContentType ?? "-")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">ETag</span>
            <span>{String(object?.ETag ?? "-")}</span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="font-medium text-muted-foreground">{t("Last Modified Time")}</span>
            <time
              className="max-w-[60%] min-w-0 text-end"
              dateTime={lastModified || undefined}
              title={lastModified || undefined}
              dir="ltr"
            >
              {formatDateTimeWithOffset(lastModified, "-")}
            </time>
          </div>
        </ItemContent>
      </Item>
    </div>
  )
}
