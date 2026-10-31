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
  RiFileCopyLine,
  RiFolderTransferLine,
  RiArrowUpSLine,
  RiArrowDownSLine,
  RiMore2Line,
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
} from "@/components/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SearchInput } from "@/components/search-input"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { DANGER_BUTTON_CLASS } from "@/components/danger-button"
import { Spinner } from "@/components/ui/spinner"
import { useDataTable } from "@/hooks/use-data-table"
import { useObject } from "@/hooks/use-object"
import { useObjectListPagination } from "@/hooks/use-object-list-pagination"
import { useBucket } from "@/hooks/use-bucket"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { usePermissions } from "@/hooks/use-permissions"
import { isForceCleanupTarget } from "@/lib/permission-capabilities"
import { useApi } from "@/contexts/api-context"
import { useMessage } from "@/lib/feedback/message"
import { downloadUrl } from "@/lib/export-file"
import { getAttachmentContentDisposition } from "@/lib/content-disposition"
import { formatBytes, formatDateTime } from "@/lib/functions"
import { cn } from "@/lib/utils"
import { PrefixSummaryLimitError } from "@/lib/prefix-summary"
import { normalizeDateToIso } from "@/lib/safe-date"
import { buildBucketPath } from "@/lib/bucket-path"
import {
  OBJECT_LIST_DELETED_VIEW_STORAGE_KEY,
  createObjectListScope,
  deletedObjectAccessibleLabelKey,
  isDeletedObjectListEntry,
  readObjectListDeletedViewDefault,
  resolveObjectListDeletedView,
  resolveObjectListDisplayState,
  shouldApplyObjectListResponse,
  shouldResetObjectListPagination,
  shouldResetObjectListSearch,
  shouldShowObjectListRow,
  type ObjectListDeletedView,
} from "@/lib/object-list-state"
import {
  OBJECT_LIST_DEFAULT_PAGE_SIZE,
  OBJECT_LIST_PAGE_SIZE_OPTIONS,
  resolveObjectListPageSize,
} from "@/lib/object-list-pagination"
import {
  resolveBucketVersioningState,
  shouldDeleteAllVersions,
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
import { ObjectTransferDialog } from "@/components/object/transfer-dialog"
import { useAddDeleteKeys, useAddDeleteFolder, useTasks } from "@/contexts/task-context"
import type { ColumnDef } from "@tanstack/react-table"

interface ObjectRow {
  Key: string
  type: "prefix" | "object"
  Size: number
  LastModified: string
  summary?: { size: number; lastModified?: Date }
  deleted: boolean
}

type ObjectListError = "accessDenied" | "loadFailed"

const OBJECT_ACTION_MENU_ITEM_CLASS = "min-h-11 lg:min-h-8"

const OBJECT_LIST_DELETED_VIEW_OPTIONS: Array<{ value: ObjectListDeletedView; labelKey: string }> = [
  { value: "hide", labelKey: "Hide Deleted Objects" },
  { value: "show", labelKey: "Show Deleted Objects" },
  { value: "only", labelKey: "Show Only Deleted Objects" },
]
const OBJECT_LIST_PAGE_SIZE_STORAGE_KEY = "object-list-page-size"

function isAccessDeniedError(error: unknown): boolean {
  const serviceError = error as {
    $metadata?: { httpStatusCode?: number }
    Code?: string
    name?: string
    message?: string
  }
  if (serviceError?.$metadata?.httpStatusCode === 403) return true

  const code = (serviceError?.Code ?? serviceError?.name ?? serviceError?.message ?? "").toLowerCase()
  return code === "accessdenied" || code === "forbidden" || code.includes("access denied")
}

interface ObjectListProps {
  bucket: string
  heading?: React.ReactNode
  path: string
  onOpenInfo: (bucket: string, key: string) => void
  onUploadClick: () => void
  canUpload?: boolean
  onRefresh?: () => void
  refreshTrigger?: number
  onPreview: (params: { key?: string; data?: Record<string, unknown> }) => void
}

export function ObjectList({
  bucket,
  heading,
  path,
  onOpenInfo,
  onUploadClick,
  canUpload = false,
  onRefresh,
  refreshTrigger = 0,
  onPreview,
}: ObjectListProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const api = useApi()
  const { listObject, calculatePrefixSummary, getSignedUrl, renameObject } = useObject(bucket)
  const { getBucketVersioning } = useBucket()
  const { canCapability } = usePermissions()
  const addDeleteKeys = useAddDeleteKeys()
  const addDeleteFolder = useAddDeleteFolder()
  const tasks = useTasks()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [storedDeletedView, setDeletedView] = useLocalStorage<ObjectListDeletedView>(
    OBJECT_LIST_DELETED_VIEW_STORAGE_KEY,
    readObjectListDeletedViewDefault(),
  )
  const [storedPageSize, setStoredPageSize] = useLocalStorage<unknown>(
    OBJECT_LIST_PAGE_SIZE_STORAGE_KEY,
    OBJECT_LIST_DEFAULT_PAGE_SIZE,
  )
  const deletedView = resolveObjectListDeletedView(storedDeletedView)
  const [prefixSummaries, setPrefixSummaries] = React.useState<Record<string, { size: number; lastModified?: Date }>>(
    {},
  )
  const [prefixScan, setPrefixScan] = React.useState<{
    key: string
    state: "loading" | "failed" | "cancelled" | "limit"
  } | null>(null)
  const prefixScanRef = React.useRef<AbortController | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [listError, setListError] = React.useState<ObjectListError | null>(null)
  const [loadMoreError, setLoadMoreError] = React.useState(false)
  const [data, setData] = React.useState<ObjectRow[]>([])
  const [nextToken, setNextToken] = React.useState<string | undefined>()
  const [showScrollShortcuts, setShowScrollShortcuts] = React.useState(false)
  const [bucketVersioningState, setBucketVersioningState] = React.useState<BucketVersioningState>("unknown")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteDialogKeys, setDeleteDialogKeys] = React.useState<string[]>([])
  const [deleteAllVersions, setDeleteAllVersions] = React.useState(false)
  const [forceCleanupTarget, setForceCleanupTarget] = React.useState<{ bucket: string; objectKey: string } | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = React.useState(false)
  const [renameSourceKey, setRenameSourceKey] = React.useState("")
  const [renameName, setRenameName] = React.useState("")
  const [renameSubmitting, setRenameSubmitting] = React.useState(false)
  const [transfer, setTransfer] = React.useState<{ mode: "copy" | "move"; key: string } | null>(null)
  const refreshButtonRef = React.useRef<HTMLButtonElement>(null)
  const actionTriggerRef = React.useRef<HTMLElement | null>(null)
  const rowActionTriggerRefs = React.useRef(new Map<string, HTMLButtonElement>())
  const setRowActionTrigger = React.useCallback((rowId: string, node: HTMLButtonElement | null) => {
    if (node) {
      rowActionTriggerRefs.current.set(rowId, node)
    } else {
      rowActionTriggerRefs.current.delete(rowId)
    }
  }, [])
  const getRowActionTrigger = React.useCallback((rowId: string) => rowActionTriggerRefs.current.get(rowId) ?? null, [])
  const returnFocusToAction = React.useCallback(
    () => (actionTriggerRef.current?.isConnected ? actionTriggerRef.current : refreshButtonRef.current),
    [],
  )

  const prefix = decodeURIComponent(path)
  const resolvedPageSize = resolveObjectListPageSize(storedPageSize)
  const onlyDeleted = deletedView === "only"
  // "Only deleted" is a client-side narrowing over the same include-deleted
  // listing, so the wire flag is on for every view except "hide".
  const includeDeleted = deletedView !== "hide"
  const listScope = React.useMemo(
    () =>
      createObjectListScope({
        bucket,
        prefix,
        pageSize: resolvedPageSize,
        includeDeleted,
      }),
    [bucket, prefix, resolvedPageSize, includeDeleted],
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
      if (!shouldAppend) setListError(null)
      setLoadMoreError(false)
      try {
        const response = await listObject(bucket, prefix || undefined, resolvedPageSize, token, {
          includeDeleted,
        })

        const r = response as {
          CommonPrefixes?: Array<{ Prefix?: string }>
          Contents?: Array<{ Key?: string; Size?: number; LastModified?: Date; ETag?: string }>
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
        setListError(null)

        const prefixItems: ObjectRow[] = (r.CommonPrefixes ?? []).map((item) => ({
          Key: item.Prefix ?? "",
          type: "prefix" as const,
          Size: 0,
          LastModified: "",
          deleted: false,
        }))

        const objectItems: ObjectRow[] = (r.Contents ?? []).map((item) => ({
          Key: item.Key ?? "",
          type: "object" as const,
          Size: item.Size ?? 0,
          LastModified: normalizeDateToIso(item.LastModified),
          deleted: isDeletedObjectListEntry(item, includeDeleted),
        }))

        const rows = [...prefixItems, ...objectItems]
        if (shouldAppend) {
          setData((currentRows) => [...currentRows, ...rows])
        } else {
          setData(rows)
        }
      } catch (error) {
        console.error("Failed to fetch objects:", error)
        if (
          shouldApplyObjectListResponse({
            requestId,
            activeRequestId: requestIdRef.current,
            requestScope,
            activeScope: activeScopeRef.current,
          })
        ) {
          if (shouldAppend) {
            setLoadMoreError(true)
          } else {
            message.error((error as Error)?.message ?? t("Failed to load objects"))
            setNextToken(undefined)
            setData([])
            setListError(isAccessDeniedError(error) ? "accessDenied" : "loadFailed")
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
    [bucket, prefix, resolvedPageSize, includeDeleted, listObject, message, t],
  )

  const scanPrefix = React.useCallback(
    async (key: string) => {
      if (prefixScanRef.current) return
      const controller = new AbortController()
      prefixScanRef.current = controller
      setPrefixSummaries((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      setPrefixScan({ key, state: "loading" })
      try {
        const summary = await calculatePrefixSummary(key, controller.signal)
        if (prefixScanRef.current !== controller) return
        setPrefixSummaries((current) => ({ ...current, [key]: summary }))
        setPrefixScan(null)
      } catch (error) {
        if (prefixScanRef.current !== controller) return
        setPrefixScan({
          key,
          state: controller.signal.aborted
            ? "cancelled"
            : error instanceof PrefixSummaryLimitError
              ? "limit"
              : "failed",
        })
      } finally {
        if (prefixScanRef.current === controller) prefixScanRef.current = null
      }
    },
    [calculatePrefixSummary],
  )

  React.useEffect(
    () => () => {
      prefixScanRef.current?.abort()
      prefixScanRef.current = null
    },
    [listScope],
  )

  const resetAndFetchObjects = React.useCallback(() => {
    prefixScanRef.current?.abort()
    prefixScanRef.current = null
    setPrefixScan(null)
    setPrefixSummaries({})
    setNextToken(undefined)
    setData([])
    void fetchObjects({ resetPagination: true })
  }, [fetchObjects])

  const prevRefreshTriggerRef = React.useRef(refreshTrigger)

  React.useEffect(() => {
    const previousScope = previousScopeRef.current
    const shouldResetPagination = shouldResetObjectListPagination(previousScope, listScope)
    if (shouldResetObjectListSearch(previousScope, listScope)) {
      setSearchTerm("")
    }
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
      } catch (error) {
        console.error("Failed to load bucket versioning status:", error)
        if (!cancelled) {
          setBucketVersioningState("unknown")
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
    const term = searchTerm.trim().toLowerCase()
    return data.filter((item) => {
      if (!shouldShowObjectListRow(item, onlyDeleted)) return false
      if (term) {
        const key = displayKey(item.Key).toLowerCase()
        return key.includes(term)
      }
      return item.Key !== prefix
    })
  }, [data, searchTerm, prefix, displayKey, onlyDeleted])
  const displayState = resolveObjectListDisplayState({
    searchTerm,
    filteredCount: filteredData.length,
    loadedCount: data.length,
    hasMore: Boolean(nextToken),
    loading,
    onlyDeleted,
  })
  const filteredEmptyState = displayState === "filtered-partial" || displayState === "filtered-empty"
  const emptyTitle = filteredEmptyState
    ? t(displayState === "filtered-partial" ? "No matches in loaded objects" : "No matching objects")
    : displayState === "partial"
      ? t("Load next objects")
      : t("No Objects")
  const emptyDescription = filteredEmptyState
    ? t(
        displayState === "filtered-partial"
          ? "More objects have not been searched yet."
          : "No loaded objects match this filter.",
      )
    : displayState === "partial"
      ? t("More objects have not been searched yet.")
      : t("Upload files or create folders to populate this bucket.")

  const downloadFile = React.useCallback(
    async (key: string) => {
      if (!key) return
      const loadingMsg = message.loading(t("Getting URL"), { duration: 0 })
      try {
        const filename = key.split("/").pop() ?? ""
        const url = await getSignedUrl(key, 3600, getAttachmentContentDisposition(filename))
        downloadUrl(url, filename)
        message.success(t("Download ready"))
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

  const openDeleteDialog = React.useCallback(
    (keys: string[], trigger: HTMLElement | null = null) => {
      if (bucketVersioningState === "unknown") {
        message.error(t("Failed to get data"))
        return
      }

      actionTriggerRef.current = trigger
      setDeleteDialogKeys(keys)
      setDeleteAllVersions(false)
      setDeleteDialogOpen(true)
    },
    [bucketVersioningState, message, t],
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
          const deletedLabelKey = deletedObjectAccessibleLabelKey(row.original.deleted)
          return (
            <button
              type="button"
              className="flex min-w-0 max-w-full items-center gap-2 text-start text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              onClick={() => onOpenInfo(bucket, row.original.Key)}
            >
              <RiFileLine className="size-4 shrink-0" aria-hidden />
              {row.original.deleted ? (
                <del className="min-w-0 truncate text-destructive line-through">{display}</del>
              ) : (
                <span className="min-w-0 truncate">{display}</span>
              )}
              {deletedLabelKey ? <span className="sr-only">{` (${t(deletedLabelKey)})`}</span> : null}
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
        accessorFn: (row) => (row.type === "object" ? row.Size : (row.summary?.size ?? -1)),
        cell: ({ row }) => {
          if (row.original.type === "object") return formatBytes(row.original.Size)
          const key = row.original.Key
          const summary = row.original.summary
          const state = prefixScan?.key === key ? prefixScan.state : null
          return (
            <div className="flex flex-col items-start gap-1">
              {summary ? <span>{formatBytes(summary.size)}</span> : <span>-</span>}
              {state === "loading" ? (
                <>
                  <span role="status">{t("Calculating folder statistics...")}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t("Cancel statistics for {prefix}", { prefix: key })}
                    onClick={() => prefixScanRef.current?.abort()}
                  >
                    {t("Cancel")}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t("Calculate statistics for {prefix}", { prefix: key })}
                  disabled={prefixScan?.state === "loading"}
                  onClick={() => void scanPrefix(key)}
                >
                  {t("Calculate folder statistics")}
                </Button>
              )}
              {state === "failed" ? <span role="alert">{t("Could not calculate folder statistics.")}</span> : null}
              {state === "limit" ? <span role="alert">{t("Folder exceeds the scan limit.")}</span> : null}
              {state === "cancelled" ? <span role="status">{t("Calculation cancelled.")}</span> : null}
            </div>
          )
        },
      },
      {
        id: "lastModified",
        header: () => (
          <span className="flex flex-col items-start">
            <span>{t("Last Modified")}</span>
            {nextToken ? (
              <span className="text-xs font-normal text-muted-foreground">{t("Loaded objects only")}</span>
            ) : null}
          </span>
        ),
        accessorFn: (row) => {
          const date = row.type === "prefix" ? row.summary?.lastModified : row.LastModified
          return date ? new Date(date).getTime() : -1
        },
        cell: ({ row }) => {
          const date = row.original.type === "prefix" ? row.original.summary?.lastModified : row.original.LastModified
          return date ? formatDateTime(date) : "-"
        },
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        cell: ({ row }) => {
          const key = row.original.Key
          const isObject = row.original.type === "object"
          const canPreview = isObject && canCapability("objects.preview", { bucket, objectKey: key })
          const canDownload = isObject && canCapability("objects.download", { bucket, objectKey: key })
          const canRename = isObject && canCapability("objects.rename", { bucket, objectKey: key, prefix })
          const canCopy = isObject && canCapability("objects.copy", { bucket, objectKey: key })
          const canMove = isObject && canCapability("objects.move", { bucket, objectKey: key })
          const canDelete = canCapability("objects.delete", { bucket, objectKey: key })
          const canForceCleanup =
            row.original.type === "prefix" && canCapability("objects.forceCleanup", { bucket, objectKey: key })

          if (!canPreview && !canDownload && !canRename && !canCopy && !canMove && !canDelete && !canForceCleanup) {
            return null
          }

          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    ref={(node) => setRowActionTrigger(row.id, node)}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t("Actions")}: ${displayKey(key)}`}
                  >
                    <RiMore2Line className="size-4" aria-hidden />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-max min-w-40 max-w-[calc(100vw-2rem)]">
                {canPreview ? (
                  <DropdownMenuItem className={OBJECT_ACTION_MENU_ITEM_CLASS} onClick={() => onPreview({ key })}>
                    <RiEyeLine className="size-4" aria-hidden />
                    {t("Preview")}
                  </DropdownMenuItem>
                ) : null}
                {canDownload ? (
                  <DropdownMenuItem className={OBJECT_ACTION_MENU_ITEM_CLASS} onClick={() => downloadFile(key)}>
                    <RiDownloadCloud2Line className="size-4" aria-hidden />
                    {t("Download")}
                  </DropdownMenuItem>
                ) : null}
                {canRename ? (
                  <DropdownMenuItem
                    className={OBJECT_ACTION_MENU_ITEM_CLASS}
                    onClick={() => openRenameDialog(key, getRowActionTrigger(row.id))}
                  >
                    <RiEdit2Line className="size-4" aria-hidden />
                    {t("Rename")}
                  </DropdownMenuItem>
                ) : null}
                {canCopy ? (
                  <DropdownMenuItem
                    className={OBJECT_ACTION_MENU_ITEM_CLASS}
                    onClick={() => {
                      actionTriggerRef.current = getRowActionTrigger(row.id)
                      setTransfer({ mode: "copy", key })
                    }}
                  >
                    <RiFileCopyLine className="size-4" aria-hidden />
                    {t("Copy")}
                  </DropdownMenuItem>
                ) : null}
                {canMove ? (
                  <DropdownMenuItem
                    className={OBJECT_ACTION_MENU_ITEM_CLASS}
                    onClick={() => {
                      actionTriggerRef.current = getRowActionTrigger(row.id)
                      setTransfer({ mode: "move", key })
                    }}
                  >
                    <RiFolderTransferLine className="size-4" aria-hidden />
                    {t("Move")}
                  </DropdownMenuItem>
                ) : null}
                {canDelete && (canPreview || canDownload || canRename || canCopy || canMove) ? (
                  <DropdownMenuSeparator />
                ) : null}
                {canDelete ? (
                  <DropdownMenuItem
                    className={OBJECT_ACTION_MENU_ITEM_CLASS}
                    variant="destructive"
                    onClick={() => openDeleteDialog([key], getRowActionTrigger(row.id))}
                    disabled={bucketVersioningState === "unknown"}
                  >
                    <RiDeleteBin5Line className="size-4" aria-hidden />
                    {t("Delete")}
                  </DropdownMenuItem>
                ) : null}
                {canForceCleanup ? (
                  <DropdownMenuItem
                    className={OBJECT_ACTION_MENU_ITEM_CLASS}
                    variant="destructive"
                    onClick={() => {
                      actionTriggerRef.current = getRowActionTrigger(row.id)
                      setForceCleanupTarget({ bucket, objectKey: key })
                    }}
                  >
                    <RiDeleteBin5Line className="size-4" aria-hidden />
                    {t("Force Cleanup Folder")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [
      t,
      displayKey,
      bucketPath,
      onOpenInfo,
      bucket,
      downloadFile,
      canCapability,
      onPreview,
      prefix,
      bucketVersioningState,
      openDeleteDialog,
      nextToken,
      setRowActionTrigger,
      getRowActionTrigger,
      prefixScan,
      scanPrefix,
    ],
  )

  const tableRows = React.useMemo(
    () =>
      filteredData.map((row) => ({ ...row, summary: row.type === "prefix" ? prefixSummaries[row.Key] : undefined })),
    [filteredData, prefixSummaries],
  )
  const { table, selectedRowIds } = useDataTable<ObjectRow>({
    data: tableRows,
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

  const openRenameDialog = (key: string, trigger: HTMLElement | null = null) => {
    actionTriggerRef.current = trigger
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
    if (bucketVersioningState === "unknown") {
      message.error(t("Failed to get data"))
      return
    }

    const keys = [...deleteDialogKeys]
    setDeleteDialogOpen(false)
    if (!keys.length) return

    if (shouldDeleteAllVersions(bucketVersioningState, deleteAllVersions)) {
      await handleDeleteAllVersions(keys)
    } else {
      await handleDelete(keys)
    }
  }

  const handleForceCleanup = () => {
    if (
      !forceCleanupTarget ||
      forceCleanupTarget.bucket !== bucket ||
      !isForceCleanupTarget(forceCleanupTarget) ||
      !canCapability("objects.forceCleanup", forceCleanupTarget)
    ) {
      message.error(t("Access Denied"))
      return
    }
    try {
      addDeleteFolder(forceCleanupTarget.objectKey, forceCleanupTarget.bucket, { forceDelete: true })
      message.success(t("Delete task created"))
      setForceCleanupTarget(null)
    } catch (err) {
      message.error((err as Error)?.message ?? t("Delete Failed"))
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
        addDeleteKeys(objectKeys, bucket, undefined, { deleteAllVersions: true })
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

  const handleBatchDelete = (trigger: HTMLElement | null = null) => {
    if (!checkedKeys.length) {
      message.warning(t("Please select at least one item"))
      return
    }
    openDeleteDialog([...checkedKeys], trigger)
  }

  React.useEffect(() => {
    const col = table.getColumn("object")
    if (col) col.setFilterValue(searchTerm || undefined)
  }, [searchTerm, table])

  const loadNextBatch = React.useCallback(() => {
    if (!nextToken || loadingRef.current) return
    void fetchObjects({ token: nextToken, append: true })
  }, [fetchObjects, nextToken])

  useObjectListPagination({ loadMoreRef, nextToken, loading, loadMoreError, loadNextBatch })

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <>
            <TaskStatsButton />
            {canUpload ? (
              <Button onClick={onUploadClick}>
                <RiFileAddLine className="size-4" aria-hidden />
                <span>
                  {t("Upload File")}/{t("Folder")}
                </span>
              </Button>
            ) : null}
            <Button
              ref={refreshButtonRef}
              type="button"
              variant="outline"
              onClick={() => (onRefresh ? onRefresh() : resetAndFetchObjects())}
            >
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        {heading ?? <h1>{bucket}</h1>}
      </PageHeader>

      {data.some((row) => row.type === "prefix") ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "Folder statistics scan up to 100,000 current objects. Latest modification is based on these objects; results may change during the scan.",
          )}
        </p>
      ) : null}
      <DataTable
        caption={t("Objects")}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-4">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t("Filter loaded objects")}
              clearable
              className="lg:max-w-sm"
            />
            <RadioGroup
              value={deletedView}
              onValueChange={(value) => setDeletedView(resolveObjectListDeletedView(value))}
              className="flex w-auto flex-wrap items-center gap-x-4 gap-y-2"
              aria-label={t("Deleted Objects")}
            >
              {OBJECT_LIST_DELETED_VIEW_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  htmlFor={`object-list-deleted-view-${option.value}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer"
                >
                  <RadioGroupItem id={`object-list-deleted-view-${option.value}`} value={option.value} />
                  <span>{t(option.labelKey)}</span>
                </label>
              ))}
            </RadioGroup>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span id="object-list-page-size-label">{t("Objects per batch")}</span>
              <Select
                value={String(resolvedPageSize)}
                onValueChange={(value) => {
                  if (value) setStoredPageSize(Number(value))
                }}
              >
                <SelectTrigger aria-labelledby="object-list-page-size-label" className="w-24">
                  <SelectValue>{resolvedPageSize}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {OBJECT_LIST_PAGE_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="ms-auto flex flex-wrap items-center gap-2">
              {checkedKeys.length > 0 ? (
                <>
                  {canBulkDelete ? (
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive"
                      onClick={(event) => handleBatchDelete(event.currentTarget)}
                      disabled={bucketVersioningState === "unknown"}
                    >
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
            </div>
          </div>
        }
        table={table}
        virtualizeRows
        isLoading={displayState === "loading" || displayState === "filtered-loading"}
        errorTitle={
          listError === "accessDenied"
            ? t("Access Denied")
            : listError === "loadFailed"
              ? t("Failed to load objects")
              : undefined
        }
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />

      {!listError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {t("Loaded {count} objects", {
              count: data.length,
            })}
          </span>
          <span>{t("Filtering and sorting apply to loaded objects")}</span>
        </div>
      ) : null}

      {data.length > 0 || nextToken ? (
        <div
          ref={loadMoreRef}
          role={loadMoreError ? "alert" : undefined}
          className="flex min-h-10 flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground"
        >
          {loadMoreError ? (
            <span className="text-destructive">
              {t("Failed to load more objects. Loaded objects remain available.")}
            </span>
          ) : loading && nextToken ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              {t("Loading more objects")}
            </span>
          ) : nextToken ? (
            <span>{t("Scroll to load more objects")}</span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadNextBatch}
            aria-disabled={!nextToken || loading}
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            {loadMoreError ? t("Retry") : nextToken ? t("Load next objects") : t("All objects loaded")}
          </Button>
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
        <AlertDialogContent className="sm:max-w-md" finalFocus={returnFocusToAction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Warning")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete the selected objects?")}
              {deleteDialogKeys.length === 1 && deleteDialogKeys[0] ? (
                <span className="mt-1 block break-all">
                  <bdi>{deleteDialogKeys[0]}</bdi>
                </span>
              ) : null}
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
            <AlertDialogCancel variant="outline" className="w-full sm:w-auto text-foreground">
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={"destructive"}
              className={cn("w-full sm:w-auto", DANGER_BUTTON_CLASS)}
              onClick={handleConfirmDelete}
              disabled={bucketVersioningState === "unknown"}
            >
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={forceCleanupTarget !== null}
        onOpenChange={(open) => {
          if (!open) setForceCleanupTarget(null)
        }}
      >
        <AlertDialogContent
          className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-md"
          finalFocus={returnFocusToAction}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Force Cleanup Folder")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="min-h-0 overflow-y-auto">
            {t(
              "Permanently delete all objects, versions, delete markers, and residual files in this folder. This cannot be undone.",
            )}
            <span className="mt-3 block break-all font-mono">
              <bdi>
                {forceCleanupTarget?.bucket}/{forceCleanupTarget?.objectKey}
              </bdi>
            </span>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" className="min-h-11 w-full sm:min-h-8 sm:w-auto text-foreground">
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={"destructive"}
              className={cn("min-h-11 w-full sm:min-h-8 sm:w-auto", DANGER_BUTTON_CLASS)}
              onClick={handleForceCleanup}
              disabled={
                !forceCleanupTarget ||
                forceCleanupTarget.bucket !== bucket ||
                !canCapability("objects.forceCleanup", forceCleanupTarget)
              }
            >
              {t("Force Cleanup Folder")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {transfer ? (
        <ObjectTransferDialog
          mode={transfer.mode}
          bucket={bucket}
          objectKey={transfer.key}
          returnFocus={returnFocusToAction}
          onClose={() => setTransfer(null)}
          onRefresh={resetAndFetchObjects}
        />
      ) : null}

      <Dialog open={renameDialogOpen} onOpenChange={handleRenameOpenChange} disablePointerDismissal>
        <DialogContent className="sm:max-w-md" finalFocus={returnFocusToAction}>
          <DialogHeader>
            <DialogTitle>{t("Rename Object")}</DialogTitle>
            <DialogDescription className="break-all">{renameSourceKey}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-2">
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
          </DialogBody>
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
