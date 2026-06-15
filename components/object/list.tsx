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
  RiEyeLine,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchInput } from "@/components/search-input"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useObject } from "@/hooks/use-object"
import { useBucket } from "@/hooks/use-bucket"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { usePermissions } from "@/hooks/use-permissions"
import { useApi } from "@/contexts/api-context"
import { useMessage } from "@/lib/feedback/message"
import { exportFile } from "@/lib/export-file"
import { getContentType } from "@/lib/mime-types"
import { formatBytes, formatDateTime } from "@/lib/functions"
import { normalizeDateToIso } from "@/lib/safe-date"
import { buildBucketPath } from "@/lib/bucket-path"
import {
  createObjectListScope,
  shouldApplyObjectListResponse,
  shouldResetObjectListPagination,
} from "@/lib/object-list-state"
import {
  OBJECT_LIST_DEFAULT_PAGE_SIZE,
  OBJECT_LIST_PAGE_SIZE_OPTIONS,
  normalizeObjectListPageSize,
} from "@/lib/object-list-pagination"
import {
  resolveBucketVersioningState,
  shouldForceDeleteObjects,
  shouldShowDeleteAllVersions,
  type BucketVersioningState,
} from "@/lib/object-delete"
import {
  buildObjectZipDownloadPayload,
  normalizeObjectZipDownloadUrl,
  type CreateObjectZipDownloadResponse,
} from "@/lib/object-zip-download"
import { TaskStatsButton } from "@/components/tasks/stats-button"
import { useAddDeleteKeys, useAddDeleteFolder, useTasks } from "@/contexts/task-context"
import type { ColumnDef } from "@tanstack/react-table"

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
  canUpload?: boolean
  pageSize?: number
  onRefresh?: () => void
  refreshTrigger?: number
  onPreview: (params: { key?: string; data?: Record<string, unknown> }) => void
}

