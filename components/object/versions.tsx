"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiFileCopyLine, RiEyeLine, RiDownloadCloud2Line, RiDeleteBin5Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useObject } from "@/hooks/use-object"
import { useMessage } from "@/lib/feedback/message"
import { exportFile } from "@/lib/export-file"
import { getContentType } from "@/lib/mime-types"
import { formatBytes } from "@/lib/functions"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { useS3 } from "@/contexts/s3-context"
import type { ColumnDef } from "@tanstack/react-table"
import dayjs from "dayjs"

interface VersionRow {
  VersionId?: string
  LastModified?: Date
  Size?: number
  Key?: string
}

interface ObjectVersionsProps {
  bucketName: string
  objectKey: string
  visible: boolean
  onClose: () => void
  onPreview: (versionId: string) => void
  onRefreshParent: () => void
}

export function ObjectVersions({
  bucketName,
  objectKey,
  visible,
  onClose,
  onPreview,
  onRefreshParent,
}: ObjectVersionsProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const objectApi = useObject(bucketName)
  const client = useS3()

  const [versions, setVersions] = React.useState<VersionRow[]>([])
  const [loading, setLoading] = React.useState(false)

  const fetchVersions = React.useCallback(async () => {
    if (!objectKey) return
    setLoading(true)
    try {
      const response = await objectApi.listObjectVersions(objectKey)
      setVersions((response as { Versions?: VersionRow[] }).Versions ?? [])
    } catch {
      message.error(t("Failed to fetch versions"))
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [objectKey, objectApi, message, t])

  React.useEffect(() => {
    if (visible) fetchVersions()
  }, [visible, fetchVersions])

  const copyVersionId = React.useCallback(
    async (versionId: string) => {
      if (!versionId) return
      try {
        await navigator.clipboard.writeText(versionId)
        message.success(t("Copy Success"))
      } catch {
        message.error(t("Copy Failed"))
      }
    },
    [message, t],
  )

  const getSignedUrlWithVersion = React.useCallback(
    async (key: string, versionId: string, expiresIn = 3600) => {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        VersionId: versionId === "00000000-0000-0000-0000-000000000000" ? undefined : versionId,
      })
      return getSignedUrl(client, command, { expiresIn })
    },
    [bucketName, client],
  )

  const downloadVersion = React.useCallback(
    async (row: VersionRow) => {
      const versionId = row.VersionId ?? ""
      try {
        const url = await getSignedUrlWithVersion(objectKey, versionId)
        const response = await fetch(url)
        const filename = objectKey.split("/").pop() ?? ""
        const headers: Record<string, string> = {
          "content-type": getContentType(response.headers, filename),
          filename: response.headers.get("content-disposition")?.split("filename=")[1] ?? "",
        }
        const blob = await response.blob()
        exportFile({ headers, data: blob }, filename)
      } catch (err) {
        message.error((err as Error)?.message ?? t("Download Failed"))
      }
    },
    [getSignedUrlWithVersion, objectKey, message, t],
  )

  const deleteVersion = React.useCallback(
    async (row: VersionRow) => {
      const versionId = row.VersionId
      if (!versionId) return
      try {
        await objectApi.deleteObject(objectKey, versionId)
        message.success(t("Delete Success"))
        fetchVersions()
        onRefreshParent()
      } catch (err) {
        message.error((err as Error)?.message ?? t("Delete Failed"))
      }
    },
    [objectApi, objectKey, message, t, fetchVersions, onRefreshParent],
  )

  const columns: ColumnDef<VersionRow>[] = React.useMemo(
    () => [
      {
        id: "versionId",
        header: () => t("VersionId"),
        cell: ({ row }) => {
          const versionId = row.original.VersionId ?? ""
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{versionId}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => copyVersionId(versionId)}
                title={t("Copy")}
              >
                <RiFileCopyLine className="size-3.5" />
              </Button>
            </div>
          )
        },
      },
      {
        id: "lastModified",
        header: () => t("LastModified"),
        cell: ({ row }) =>
          row.original.LastModified ? dayjs(row.original.LastModified).format("YYYY-MM-DD HH:mm:ss") : "",
      },
      {
        id: "size",
        header: () => t("Size"),
        cell: ({ row }) => (typeof row.original.Size === "number" ? formatBytes(row.original.Size) : ""),
      },
      {
        id: "actions",
        header: () => t("Action"),
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPreview(row.original.VersionId ?? "")}>
              <RiEyeLine className="size-4" />
              {t("Preview")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadVersion(row.original)}>
              <RiDownloadCloud2Line className="size-4" />
              {t("Download")}
            </Button>
            <Button variant="destructive" size="sm" className="text-white" onClick={() => deleteVersion(row.original)}>
              <RiDeleteBin5Line className="size-4" />
              {t("Delete")}
            </Button>
          </div>
        ),
      },
    ],
    [t, onPreview, copyVersionId, downloadVersion, deleteVersion],
  )

  const { table } = useDataTable<VersionRow>({
    data: versions,
    columns,
  })

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t("Object Versions")}</DialogTitle>
        </DialogHeader>
        <DataTable table={table} isLoading={loading} emptyTitle={t("No Versions")} />
      </DialogContent>
    </Dialog>
  )
}
