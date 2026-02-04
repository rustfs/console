"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import {
  RiFileAddLine,
  RiDeleteBin5Line,
  RiDownloadCloud2Line,
  RiRefreshLine,
  RiFolderLine,
  RiFileLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from "@remixicon/react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SearchInput } from "@/components/search-input"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useObject } from "@/hooks/use-object"
import { useBucket } from "@/hooks/use-bucket"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useMessage } from "@/lib/feedback/message"
import { exportFile } from "@/lib/export-file"
import { getContentType } from "@/lib/mime-types"
import { formatBytes } from "@/lib/functions"
import { buildBucketPath } from "@/lib/bucket-path"
import { TaskStatsButton } from "@/components/tasks/stats-button"
import { useAddDeleteKeys } from "@/contexts/task-context"
import type { ColumnDef } from "@tanstack/react-table"
import dayjs from "dayjs"
import { saveAs } from "file-saver"
import JSZip from "jszip"

interface ObjectRow {
  Key: string
  type: "prefix" | "object"
  Size: number
  LastModified: string
}

interface ObjectListProps {
  bucket: string
  path: string
  onOpenInfo: (bucket: string, key: string) => void
  onUploadClick: () => void
  pageSize?: number
  onRefresh?: () => void
  refreshTrigger?: number
}

