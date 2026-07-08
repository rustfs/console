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
  RiEyeLine,
  RiEdit2Line,
  RiArrowUpSLine,
  RiArrowDownSLine,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/search-input"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { Spinner } from "@/components/ui/spinner"
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
import { OBJECT_LIST_DEFAULT_PAGE_SIZE, resolveObjectListPageSize } from "@/lib/object-list-pagination"
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
import {
  buildRenamedObjectKey,
  getObjectBaseName,
  validateObjectRename,
  type ObjectRenameValidation,
} from "@/lib/object-rename"
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
  const { listObject, getSignedUrl, renameObject } = useObject(bucket)
  const { getBucketVersioning } = useBucket()
  const { canCapability } = usePermissions()
  const addDeleteKeys = useAddDeleteKeys()
  const addDeleteFolder = useAddDeleteFolder()
  const tasks = useTasks()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [showDeleted, setShowDeleted] = useLocalStorage("object-list-show-deleted", false)
  const [loading, setLoading] = React.useState(false)
  const [data, setData] = React.useState<ObjectRow[]>([])
  const [nextToken, setNextToken] = React.useState<string | undefined>()
  const [showScrollShortcuts, setShowScrollShortcuts] = React.useState(false)
  const [bucketVersioningState, setBucketVersioningState] = React.useState<BucketVersioningState>("unknown")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteDialogKeys, setDeleteDialogKeys] = React.useState<string[]>([])
  const [deleteAllVersions, setDeleteAllVersions] = React.useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
  const [renameSourceKey, setRenameSourceKey] = React.useState("")
  const [renameName, setRenameName] = React.useState("")
  const [renameSubmitting, setRenameSubmitting] = React.useState(false)

  const prefix = decodeURIComponent(path)
  const resolvedPageSize = resolveObjectListPageSize(pageSize)
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
  const loadingRef = React.useRef(false)
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    activeScopeRef.current = listScope
  }, [listScope])

  React.useEffect(() => {
    loadingRef.current = loading
  }, [loading])

  const updateScrollShortcutVisibility = React.useCallback(() => {
    setShowScrollShortcuts(document.documentElement.scrollHeight > window.innerHeight)
  }, [])

  React.useEffect(() => {
    updateScrollShortcutVisibility()
  }, [data.length, loading, updateScrollShortcutVisibility])

  React.useEffect(() => {
    updateScrollShortcutVisibility()
    window.addEventListener("resize", updateScrollShortcutVisibility)
    window.addEventListener("scroll", updateScrollShortcutVisibility, { passive: true })

    return () => {
      window.removeEventListener("resize", updateScrollShortcutVisibility)
      window.removeEventListener("scroll", updateScrollShortcutVisibility)
    }
  }, [updateScrollShortcutVisibility])

  const scrollToTop = React.useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [])

  const scrollToBottom = React.useCallback(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, left: 0, behavior: "auto" })
  }, [])

  const fetchObjects = React.useCallback(
    async (options?: { token?: string; resetPagination?: boolean; append?: boolean }) => {
      const token = options?.resetPagination ? undefined : options?.token
      const shouldAppend = Boolean(options?.append && token)
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      const requestScope = activeScopeRef.current
      loadingRef.current = true
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

        const rows = [...prefixItems, ...objectItems]
        if (shouldAppend) {
          setData((currentRows) => [...currentRows, ...rows])
        } else {
          setData(rows)
        }
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
          if (!shouldAppend) {
            setData([])
          }
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
            loadingRef.current = false
            setLoading(false)
          }
        }, 200)
      }
    },
    [bucket, prefix, resolvedPageSize, showDeleted, listObject, message, t],
  )

  const resetAndFetchObjects = React.useCallback(() => {
    setNextToken(undefined)
    setData([])
    void fetchObjects({ resetPagination: true })
  }, [fetchObjects])

  const prevRefreshTriggerRef = React.useRef(refreshTrigger)

  React.useEffect(() => {
    const shouldResetPagination = shouldResetObjectListPagination(previousScopeRef.current, listScope)
    previousScopeRef.current = listScope
    const isRefresh = prevRefreshTriggerRef.current !== refreshTrigger
    prevRefreshTriggerRef.current = refreshTrigger

    if (isRefresh || shouldResetPagination) {
      resetAndFetchObjects()
    } else {
      void fetchObjects({ resetPagination: true })
    }
  }, [listScope, refreshTrigger, fetchObjects, resetAndFetchObjects])

  const prevDeleteTaskIdsRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    const currentDeleteTasks = tasks.filter((t) => t.kind === "delete" || t.kind === "delete-folder")
    const completedDeleteTasks = currentDeleteTasks.filter((t) => t.status === "completed")

    const newlyCompleted = completedDeleteTasks.filter((t) => !prevDeleteTaskIdsRef.current.has(t.id))

    if (newlyCompleted.length > 0) {
      const anyActive = currentDeleteTasks.some((t) => ["pending", "running"].includes(t.status))
      if (!anyActive) {
        // No more active delete tasks, refresh the list
        resetAndFetchObjects()
      }
    }

    prevDeleteTaskIdsRef.current = new Set(completedDeleteTasks.map((t) => t.id))
  }, [tasks, resetAndFetchObjects])

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

  const getRenameValidationMessage = React.useCallback(
    (validation: ObjectRenameValidation) => {
      switch (validation) {
        case "empty":
          return t("Object name is required")
        case "containsSlash":
          return t("Object name cannot contain slashes")
        case "sameName":
          return t("New object name must be different")
      }
    },
    [t],
  )

  const renameValidation = renameSourceKey ? validateObjectRename(renameSourceKey, renameName) : "empty"

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
                {canCapability("objects.rename", { bucket, objectKey: row.original.Key, prefix }) ? (
                  <Button variant="outline" size="sm" onClick={() => openRenameDialog(row.original.Key)}>
                    <RiEdit2Line className="size-4" aria-hidden />
                    <span>{t("Rename")}</span>
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
    [t, displayKey, bucketPath, onOpenInfo, bucket, downloadFile, canCapability, onPreview, prefix],
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

  const openRenameDialog = (key: string) => {
    setRenameSourceKey(key)
    setRenameName(getObjectBaseName(key))
    setRenameDialogOpen(true)
  }

  const handleRenameOpenChange = (open: boolean) => {
    if (renameSubmitting) return
    setRenameDialogOpen(open)
    if (!open) {
      setRenameSourceKey("")
      setRenameName("")
    }
  }

  const handleConfirmRename = async () => {
    if (!renameSourceKey) return

    const validation = validateObjectRename(renameSourceKey, renameName)
    if (validation) {
      message.warning(getRenameValidationMessage(validation))
      return
    }

    const targetKey = buildRenamedObjectKey(renameSourceKey, renameName)
    const loadingMsg = message.loading(t("Renaming object"), { duration: 0 })
    setRenameSubmitting(true)

    try {
      await renameObject(renameSourceKey, targetKey)
      message.success(t("Object renamed"))
      table.resetRowSelection()
      setRenameDialogOpen(false)
      setRenameSourceKey("")
      setRenameName("")
      resetAndFetchObjects()
    } catch (err) {
      message.error((err as Error)?.message ?? t("Rename Failed"))
    } finally {
      loadingMsg.destroy()
      setRenameSubmitting(false)
    }
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

  React.useEffect(() => {
    const col = table.getColumn("object")
    if (col) col.setFilterValue(searchTerm || undefined)
  }, [searchTerm, table])

  const loadNextBatch = React.useCallback(() => {
    if (!nextToken || loadingRef.current) return
    void fetchObjects({ token: nextToken, append: true })
  }, [fetchObjects, nextToken])

  React.useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !nextToken || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadNextBatch()
        }
      },
      { rootMargin: "320px 0px" },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [loadNextBatch, nextToken])

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
            <Button variant="outline" onClick={() => (onRefresh ? onRefresh() : resetAndFetchObjects())}>
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
            placeholder={t("Filter loaded objects")}
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
        isLoading={loading && data.length === 0}
        emptyTitle={t("No Objects")}
        emptyDescription={t("Upload files or create folders to populate this bucket.")}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {t("Loaded {count} objects", {
            count: data.length,
          })}
        </span>
        <span>{t("Filtering and sorting apply to loaded objects")}</span>
      </div>

      {nextToken ? (
        <div ref={loadMoreRef} className="flex min-h-10 items-center justify-center text-sm text-muted-foreground">
          {loading && data.length > 0 ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              {t("Loading more objects")}
            </span>
          ) : (
            <span>{t("Scroll to load more objects")}</span>
          )}
        </div>
      ) : null}

      {showScrollShortcuts ? (
        <div className="fixed end-4 bottom-4 z-40 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="bg-background/95 shadow-none backdrop-blur"
            onClick={scrollToTop}
            aria-label={t("Back to top")}
            title={t("Back to top")}
          >
            <RiArrowUpSLine className="size-5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="bg-background/95 shadow-none backdrop-blur"
            onClick={scrollToBottom}
            aria-label={t("Go to bottom")}
            title={t("Go to bottom")}
          >
            <RiArrowDownSLine className="size-5" aria-hidden />
          </Button>
        </div>
      ) : null}

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

      <Dialog open={renameDialogOpen} onOpenChange={handleRenameOpenChange} disablePointerDismissal>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Rename Object")}</DialogTitle>
            <DialogDescription className="break-all">{renameSourceKey}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              name="object-rename-name"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              aria-label={t("Object Name")}
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
            {renameValidation ? (
              <p className="text-xs text-destructive">{getRenameValidationMessage(renameValidation)}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={renameSubmitting} onClick={() => handleRenameOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button disabled={Boolean(renameValidation) || renameSubmitting} onClick={handleConfirmRename}>
              {t("Rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
