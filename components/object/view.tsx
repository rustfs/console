"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiDownloadLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Item, ItemContent, ItemHeader, ItemTitle } from "@/components/ui/item"
import { useObject } from "@/hooks/use-object"
import { useMessage } from "@/lib/feedback/message"
import { exportFile } from "@/lib/export-file"
import { getContentType } from "@/lib/mime-types"

interface ObjectViewProps {
  bucketName: string
  objectKey: string
}

export function ObjectView({ bucketName, objectKey }: ObjectViewProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const objectApi = useObject(bucketName)
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
    if (!object?.Key) return
    try {
      const url = await objectApi.getSignedUrl(object.Key as string)
      const response = await fetch(url)
      const filename = (object.Key as string).split("/").pop() ?? ""
      const headers: Record<string, string> = {
        "content-type": getContentType(response.headers, filename),
        filename:
          response.headers.get("content-disposition")?.split("filename=")[1] ?? "",
      }
      const blob = await response.blob()
      exportFile({ headers, data: blob }, filename)
    } catch (err) {
      message.error((err as Error)?.message ?? t("Download Failed"))
    }
  }

  const lastModified = object?.LastModified
    ? new Date(object.LastModified as string).toISOString()
    : ""

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={download}>
          <RiDownloadLine className="size-4" />
          {t("Download")}
        </Button>
      </div>

      <Item variant="outline" className="flex-col items-stretch gap-4">
        <ItemHeader className="items-center">
          <ItemTitle>{t("Info")}</ItemTitle>
        </ItemHeader>
        <ItemContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">
              {t("Object Name")}
            </span>
            <span className="max-w-[60%] truncate" title={String(object?.Key ?? "")}>
              {String(object?.Key ?? "")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">
              {t("Object Size")}
            </span>
            <span>{String(object?.ContentLength ?? "-")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">
              {t("Object Type")}
            </span>
            <span className="max-w-[60%] truncate">
              {String(object?.ContentType ?? "-")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">ETag</span>
            <span>{String(object?.ETag ?? "-")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">
              {t("Last Modified Time")}
            </span>
            <span>{lastModified || "-"}</span>
          </div>
        </ItemContent>
      </Item>
    </div>
  )
}