export function ObjectList({
  bucket,
  path,
  onOpenInfo,
  onUploadClick,
  canUpload = false,
  pageSize = OBJECT_LIST_DEFAULT_PAGE_SIZE,
  onRefresh,
  refreshTrigger = 0,
  onPreview,
}: ObjectListProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const api = useApi()
  const { listObject, getSignedUrl } = useObject(bucket)
  const { getBucketVersioning } = useBucket()
  const { canCapability } = usePermissions()
  const addDeleteKeys = useAddDeleteKeys()
  const addDeleteFolder = useAddDeleteFolder()
  const tasks = useTasks()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [showDeleted, setShowDeleted] = useLocalStorage("object-list-show-deleted", false)
  const [storedPageSize, setStoredPageSize] = useLocalStorage(
    "object-list-page-size",
    normalizeObjectListPageSize(pageSize),
  )
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<ObjectRow[]>([])
  const [continuationToken, setContinuationToken] = React.useState<string | undefined>()
  const [tokenHistory, setTokenHistory] = React.useState<string[]>([])
  const [nextToken, setNextToken] = React.useState<string | undefined>()
  const [bucketVersioningState, setBucketVersioningState] = React.useState<BucketVersioningState>("unknown")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteDialogKeys, setDeleteDialogKeys] = React.useState<string[]>([])
  const [deleteAllVersions, setDeleteAllVersions] = React.useState(false)

  const prefix = decodeURIComponent(path)
  const resolvedPageSize = normalizeObjectListPageSize(storedPageSize)
  const listScope = React.useMemo(
    () =>
      createObjectListScope({
        bucket,
        prefix,
        pageSize: resolvedPageSize,
        showDeleted,
      }),
    [bucket, prefix, resolvedPageSize, showDeleted],
  )
  const canBulkDelete = canCapability("objects.bulkDelete", { bucket, prefix })
  const canBulkDownload = canCapability("objects.download", { bucket, prefix })

  const bucketPath = React.useCallback((p?: string | string[]) => buildBucketPath(bucket, p), [bucket])
  const requestIdRef = React.useRef(0)
  const activeScopeRef = React.useRef(listScope)
  const previousScopeRef = React.useRef(listScope)

  React.useEffect(() => {
    activeScopeRef.current = listScope
  }, [listScope])

  const fetchObjects = React.useCallback(
    async (options?: { token?: string; resetPagination?: boolean }) => {
      const token = options?.resetPagination ? undefined : (options?.token ?? continuationToken)
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      const requestScope = activeScopeRef.current
      setLoading(true)
      try {
        const response = await listObject(bucket, prefix || undefined, resolvedPageSize, token, {
          includeDeleted: showDeleted,
        })

        const r = response as {
          CommonPrefixes?: Array<{ Prefix?: string }>
          Contents?: Array<{ Key?: string; Size?: number; LastModified?: Date }>
          NextContinuationToken?: string
        }

        if (
          !shouldApplyObjectListResponse({
            requestId,
            activeRequestId: requestIdRef.current,
            requestScope,
            activeScope: activeScopeRef.current,
          })
        ) {
          return
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
          LastModified: normalizeDateToIso(item.LastModified),
        }))

        setData([...prefixItems, ...objectItems])
      } catch (error) {
        console.error("Failed to fetch objects:", error)
        message.error((error as Error)?.message ?? t("Failed to load objects"))
        if (
          shouldApplyObjectListResponse({
            requestId,
            activeRequestId: requestIdRef.current,
            requestScope,
            activeScope: activeScopeRef.current,
          })
        ) {
          setNextToken(undefined)
          setData([])
        }
      } finally {
        window.setTimeout(() => {
          if (
            shouldApplyObjectListResponse({
              requestId,
              activeRequestId: requestIdRef.current,
              requestScope,
              activeScope: activeScopeRef.current,
            })
          ) {
            setLoading(false)
          }
        }, 200)
      }
    },
    [bucket, prefix, resolvedPageSize, continuationToken, showDeleted, listObject, message, t],
  )

  const prevRefreshTriggerRef = React.useRef(refreshTrigger)

  React.useEffect(() => {
    const shouldResetPagination = shouldResetObjectListPagination(previousScopeRef.current, listScope)
    previousScopeRef.current = listScope
    const isRefresh = prevRefreshTriggerRef.current !== refreshTrigger
    prevRefreshTriggerRef.current = refreshTrigger

    if (isRefresh || shouldResetPagination) {
      setContinuationToken(undefined)
      setTokenHistory([])
      void fetchObjects({ resetPagination: true })
    } else {
      void fetchObjects()
    }
  }, [listScope, bucket, prefix, resolvedPageSize, continuationToken, showDeleted, refreshTrigger, fetchObjects])

  const prevDeleteTaskIdsRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    const currentDeleteTasks = tasks.filter((t) => t.kind === "delete" || t.kind === "delete-folder")
    const completedDeleteTasks = currentDeleteTasks.filter((t) => t.status === "completed")

    const newlyCompleted = completedDeleteTasks.filter((t) => !prevDeleteTaskIdsRef.current.has(t.id))

    if (newlyCompleted.length > 0) {
      const anyActive = currentDeleteTasks.some((t) => ["pending", "running"].includes(t.status))
      if (!anyActive) {
        // No more active delete tasks, refresh the list
        void fetchObjects({ resetPagination: true })
      }
    }

    prevDeleteTaskIdsRef.current = new Set(completedDeleteTasks.map((t) => t.id))
  }, [tasks, fetchObjects])

  React.useEffect(() => {
    let cancelled = false

    const loadBucketVersioningStatus = async () => {
      setBucketVersioningState("unknown")

      try {
        const resp = await getBucketVersioning(bucket)
        if (!cancelled) {
          setBucketVersioningState(resolveBucketVersioningState((resp as { Status?: string })?.Status))
        }
      } catch {
        if (!cancelled) {
          setBucketVersioningState("disabled")
        }
      }
    }

    void loadBucketVersioningStatus()

    return () => {
      cancelled = true
    }
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
                className="flex min-w-0 max-w-full items-center gap-2 text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                <RiFolderLine className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{display}</span>
              </Link>
            )
          }
          return (
            <button
              type="button"
              className="flex min-w-0 max-w-full items-center gap-2 text-start text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              onClick={() => onOpenInfo(bucket, row.original.Key)}
            >
              <RiFileLine className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{display}</span>
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
        cell: ({ row }) => (row.original.LastModified ? formatDateTime(row.original.LastModified) : "-"),
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.type === "object" ? (
              <>
                {canCapability("objects.preview", { bucket, objectKey: row.original.Key }) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onPreview({ key: row.original.Key })
                    }}
                  >
                    <RiEyeLine className="size-4" aria-hidden />
                    <span>{t("Preview")}</span>
                  </Button>
                ) : null}
                {canCapability("objects.download", { bucket, objectKey: row.original.Key }) ? (
                  <Button variant="outline" size="sm" onClick={() => downloadFile(row.original.Key)}>
                    <RiDownloadCloud2Line className="size-4" aria-hidden />
                    <span>{t("Download")}</span>
                  </Button>
                ) : null}
              </>
            ) : null}
            {canCapability("objects.delete", { bucket, objectKey: row.original.Key }) ? (
              <Button variant="outline" size="sm" onClick={() => openDeleteDialog([row.original.Key])}>
                <RiDeleteBin5Line className="size-4" aria-hidden />
                <span>{t("Delete")}</span>
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [t, displayKey, bucketPath, onOpenInfo, bucket, downloadFile, canCapability, onPreview],
  )

  const { table, selectedRowIds } = useDataTable<ObjectRow>({
    data: filteredData,
    columns,
    getRowId: (row) => row.Key,
    enableRowSelection: true,
    manualPagination: true,
  })

  const checkedKeys = selectedRowIds

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

    const loadingMsg = message.loading(t("Preparing download"), { duration: 0 })

    try {
      const payload = buildObjectZipDownloadPayload({
        bucket,
        basePrefix: prefix,
        rows: selectedRows,
      })
      const response = (await api.post("/object-zip-downloads", payload)) as CreateObjectZipDownloadResponse

      if (!response.download_url) {
        throw new Error(t("Download Failed"))
      }

      window.location.href = normalizeObjectZipDownloadUrl(response.download_url, api.resolveUrl("/"))
      table.resetRowSelection()
      message.success(t("Download ready"))
    } catch (err) {
      message.error((err as Error)?.message ?? t("Download Failed"))
    } finally {
      loadingMsg.destroy()
    }
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

    if (shouldForceDeleteObjects(bucketVersioningState, deleteAllVersions)) {
      await handleDeleteAllVersions(keys)
    } else {
      await handleDelete(keys)
    }
  }

  const handleDelete = async (keys: string[]) => {
    try {
      const rowMap = new Map(data.map((item) => [item.Key, item]))
      const objectKeys: string[] = []
      const folderPrefixes: string[] = []

      for (const key of keys) {
        const row = rowMap.get(key)
        if (row?.type === "prefix") {
          folderPrefixes.push(key)
        } else {
          objectKeys.push(key)
        }
      }

      if (objectKeys.length > 0) {
        addDeleteKeys(objectKeys, bucket, undefined)
      }
      for (const prefix of folderPrefixes) {
        addDeleteFolder(prefix, bucket)
      }

      message.success(t("Delete task created"))
      table.resetRowSelection()
    } catch (err) {
      message.error((err as Error)?.message ?? t("Delete Failed"))
    }
  }

  const handleDeleteAllVersions = async (keys: string[]) => {
    try {
      const rowMap = new Map(data.map((item) => [item.Key, item]))
      const objectKeys: string[] = []
      const folderPrefixes: string[] = []

      for (const key of keys) {
        const row = rowMap.get(key)
        if (row?.type === "prefix") {
          folderPrefixes.push(key)
        } else {
          objectKeys.push(key)
        }
      }

      if (objectKeys.length > 0) {
        addDeleteKeys(objectKeys, bucket, undefined, { forceDelete: true })
      }
      for (const prefix of folderPrefixes) {
        addDeleteFolder(prefix, bucket, { forceDelete: true })
      }

      message.success(t("Delete task created"))
      table.resetRowSelection()
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
    setTokenHistory((h) => [...h, continuationToken as string])
    setContinuationToken(nextToken)
  }

  const goToPreviousPage = () => {
    if (tokenHistory.length === 0) return
    const prevToken = tokenHistory[tokenHistory.length - 1]
    setContinuationToken(prevToken)
    setTokenHistory((h) => h.slice(0, -1))
  }

  const handlePageSizeChange = (value: string) => {
    const parsed = Number.parseInt(value, 10)
    const nextPageSize = normalizeObjectListPageSize(Number.isNaN(parsed) ? undefined : parsed)
    setStoredPageSize(nextPageSize)
    setContinuationToken(undefined)
    setTokenHistory([])
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
            {canUpload ? (
              <Button variant="outline" onClick={onUploadClick}>
                <RiFileAddLine className="size-4" aria-hidden />
                <span>
                  {t("Upload File")}/{t("Folder")}
                </span>
              </Button>
            ) : null}
            {checkedKeys.length > 0 ? (
              <>
                {canBulkDelete ? (
                  <Button variant="outline" className="text-destructive border-destructive" onClick={handleBatchDelete}>
                    <RiDeleteBin5Line className="size-4" aria-hidden />
                    <span>{t("Delete Selected")}</span>
                  </Button>
                ) : null}
                {canBulkDownload ? (
                  <Button variant="outline" onClick={downloadMultiple}>
                    <RiDownloadCloud2Line className="size-4" aria-hidden />
                    <span>{t("Download")}</span>
                  </Button>
                ) : null}
              </>
            ) : null}
            <Button
              variant="outline"
              onClick={() => (onRefresh ? onRefresh() : void fetchObjects({ resetPagination: true }))}
            >
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-4 min-w-[40vw]">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("Filter current page")}
            clearable
            className="lg:max-w-sm"
          />
          <label
            htmlFor="object-list-show-deleted"
            className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer"
          >
            <Checkbox
              id="object-list-show-deleted"
              checked={showDeleted}
              onCheckedChange={(v) => setShowDeleted(v === true)}
            />
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            {t("Loaded {count} of up to {pageSize} keys on this page", {
              count: data.length,
              pageSize: resolvedPageSize,
            })}
          </span>
          <span>{t("Filtering and sorting apply to the current page")}</span>
          <div className="flex items-center gap-2">
            <span>{t("Rows per page")}</span>
            <Select value={String(resolvedPageSize)} onValueChange={(value) => handlePageSizeChange(value ?? "")}>
              <SelectTrigger className="h-9 w-24" aria-label={t("Rows per page")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECT_LIST_PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {String(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={tokenHistory.length === 0} onClick={goToPreviousPage}>
            <RiArrowLeftSLine className="me-2 size-4 rtl:-scale-x-100" aria-hidden />
            <span>{t("Previous Page")}</span>
          </Button>
          <Button variant="outline" disabled={!nextToken} onClick={goToNextPage}>
            <span>{t("Next Page")}</span>
            <RiArrowRightSLine className="ms-2 size-4 rtl:-scale-x-100" aria-hidden />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Warning")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete the selected objects?")}
              {shouldShowDeleteAllVersions(bucketVersioningState) && (
                <label htmlFor="object-list-delete-all-versions" className="mt-4 flex items-center gap-2">
                  <Checkbox
                    id="object-list-delete-all-versions"
                    checked={deleteAllVersions}
                    onCheckedChange={(v) => setDeleteAllVersions(v === true)}
                  />
                  <span>{t("Delete All Versions")}</span>
                </label>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              render={
                <Button variant="outline" className="w-full sm:w-auto text-foreground">
                  {t("Cancel")}
                </Button>
              }
            />
            <AlertDialogAction
              render={
                <Button variant="destructive" className="w-full sm:w-auto text-white" onClick={handleConfirmDelete}>
                  {t("Confirm")}
                </Button>
              }
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
