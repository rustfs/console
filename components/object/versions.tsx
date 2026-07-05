"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiFileCopyLine, RiEyeLine, RiDownloadCloud2Line, RiDeleteBin5Line, RiLoopLeftLine } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useObject } from "@/hooks/use-object"
import { usePermissions } from "@/hooks/use-permissions"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { copyToClipboard } from "@/lib/clipboard"
import { exportFile } from "@/lib/export-file"
import { getContentType } from "@/lib/mime-types"
import { formatBytes, formatDateTime } from "@/lib/functions"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { useS3 } from "@/contexts/s3-context"
import type { ColumnDef } from "@tanstack/react-table"

interface VersionRow {
  VersionId?: string
  LastModified?: Date
  Size?: number
  Key?: string
  IsLatest?: boolean
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
  const dialog = useDialog()
  const { listObjectVersions, deleteObject, restoreObjectVersion } = useObject(bucketName)
  const { canCapability } = usePermissions()
  const client = useS3()

  const [versions, setVersions] = React.useState<VersionRow[]>([])
  const [loading, setLoading] = React.useState(false)

  const fetchVersions = React.useCallback(async () => {
    if (!objectKey) return
    setLoading(true)
    try {
      const response = await listObjectVersions(objectKey)
      setVersions((response as { Versions?: VersionRow[] }).Versions ?? [])
    } catch {
      message.error(t("Failed to fetch versions"))
      setVersions([])
    } finally {
      setLoading(false)
    }
  }, [objectKey, listObjectVersions, message, t])

  React.useEffect(() => {
    if (visible) fetchVersions()
  }, [visible, fetchVersions])

  const copyVersionId = React.useCallback(
    async (versionId: string) => {
      if (!versionId) return
      try {
        await copyToClipboard(versionId)
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
        await deleteObject(objectKey, versionId)
        message.success(t("Delete Success"))
        void fetchVersions()
        onRefreshParent()
      } catch (err) {
        message.error((err as Error)?.message ?? t("Delete Failed"))
      }
    },
    [deleteObject, objectKey, message, t, fetchVersions, onRefreshParent],
  )

  const restoreVersion = React.useCallback(
    (row: VersionRow) => {
      const versionId = row.VersionId
      if (!versionId || row.IsLatest) return

      dialog.warning({
        title: t("Restore Version"),
        content: t("This will copy the selected historical version and make it the current object version."),
        positiveText: t("Restore"),
        negativeText: t("Cancel"),
        onPositiveClick: async () => {
          try {
            await restoreObjectVersion(objectKey, versionId)
            message.success(t("Restore Success"))
            await fetchVersions()
            onRefreshParent()
          } catch (err) {
            message.error((err as Error)?.message ?? t("Restore Failed"))
            return false
          }
        },
      })
    },
    [dialog, fetchVersions, message, objectKey, onRefreshParent, restoreObjectVersion, t],
  )

  const versionStats = React.useMemo(
    () => ({
      count: versions.length,
      totalSize: versions.reduce((total, row) => total + (typeof row.Size === "number" ? row.Size : 0), 0),
    }),
    [versions],
  )

  const columns: ColumnDef<VersionRow>[] = React.useMemo(
    () => [
      {
        id: "versionId",
        accessorKey: "VersionId",
        enableSorting: false,
        header: () => t("VersionId"),
        cell: ({ row }) => {
          const versionId = row.original.VersionId ?? ""
          return (
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate font-mono text-sm" title={versionId}>
                {versionId}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0"
                onClick={() => copyVersionId(versionId)}
                title={t("Copy")}
                aria-label={t("Copy")}
              >
                <RiFileCopyLine className="size-3" aria-hidden />
              </Button>
              {row.original.IsLatest ? (
                <Badge variant="secondary" className="shrink-0">
                  {t("Current")}
                </Badge>
              ) : null}
            </div>
          )
        },
        meta: { minWidth: 300 },
      },
      {
        id: "lastModified",
        accessorFn: (row) => (row.LastModified ? new Date(row.LastModified).getTime() : 0),
        header: () => t("LastModified"),
        cell: ({ row }) => (row.original.LastModified ? formatDateTime(row.original.LastModified) : ""),
        meta: { width: 200 },
      },
      {
        id: "size",
        accessorFn: (row) => row.Size ?? 0,
        header: () => t("Size"),
        cell: ({ row }) => (typeof row.original.Size === "number" ? formatBytes(row.original.Size) : ""),
        meta: { width: 140 },
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => t("Action"),
        cell: ({ row }) => {
          const objectContext = {
            bucket: bucketName,
            objectKey,
          }

          return (
            <div className="flex flex-wrap gap-2">
              {canCapability("objects.version.view", objectContext) ? (
                <Button variant="outline" size="sm" onClick={() => onPreview(row.original.VersionId ?? "")}>
                  <RiEyeLine className="size-4" aria-hidden />
                  {t("Preview")}
                </Button>
              ) : null}
              {!row.original.IsLatest && canCapability("objects.version.restore", objectContext) ? (
                <Button variant="outline" size="sm" onClick={() => restoreVersion(row.original)}>
                  <RiLoopLeftLine className="size-4" aria-hidden />
                  {t("Restore")}
                </Button>
              ) : null}
              {canCapability("objects.download", objectContext) ? (
                <Button variant="outline" size="sm" onClick={() => downloadVersion(row.original)}>
                  <RiDownloadCloud2Line className="size-4" aria-hidden />
                  {t("Download")}
                </Button>
              ) : null}
              {canCapability("objects.delete", objectContext) ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-white"
                  onClick={() => deleteVersion(row.original)}
                >
                  <RiDeleteBin5Line className="size-4" aria-hidden />
                  {t("Delete")}
                </Button>
              ) : null}
            </div>
          )
        },
        meta: { minWidth: 360 },
      },
    ],
    [t, onPreview, copyVersionId, restoreVersion, downloadVersion, deleteVersion, canCapability, bucketName, objectKey],
  )

  const { table } = useDataTable<VersionRow>({
    data: versions,
    columns,
  })

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()} disablePointerDismissal>
      <DialogContent className="max-h-[80vh] w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden sm:max-w-5xl 2xl:w-[80vw] 2xl:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>{t("Object Versions")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span>
            {t("Versions")}: <span className="font-medium text-foreground">{versionStats.count}</span>
          </span>
          <span>
            {t("Total")} {t("Size")}:{" "}
            <span className="font-medium text-foreground">{formatBytes(versionStats.totalSize)}</span>
          </span>
        </div>
        <DataTable table={table} isLoading={loading} emptyTitle={t("No Versions")} />
      </DialogContent>
    </Dialog>
  )
}