export function ObjectList({
  bucket,
  path,
  onOpenInfo,
  onUploadClick,
  pageSize = 25,
  onRefresh,
  refreshTrigger = 0,
}: ObjectListProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { listObject, getSignedUrl, mapAllFiles } = useObject(bucket)
  const { getBucketVersioning } = useBucket()
  const addDeleteKeys = useAddDeleteKeys()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [showDeleted, setShowDeleted] = useLocalStorage("object-list-show-deleted", false)
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<ObjectRow[]>([])
  const [continuationToken, setContinuationToken] = React.useState<string | undefined>()
  const [tokenHistory, setTokenHistory] = React.useState<string[]>([])
  const [nextToken, setNextToken] = React.useState<string | undefined>()
  const [bucketVersioningEnabled, setBucketVersioningEnabled] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteDialogKeys, setDeleteDialogKeys] = React.useState<string[]>([])
  const [deleteAllVersions, setDeleteAllVersions] = React.useState(false)

  const prefix = decodeURIComponent(path)

  const bucketPath = React.useCallback((p?: string | string[]) => buildBucketPath(bucket, p), [bucket])

  const fetchObjects = React.useCallback(
    async (tokenOverride?: string) => {
      const token = tokenOverride !== undefined ? tokenOverride : continuationToken
      setLoading(true)
      try {
        const response = await listObject(bucket, prefix || undefined, pageSize, token, {
          includeDeleted: showDeleted,
        })

        const r = response as {
          CommonPrefixes?: Array<{ Prefix?: string }>
          Contents?: Array<{ Key?: string; Size?: number; LastModified?: Date }>
          NextContinuationToken?: string
        }

        setNextToken(r.NextContinuationToken)

        const prefixItems: ObjectRow[] = (r.CommonPrefixes ?? []).map((item) => ({
          Key: item.Prefix ?? "",
          type: "prefix" as const,
          Size: 0,
          LastModified: "",
        }))

        const objectItems: ObjectRow[] = (r.Contents ?? []).map((item) => ({
          Key: item.Key ?? "",
          type: "object" as const,
          Size: item.Size ?? 0,
          LastModified: item.LastModified ? item.LastModified.toISOString() : "",
        }))

        setData([...prefixItems, ...objectItems])
      } finally {
        setTimeout(() => setLoading(false), 200)
      }
    },
    [bucket, prefix, pageSize, continuationToken, showDeleted, listObject],
  )

  const prevRefreshTriggerRef = React.useRef(refreshTrigger)

  React.useEffect(() => {
    const isRefresh = prevRefreshTriggerRef.current !== refreshTrigger
    prevRefreshTriggerRef.current = refreshTrigger

    if (isRefresh) {
      setContinuationToken(undefined)
      setTokenHistory([])
      void fetchObjects(undefined)
    } else {
      void fetchObjects()
    }
  }, [bucket, prefix, pageSize, continuationToken, showDeleted, refreshTrigger, fetchObjects])

  React.useEffect(() => {
    const loadBucketVersioningStatus = async () => {
      try {
        const resp = await getBucketVersioning(bucket)
        setBucketVersioningEnabled((resp as { Status?: string })?.Status === "Enabled")
      } catch {
        setBucketVersioningEnabled(false)
      }
    }
    loadBucketVersioningStatus()
  }, [bucket, getBucketVersioning])

  React.useEffect(() => {
    setContinuationToken(undefined)
    setTokenHistory([])
  }, [showDeleted])

  const displayKey = React.useCallback(
    (key: string) => {
      if (!prefix) return key
      return key.startsWith(prefix) ? key.slice(prefix.length) : key
    },
    [prefix],
  )

  const filteredData = React.useMemo(() => {
    const term = searchTerm.toLowerCase()
    return data.filter((item) => {
      if (term) {
        const key = displayKey(item.Key).toLowerCase()
        return key.includes(term)
      }
      return item.Key !== prefix
    })
  }, [data, searchTerm, prefix, displayKey])

  const downloadFile = React.useCallback(
    async (key: string) => {
      if (!key) return
      const loadingMsg = message.loading(t("Getting URL"), { duration: 0 })
      try {
        const url = await getSignedUrl(key)
        const response = await fetch(url)
        const filename = key.split("/").pop() ?? ""
        const headers: Record<string, string> = {
          "content-type": getContentType(response.headers, filename),
          filename: response.headers.get("content-disposition")?.split("filename=")[1] ?? "",
        }
        const blob = await response.blob()
        exportFile({ headers, data: blob }, filename)
      } catch (err) {
        message.error((err as Error)?.message ?? t("Download Failed"))
      } finally {
        loadingMsg.destroy()
      }
    },
    [message, t, getSignedUrl],
  )

  const columns: ColumnDef<ObjectRow>[] = React.useMemo(
    () => [
      {
        id: "object",
        header: () => t("Object"),
        accessorFn: (row) => displayKey(row.Key ?? ""),
        cell: ({ row }) => {
          const key = row.original.Key ?? ""
          const display = displayKey(key) || "/"

          if (row.original.type === "prefix") {
            return (
              <Link
                href={bucketPath(row.original.Key)}
                className="flex items-center gap-2 text-blue-500 hover:underline"
              >
                <RiFolderLine className="size-4" />
                <span>{display}</span>
              </Link>
            )
          }
          return (
            <button
              type="button"
              className="flex items-center gap-2 text-primary hover:underline text-left"
              onClick={() => onOpenInfo(bucket, row.original.Key)}
            >
              <RiFileLine className="size-4" />
              <span>{display}</span>
            </button>
          )
        },
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true
          const key = displayKey(row.original.Key ?? "").toLowerCase()
          return key.includes(String(filterValue).toLowerCase())
        },
      },
      {
        id: "size",
        header: () => t("Size"),
        accessorFn: (row) => (row.type === "object" ? row.Size : -1),
        cell: ({ row }) => (row.original.type === "object" ? formatBytes(row.original.Size) : "-"),
      },
      {
        id: "lastModified",
        header: () => t("Last Modified"),
        accessorFn: (row) => (row.type === "prefix" || !row.LastModified ? "" : new Date(row.LastModified).getTime()),
        cell: ({ row }) =>
          row.original.LastModified ? dayjs(row.original.LastModified).format("YYYY-MM-DD HH:mm:ss") : "-",
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.type === "object" ? (
              <Button variant="outline" size="sm" onClick={() => downloadFile(row.original.Key)}>
                <RiDownloadCloud2Line className="size-4" />
                <span>{t("Download")}</span>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => openDeleteDialog([row.original.Key])}>
              <RiDeleteBin5Line className="size-4" />
              <span>{t("Delete")}</span>
            </Button>
          </div>
        ),
      },
    ],
    [t, bucket, bucketPath, onOpenInfo, displayKey, downloadFile],
  )

  const { table, selectedRowIds } = useDataTable<ObjectRow>({
    data: filteredData,
    columns,
    getRowId: (row) => row.Key,
    enableRowSelection: true,
    manualPagination: true,
  })

  const checkedKeys = selectedRowIds

  const computeRelativeKey = (key: string) => {
    if (!key) return ""
    const base = prefix || ""
    return base && key.startsWith(base) ? key.slice(base.length) : key
  }

  const collectKeysForDeletion = async (keys: string[], forceDelete = false): Promise<string[]> => {
    const rowMap = new Map(data.map((item) => [item.Key, item]))
    const collected: string[] = []

    for (const key of keys) {
      if (!key) continue
      const row = rowMap.get(key)
      if (row?.type === "prefix") {
        collected.push(row.Key)
        if (!forceDelete) {
          await mapAllFiles(bucket, row.Key, (fileKey) => {
            if (fileKey) collected.push(fileKey)
          })
        }
      } else {
        collected.push(key)
      }
    }

    return Array.from(new Set(collected))
  }

  const downloadMultiple = async () => {
    if (!checkedKeys.length) {
      message.warning(t("Please select at least one item"))
      return
    }

    const selectedRows = data.filter((item) => checkedKeys.includes(item.Key))
    if (!selectedRows.length) {
      message.warning(t("No files to download"))
      return
    }

    const collecting = message.loading(t("Collecting files"), { duration: 0 })
    const allFiles: { key: string; relative: string }[] = []

    try {
      for (const item of selectedRows) {
        if (item.type === "object") {
          allFiles.push({
            key: item.Key,
            relative: computeRelativeKey(item.Key),
          })
        } else if (item.type === "prefix") {
          await mapAllFiles(bucket, item.Key, (fileKey) => {
            allFiles.push({
              key: fileKey,
              relative: computeRelativeKey(fileKey),
            })
          })
        }
      }
    } catch (err) {
      collecting.destroy()
      message.error((err as Error)?.message ?? t("Download Failed"))
      return
    }

    collecting.destroy()

    if (!allFiles.length) {
      message.warning(t("No files to download"))
      return
    }

    const zip = new JSZip()
    let finished = 0
    const destroyRef: { current: (() => void) | null } = { current: null }

    const updateProgress = () => {
      if (destroyRef.current) destroyRef.current()
      const handle = message.loading(`${t("Downloading files")} ${Math.round((finished / allFiles.length) * 100)}%`, {
        duration: 0,
      })
      destroyRef.current = handle.destroy
    }

    updateProgress()

    try {
      await Promise.all(
        allFiles.map(async ({ key, relative }) => {
          const url = await getSignedUrl(key)
          const response = await fetch(url)
          const blob = await response.blob()
          zip.file(relative || key, blob)
          finished++
          updateProgress()
        }),
      )
    } catch (err) {
      if (destroyRef.current) destroyRef.current()
      message.error((err as Error)?.message ?? t("Download Failed"))
      return
    }

    if (destroyRef.current) destroyRef.current()

    const content = await zip.generateAsync({ type: "blob" })
    saveAs(content, `${bucket ?? "download"}.zip`)
    message.success(t("Download ready"))
  }

  const openDeleteDialog = (keys: string[]) => {
    setDeleteDialogKeys(keys)
    setDeleteAllVersions(false)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    const keys = [...deleteDialogKeys]
    setDeleteDialogOpen(false)
    if (!keys.length) return

    if ((bucketVersioningEnabled && deleteAllVersions) || !bucketVersioningEnabled) {
      await handleDeleteAllVersions(keys)
    } else {
      await handleDelete(keys)
    }
  }

  const handleDelete = async (keys: string[]) => {
    try {
      const targets = await collectKeysForDeletion(keys)
      if (!targets.length) {
        message.success(t("Delete Success"))
      } else {
        addDeleteKeys(targets, bucket, undefined)
        message.success(t("Delete task created"))
      }
      table.resetRowSelection()
      ;(onRefresh ?? fetchObjects)()
    } catch (err) {
      message.error((err as Error)?.message ?? t("Delete Failed"))
    }
  }

  const handleDeleteAllVersions = async (keys: string[]) => {
    try {
      const targets = await collectKeysForDeletion(keys, true)
      if (!targets.length) {
        message.success(t("Delete Success"))
      } else {
        addDeleteKeys(targets, bucket, undefined, { forceDelete: true })
        message.success(t("Delete task created"))
      }
      table.resetRowSelection()
      ;(onRefresh ?? fetchObjects)()
    } catch (err) {
      message.error((err as Error)?.message ?? t("Delete Failed"))
    }
  }

  const handleBatchDelete = () => {
    if (!checkedKeys.length) {
      message.warning(t("Please select at least one item"))
      return
    }
    openDeleteDialog([...checkedKeys])
  }

  const goToNextPage = () => {
    if (!nextToken) return
    if (continuationToken) {
      setTokenHistory((h) => [...h, continuationToken])
    }
    setContinuationToken(nextToken)
  }

  const goToPreviousPage = () => {
    const prev = tokenHistory[tokenHistory.length - 1]
    if (prev !== undefined) {
      setTokenHistory((h) => h.slice(0, -1))
      setContinuationToken(prev)
    } else {
      setContinuationToken(undefined)
    }
  }

  React.useEffect(() => {
    const col = table.getColumn("object")
    if (col) col.setFilterValue(searchTerm || undefined)
  }, [searchTerm, table])

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <TaskStatsButton />
            <Button variant="outline" onClick={onUploadClick}>
              <RiFileAddLine className="size-4" />
              <span>
                {t("Upload File")}/{t("Folder")}
              </span>
            </Button>
            {checkedKeys.length > 0 ? (
              <>
                <Button variant="outline" className="text-destructive border-destructive" onClick={handleBatchDelete}>
                  <RiDeleteBin5Line className="size-4" />
                  <span>{t("Delete Selected")}</span>
                </Button>
                <Button variant="outline" onClick={downloadMultiple}>
                  <RiDownloadCloud2Line className="size-4" />
                  <span>{t("Download")}</span>
                </Button>
              </>
            ) : null}
            <Button variant="outline" onClick={() => (onRefresh ?? fetchObjects)()}>
              <RiRefreshLine className="size-4" />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-4 min-w-[40vw]">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("Filter From This Page")}
            clearable
            className="lg:max-w-sm"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <Checkbox checked={showDeleted} onCheckedChange={(v) => setShowDeleted(v === true)} />
            <span>{t("Show Deleted Objects")}</span>
          </label>
        </div>
      </PageHeader>

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Objects")}
        emptyDescription={t("Upload files or create folders to populate this bucket.")}
      />

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={tokenHistory.length === 0} onClick={goToPreviousPage}>
          <RiArrowLeftSLine className="mr-2 size-4" />
          <span>{t("Previous Page")}</span>
        </Button>
        <Button variant="outline" disabled={!nextToken} onClick={goToNextPage}>
          <span>{t("Next Page")}</span>
          <RiArrowRightSLine className="ml-2 size-4" />
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Warning")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete the selected objects?")}
              {bucketVersioningEnabled && (
                <label className="mt-4 flex items-center gap-2">
                  <Checkbox checked={deleteAllVersions} onCheckedChange={(v) => setDeleteAllVersions(v === true)} />
                  <span>{t("Delete All Versions")}</span>
                </label>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" className="w-full sm:w-auto text-foreground">
                {t("Cancel")}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" className="w-full sm:w-auto text-white" onClick={handleConfirmDelete}>
                {t("Confirm")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
