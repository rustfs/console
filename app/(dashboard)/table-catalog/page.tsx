"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import {
  RiAddLine,
  RiAlertLine,
  RiArchiveLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiClipboardLine,
  RiCloudLine,
  RiDeleteBin5Line,
  RiEditLine,
  RiEyeLine,
  RiRefreshLine,
  RiTableLine,
} from "@remixicon/react"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { EmptyState } from "@/components/empty-state"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { SearchInput } from "@/components/search-input"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useBucket } from "@/hooks/use-bucket"
import {
  useTableCatalog,
  type CatalogConfig,
  type NamespaceSummary,
  type TableBucketInfo,
  type TableIdentifier,
  type ViewIdentifier,
} from "@/hooks/use-table-catalog"
import { usePermissions } from "@/hooks/use-permissions"
import { NamespaceDialog } from "@/components/table-catalog/namespace-dialog"
import { TableDialog } from "@/components/table-catalog/table-dialog"
import { TableDetailDialog } from "@/components/table-catalog/table-detail-dialog"
import { TableCommitDialog } from "@/components/table-catalog/table-commit-dialog"
import { ViewDialog, type ViewDialogMode } from "@/components/table-catalog/view-dialog"
import { ViewDetailDialog } from "@/components/table-catalog/view-detail-dialog"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { copyToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/utils"
import { displayNamespace } from "@/lib/table-catalog-paths"

type CatalogTab = "tables" | "views" | "namespaces"

const NAMESPACE_KEY_SEPARATOR = "\u001f"

function namespaceKey(namespace: readonly string[]) {
  return namespace.join(NAMESPACE_KEY_SEPARATOR)
}

function parseBucketNames(response: unknown) {
  if (!response || typeof response !== "object") return []
  const buckets = (response as { Buckets?: unknown }).Buckets
  if (!Array.isArray(buckets)) return []
  return buckets
    .map((bucket) => {
      if (!bucket || typeof bucket !== "object") return ""
      const name = (bucket as { Name?: unknown }).Name
      return typeof name === "string" ? name.trim() : ""
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function humanizeBacking(value: string | undefined, unknownLabel: string) {
  if (!value) return unknownLabel
  if (value.toLowerCase().includes("durable")) return "Durable strong"
  if (value.toLowerCase().includes("object")) return "Object-backed"
  return value
}

function tableMetadataCount(config: CatalogConfig | null) {
  if (!config) return "--"
  return config.endpoints.length ? `${config.endpoints.length} endpoints` : "--"
}

export default function TableCatalogPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { listBuckets } = useBucket()
  const {
    getCatalogConfig,
    getTableBucket,
    enableTableBucket,
    listNamespaces,
    dropNamespace,
    listTables,
    dropTable,
    listViews,
    dropView,
  } = useTableCatalog()
  const { isAdmin, hasPermission } = usePermissions()

  const [bucketNames, setBucketNames] = React.useState<string[]>([])
  const [bucketSearch, setBucketSearch] = React.useState("")
  const [bucketInfo, setBucketInfo] = React.useState<Record<string, TableBucketInfo>>({})
  const [bucketErrors, setBucketErrors] = React.useState<Record<string, string>>({})
  const [bucketStatusLoading, setBucketStatusLoading] = React.useState<Record<string, boolean>>({})
  const [selectedBucket, setSelectedBucket] = React.useState("")
  const [config, setConfig] = React.useState<CatalogConfig | null>(null)
  const [initializing, setInitializing] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [pageError, setPageError] = React.useState("")
  const [namespaceError, setNamespaceError] = React.useState("")
  const [tableError, setTableError] = React.useState("")
  const [viewError, setViewError] = React.useState("")
  const [namespaces, setNamespaces] = React.useState<NamespaceSummary[]>([])
  const [selectedNamespace, setSelectedNamespace] = React.useState("")
  const [tables, setTables] = React.useState<TableIdentifier[]>([])
  const [views, setViews] = React.useState<ViewIdentifier[]>([])
  const [namespaceLoading, setNamespaceLoading] = React.useState(false)
  const [tableLoading, setTableLoading] = React.useState(false)
  const [viewLoading, setViewLoading] = React.useState(false)
  const [tableSearch, setTableSearch] = React.useState("")
  const [viewSearch, setViewSearch] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<CatalogTab>("tables")
  const [namespaceDialogOpen, setNamespaceDialogOpen] = React.useState(false)
  const [namespaceDialogNamespace, setNamespaceDialogNamespace] = React.useState<NamespaceSummary | null>(null)
  const [tableDialogOpen, setTableDialogOpen] = React.useState(false)
  const [detailIdentifier, setDetailIdentifier] = React.useState<TableIdentifier | null>(null)
  const [commitIdentifier, setCommitIdentifier] = React.useState<TableIdentifier | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false)
  const [viewDialogMode, setViewDialogMode] = React.useState<ViewDialogMode>("create")
  const [viewDialogIdentifier, setViewDialogIdentifier] = React.useState<ViewIdentifier | null>(null)
  const [viewDetailIdentifier, setViewDetailIdentifier] = React.useState<ViewIdentifier | null>(null)
  const [workspaceRefreshVersion, setWorkspaceRefreshVersion] = React.useState(0)

  const pageRequestId = React.useRef(0)
  const namespaceRequestId = React.useRef(0)
  const tableRequestId = React.useRef(0)
  const viewRequestId = React.useRef(0)
  const workspaceStatusRequestId = React.useRef(0)
  const hasLoadedRef = React.useRef(false)
  const bucketNamesRef = React.useRef<string[]>([])
  const configRef = React.useRef<CatalogConfig | null>(null)

  const canEnableBucket = isAdmin || hasPermission("admin:SetTableBucket")
  const canCreateNamespace = isAdmin || hasPermission("admin:SetTableNamespace")
  const canUpdateNamespace = isAdmin || hasPermission("admin:UpdateTableNamespaceProperties")
  const canDeleteNamespace = isAdmin || hasPermission("admin:DeleteTableNamespace")
  const canCreateTable = isAdmin || hasPermission("admin:CreateTable")
  const canCommitTable = isAdmin || hasPermission("admin:CommitTable")
  const canDeleteTable = isAdmin || hasPermission("admin:DeleteTable")
  const canCreateView = isAdmin || hasPermission("admin:CreateTable")
  const canReplaceView = isAdmin || hasPermission("admin:CommitTable")
  const canDeleteView = isAdmin || hasPermission("admin:DeleteTable")

  const selectedInfo = selectedBucket ? bucketInfo[selectedBucket] : undefined
  const selectedBucketEnabled = Boolean(selectedInfo?.enabled)
  const selectedNamespaceSegments = React.useMemo(() => {
    const match = namespaces.find((item) => displayNamespace(item.namespace) === selectedNamespace)
    return match?.namespace ?? []
  }, [namespaces, selectedNamespace])

  const loadBucketStatuses = React.useCallback(
    async (names: string[], requestId: number, refreshChildren: boolean) => {
      if (!names.length) return
      setBucketStatusLoading((current) => {
        const next = { ...current }
        for (const name of names) next[name] = true
        return next
      })
      // Treat a status refresh as unknown until every response has completed.
      // This prevents stale enabled state from keeping mutation controls active
      // while the server's current table-bucket state is unavailable.
      setBucketInfo((current) => {
        const next = { ...current }
        for (const name of names) delete next[name]
        return next
      })

      const results = await Promise.allSettled(names.map((name) => getTableBucket(name)))
      if (requestId !== pageRequestId.current) return

      setBucketInfo((current) => {
        const next = { ...current }
        results.forEach((result, index) => {
          const name = names[index]
          if (!name) return
          if (result.status === "fulfilled") next[name] = result.value
          else delete next[name]
        })
        return next
      })
      setBucketErrors((current) => {
        const next = { ...current }
        results.forEach((result, index) => {
          const name = names[index]
          if (!name) return
          if (result.status === "rejected") {
            next[name] = errorText(result.reason, t("Table bucket status is unavailable."))
          } else {
            delete next[name]
          }
        })
        return next
      })
      setBucketStatusLoading((current) => {
        const next = { ...current }
        for (const name of names) next[name] = false
        return next
      })
      if (refreshChildren) setWorkspaceRefreshVersion((version) => version + 1)
    },
    [getTableBucket, t],
  )

  const loadPage = React.useCallback(
    async (force = false) => {
      const requestId = ++pageRequestId.current
      const isInitial = !hasLoadedRef.current
      namespaceRequestId.current += 1
      tableRequestId.current += 1
      viewRequestId.current += 1
      workspaceStatusRequestId.current += 1
      setInitializing(isInitial)
      setRefreshing(!isInitial)
      setPageError("")
      setBucketStatusLoading({})

      const [bucketResult, configResult] = await Promise.allSettled([
        listBuckets(force ? { force: true } : undefined),
        getCatalogConfig(),
      ])
      if (requestId !== pageRequestId.current) return

      let names = bucketNamesRef.current
      if (bucketResult.status === "fulfilled") {
        names = parseBucketNames(bucketResult.value)
        bucketNamesRef.current = names
        setBucketNames(names)
        setSelectedBucket((current) => (current && names.includes(current) ? current : (names[0] ?? "")))
        setBucketInfo((current) => {
          const next: Record<string, TableBucketInfo> = {}
          for (const name of names) {
            if (current[name]) next[name] = current[name]
          }
          return next
        })
        setBucketErrors((current) => {
          const next: Record<string, string> = {}
          for (const name of names) {
            if (current[name]) next[name] = current[name]
          }
          return next
        })
      } else {
        setPageError(errorText(bucketResult.reason, t("Unable to list S3 buckets.")))
      }

      if (configResult.status === "fulfilled") {
        configRef.current = configResult.value
        setConfig(configResult.value)
      } else if (!configRef.current && isInitial && bucketResult.status !== "fulfilled") {
        setPageError(errorText(configResult.reason, t("The table catalog is unavailable.")))
      }

      hasLoadedRef.current = true
      setInitializing(false)
      setRefreshing(false)
      if (bucketResult.status === "fulfilled") void loadBucketStatuses(names, requestId, !isInitial)
    },
    [getCatalogConfig, listBuckets, loadBucketStatuses, t],
  )

  React.useEffect(() => {
    void loadPage()
    return () => {
      pageRequestId.current += 1
    }
  }, [loadPage])

  const loadWorkspace = React.useCallback(async () => {
    const requestId = ++namespaceRequestId.current
    // Invalidate child requests before changing the selected workspace. A
    // previous bucket/namespace response must never repopulate the new view.
    tableRequestId.current += 1
    viewRequestId.current += 1
    setNamespaceError("")
    setTableError("")
    setViewError("")
    setNamespaces([])
    setSelectedNamespace("")
    setTables([])
    setViews([])
    setTableLoading(false)
    setViewLoading(false)
    setTableSearch("")
    setViewSearch("")

    if (!selectedBucket || !selectedBucketEnabled) {
      setNamespaceLoading(false)
      setTableLoading(false)
      setViewLoading(false)
      return
    }

    setNamespaceLoading(true)
    try {
      const result = await listNamespaces(selectedBucket)
      if (requestId !== namespaceRequestId.current) return
      const sorted = [...result].sort((a, b) =>
        displayNamespace(a.namespace).localeCompare(displayNamespace(b.namespace)),
      )
      setNamespaces(sorted)
      setSelectedNamespace((current) => {
        if (sorted.some((item) => displayNamespace(item.namespace) === current)) return current
        return sorted[0] ? displayNamespace(sorted[0].namespace) : ""
      })
    } catch (error) {
      if (requestId !== namespaceRequestId.current) return
      setNamespaceError(errorText(error, t("Unable to load namespaces.")))
    } finally {
      if (requestId === namespaceRequestId.current) setNamespaceLoading(false)
    }
  }, [listNamespaces, selectedBucket, selectedBucketEnabled, t])

  React.useEffect(() => {
    void loadWorkspace()
    return () => {
      namespaceRequestId.current += 1
    }
  }, [loadWorkspace, workspaceRefreshVersion])

  const loadTables = React.useCallback(async () => {
    const requestId = ++tableRequestId.current
    if (!selectedBucket || !selectedBucketEnabled || !selectedNamespaceSegments.length) {
      setTables([])
      setTableLoading(false)
      return
    }

    setTableLoading(true)
    setTableError("")
    try {
      const result = await listTables(selectedBucket, selectedNamespaceSegments)
      if (requestId !== tableRequestId.current) return
      setTables(result.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      if (requestId !== tableRequestId.current) return
      setTableError(errorText(error, t("Unable to load tables.")))
    } finally {
      if (requestId === tableRequestId.current) setTableLoading(false)
    }
  }, [listTables, selectedBucket, selectedBucketEnabled, selectedNamespaceSegments, t])

  React.useEffect(() => {
    void loadTables()
  }, [loadTables])

  const loadViews = React.useCallback(async () => {
    const requestId = ++viewRequestId.current
    if (!selectedBucket || !selectedBucketEnabled || !selectedNamespaceSegments.length) {
      setViews([])
      setViewLoading(false)
      return
    }

    setViewLoading(true)
    setViewError("")
    try {
      const result = await listViews(selectedBucket, selectedNamespaceSegments)
      if (requestId !== viewRequestId.current) return
      setViews(result.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      if (requestId !== viewRequestId.current) return
      setViewError(errorText(error, t("Unable to load views.")))
    } finally {
      if (requestId === viewRequestId.current) setViewLoading(false)
    }
  }, [listViews, selectedBucket, selectedBucketEnabled, selectedNamespaceSegments, t])

  React.useEffect(() => {
    void loadViews()
    return () => {
      viewRequestId.current += 1
    }
  }, [loadViews])

  const refreshWorkspace = React.useCallback(async () => {
    const bucket = selectedBucket
    if (!bucket) return
    const requestId = ++workspaceStatusRequestId.current
    setBucketStatusLoading((current) => ({ ...current, [bucket]: true }))
    setBucketErrors((current) => {
      const next = { ...current }
      delete next[bucket]
      return next
    })
    setBucketInfo((current) => {
      const next = { ...current }
      delete next[bucket]
      return next
    })
    try {
      const info = await getTableBucket(bucket)
      if (requestId !== workspaceStatusRequestId.current) return
      setBucketInfo((current) => ({ ...current, [bucket]: info }))
      setBucketErrors((current) => {
        const next = { ...current }
        delete next[bucket]
        return next
      })
      setWorkspaceRefreshVersion((version) => version + 1)
    } catch (error) {
      if (requestId !== workspaceStatusRequestId.current) return
      const text = errorText(error, t("Table bucket status is unavailable."))
      setBucketInfo((current) => {
        const next = { ...current }
        delete next[bucket]
        return next
      })
      setBucketErrors((current) => ({ ...current, [bucket]: text }))
      message.error(text)
    } finally {
      if (requestId === workspaceStatusRequestId.current) {
        setBucketStatusLoading((current) => ({ ...current, [bucket]: false }))
      }
    }
  }, [getTableBucket, message, selectedBucket, t])

  const handleEnableBucket = () => {
    if (!selectedBucket || !canEnableBucket) return
    dialog.warning({
      title: t("Enable table bucket"),
      content: `${t("This will register the existing bucket as an Iceberg table bucket.")} ${selectedBucket}`,
      positiveText: t("Enable"),
      negativeText: t("Cancel"),
      onPositiveClick: async () => {
        try {
          const info = await enableTableBucket(selectedBucket)
          setBucketInfo((current) => ({ ...current, [selectedBucket]: info }))
          message.success(t("Table bucket enabled"))
        } catch (error) {
          const text = errorText(error, t("Unable to enable table bucket."))
          message.error(text)
          throw error
        }
      },
    })
  }

  const handleDeleteNamespace = React.useCallback(
    (row: NamespaceSummary) => {
      if (!canDeleteNamespace || !selectedBucket) return
      const label = displayNamespace(row.namespace)
      dialog.error({
        title: t("Drop namespace"),
        content: `${t("This removes the namespace entry. Tables must be removed first.")} ${selectedBucket} / ${label}`,
        positiveText: t("Drop namespace"),
        negativeText: t("Cancel"),
        onPositiveClick: async () => {
          try {
            await dropNamespace(selectedBucket, row.namespace)
            message.success(t("Namespace dropped"))
            await loadWorkspace()
          } catch (error) {
            const text = errorText(error, t("Unable to drop namespace."))
            message.error(text)
            throw error
          }
        },
      })
    },
    [canDeleteNamespace, dialog, dropNamespace, loadWorkspace, message, selectedBucket, t],
  )

  const handleEditNamespace = React.useCallback((row: NamespaceSummary) => {
    setNamespaceDialogNamespace(row)
    setNamespaceDialogOpen(true)
  }, [])

  const openCreateNamespace = React.useCallback(() => {
    setNamespaceDialogNamespace(null)
    setNamespaceDialogOpen(true)
  }, [])

  const handleDeleteTable = (identifier: TableIdentifier) => {
    if (!canDeleteTable || !selectedBucket) return
    const label = `${selectedBucket} / ${displayNamespace(identifier.namespace)} / ${identifier.name}`
    dialog.error({
      title: t("Drop table"),
      content: `${t("This removes the catalog entry. Data files are not purged by this action.")} ${label}`,
      positiveText: t("Drop table"),
      negativeText: t("Cancel"),
      onPositiveClick: async () => {
        try {
          await dropTable(selectedBucket, identifier.namespace, identifier.name)
          setDetailIdentifier(null)
          message.success(t("Table dropped"))
          await loadTables()
        } catch (error) {
          const text = errorText(error, t("Unable to drop table."))
          message.error(text)
          throw error
        }
      },
    })
  }

  const handleRequestCommit = React.useCallback((identifier: TableIdentifier) => {
    setDetailIdentifier(null)
    setCommitIdentifier(identifier)
  }, [])

  const handleDeleteView = React.useCallback(
    (identifier: ViewIdentifier) => {
      if (!canDeleteView || !selectedBucket) return
      const label = `${selectedBucket} / ${displayNamespace(identifier.namespace)} / ${identifier.name}`
      dialog.error({
        title: t("Drop view"),
        content: `${t("This removes the view catalog entry. Existing data is not changed.")} ${label}`,
        positiveText: t("Drop view"),
        negativeText: t("Cancel"),
        onPositiveClick: async () => {
          try {
            await dropView(selectedBucket, identifier.namespace, identifier.name)
            setViewDetailIdentifier(null)
            message.success(t("View dropped"))
            await loadViews()
          } catch (error) {
            const text = errorText(error, t("Unable to drop view."))
            message.error(text)
            throw error
          }
        },
      })
    },
    [canDeleteView, dialog, dropView, loadViews, message, selectedBucket, t],
  )

  const openCreateView = React.useCallback(() => {
    if (!selectedNamespaceSegments.length || !canCreateView) return
    setViewDialogIdentifier(null)
    setViewDialogMode("create")
    setViewDialogOpen(true)
  }, [canCreateView, selectedNamespaceSegments.length])

  const openEditView = React.useCallback((identifier: ViewIdentifier) => {
    setViewDetailIdentifier(null)
    setViewDialogIdentifier(identifier)
    setViewDialogMode("edit")
    setViewDialogOpen(true)
  }, [])

  const handleViewSuccess = React.useCallback(() => {
    void loadViews()
  }, [loadViews])

  const copyValue = async (value: string) => {
    try {
      await copyToClipboard(value)
      message.success(t("Copy Success"))
    } catch {
      message.error(t("Copy Failed"))
    }
  }

  const filteredBuckets = React.useMemo(() => {
    const term = bucketSearch.trim().toLowerCase()
    return term ? bucketNames.filter((name) => name.toLowerCase().includes(term)) : bucketNames
  }, [bucketNames, bucketSearch])

  const filteredTables = React.useMemo(() => {
    const term = tableSearch.trim().toLowerCase()
    return term ? tables.filter((table) => table.name.toLowerCase().includes(term)) : tables
  }, [tableSearch, tables])

  const filteredViews = React.useMemo(() => {
    const term = viewSearch.trim().toLowerCase()
    return term ? views.filter((view) => view.name.toLowerCase().includes(term)) : views
  }, [viewSearch, views])

  const tableColumns = React.useMemo<ColumnDef<TableIdentifier>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => t("Table"),
        cell: ({ row }) => (
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 text-start text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            onClick={() => setDetailIdentifier(row.original)}
          >
            <RiTableLine className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate font-mono">{row.original.name}</span>
          </button>
        ),
      },
      {
        id: "identifier",
        header: () => t("Identifier"),
        accessorFn: (row) => `${displayNamespace(row.namespace)}.${row.name}`,
        cell: ({ row }) => (
          <span className="break-all font-mono text-muted-foreground">{`${displayNamespace(row.original.namespace)}.${row.original.name}`}</span>
        ),
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        meta: { width: 100 },
        cell: ({ row }) => (
          <Button variant="outline" size="sm" onClick={() => setDetailIdentifier(row.original)}>
            <RiArrowRightSLine className="size-4" aria-hidden />
            {t("View")}
          </Button>
        ),
      },
    ],
    [t],
  )

  const namespaceColumns = React.useMemo<ColumnDef<NamespaceSummary>[]>(
    () => [
      {
        id: "namespace",
        header: () => t("Namespace"),
        accessorFn: (row) => displayNamespace(row.namespace),
        cell: ({ row }) => <span className="break-all font-mono">{displayNamespace(row.original.namespace)}</span>,
      },
      {
        id: "properties",
        header: () => t("Properties"),
        accessorFn: (row) => (row.propertiesLoaded ? Object.keys(row.properties).length : undefined),
        cell: ({ row }) => (row.original.propertiesLoaded ? Object.keys(row.original.properties).length : "--"),
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        meta: { width: 180 },
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditNamespace(row.original)}
              disabled={!canUpdateNamespace}
            >
              <RiEditLine className="size-4" aria-hidden />
              {t("Edit")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteNamespace(row.original)}
              disabled={!canDeleteNamespace}
              title={!canDeleteNamespace ? t("You do not have permission to manage namespaces.") : undefined}
            >
              <RiDeleteBin5Line className="size-4" aria-hidden />
              {t("Drop")}
            </Button>
          </div>
        ),
      },
    ],
    [canDeleteNamespace, canUpdateNamespace, handleDeleteNamespace, handleEditNamespace, t],
  )

  const viewColumns = React.useMemo<ColumnDef<ViewIdentifier>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => t("View"),
        cell: ({ row }) => (
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 text-start text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            onClick={() => setViewDetailIdentifier(row.original)}
          >
            <RiEyeLine className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate font-mono">{row.original.name}</span>
          </button>
        ),
      },
      {
        id: "identifier",
        header: () => t("Identifier"),
        accessorFn: (row) => `${displayNamespace(row.namespace)}.${row.name}`,
        cell: ({ row }) => (
          <span className="break-all font-mono text-muted-foreground">{`${displayNamespace(row.original.namespace)}.${row.original.name}`}</span>
        ),
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        meta: { width: 180 },
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Button variant="outline" size="sm" onClick={() => setViewDetailIdentifier(row.original)}>
              <RiArrowRightSLine className="size-4" aria-hidden />
              {t("View")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteView(row.original)}
              disabled={!canDeleteView}
              title={!canDeleteView ? t("You do not have permission to delete views.") : undefined}
            >
              <RiDeleteBin5Line className="size-4" aria-hidden />
              {t("Drop")}
            </Button>
          </div>
        ),
      },
    ],
    [canDeleteView, handleDeleteView, t],
  )

  const { table: tableTable } = useDataTable<TableIdentifier>({
    data: filteredTables,
    columns: tableColumns,
    manualPagination: true,
    getRowId: (row) => `${namespaceKey(row.namespace)}:${row.name}`,
  })
  const { table: namespaceTable } = useDataTable<NamespaceSummary>({
    data: namespaces,
    columns: namespaceColumns,
    manualPagination: true,
    getRowId: (row) => namespaceKey(row.namespace),
  })
  const { table: viewTable } = useDataTable<ViewIdentifier>({
    data: filteredViews,
    columns: viewColumns,
    manualPagination: true,
    getRowId: (row) => `${namespaceKey(row.namespace)}:${row.name}`,
  })

  const catalogPrefix = config?.defaults["rustfs.catalog-endpoint-prefix"] ?? "/iceberg/v1"
  const backing = humanizeBacking(
    config?.overrides["rustfs.catalog-backing"] ?? config?.defaults["rustfs.catalog-backing"],
    t("Unknown"),
  )
  const credentialMode =
    selectedInfo?.credentialVending === "supported"
      ? t("Catalog-vended temporary credentials")
      : t("Client-provided S3 credentials")
  const renderWorkspace = () => {
    if (initializing) {
      return (
        <div className="flex min-h-96 items-center justify-center gap-3 text-sm text-muted-foreground" role="status">
          <Spinner className="size-6" aria-hidden />
          {t("Loading table catalog…")}
        </div>
      )
    }

    if (pageError && !bucketNames.length) {
      return (
        <div className="border border-destructive/50 bg-destructive/10 p-6" role="alert">
          <div className="flex items-start gap-2">
            <RiAlertLine className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium text-destructive">{t("Unable to list S3 buckets.")}</p>
              <p className="mt-1 break-words text-sm text-muted-foreground">{pageError}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => void loadPage(true)}
            disabled={refreshing}
          >
            <RiRefreshLine className="size-4" aria-hidden />
            {t("Retry")}
          </Button>
        </div>
      )
    }

    if (!bucketNames.length) {
      return (
        <EmptyState
          className="min-h-96"
          icon={<RiArchiveLine className="size-6" aria-hidden />}
          title={t("No S3 buckets")}
          description={t("Create a bucket first, then enable it as a table bucket from this page.")}
        >
          <Button variant="outline" nativeButton={false} render={<Link href="/browser" />}>
            <RiAddLine className="size-4" aria-hidden />
            {t("Create bucket")}
          </Button>
        </EmptyState>
      )
    }

    return (
      <div className="grid min-h-[36rem] border bg-card lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside
          className="flex min-h-0 flex-col border-b lg:border-b-0 lg:border-e"
          aria-labelledby="table-buckets-heading"
        >
          <div className="space-y-3 border-b p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id="table-buckets-heading" className="text-sm font-semibold">
                  {t("Table buckets")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{t("Select an S3 bucket to inspect its catalog.")}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/browser" />}
                title={t("Manage buckets")}
              >
                <RiArchiveLine aria-hidden />
                <span>{t("Manage buckets")}</span>
              </Button>
            </div>
            <SearchInput
              value={bucketSearch}
              onChange={setBucketSearch}
              placeholder={t("Search buckets")}
              aria-label={t("Search table buckets")}
              clearable
            />
          </div>
          <div className="min-h-0 flex-1 divide-y overflow-y-auto">
            {filteredBuckets.length ? (
              filteredBuckets.map((name) => {
                const info = bucketInfo[name]
                const unavailable = bucketErrors[name]
                const loading = bucketStatusLoading[name]
                const selected = name === selectedBucket
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedBucket(name)}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                      selected && "bg-muted",
                    )}
                  >
                    <RiTableLine
                      className={cn("size-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs" title={name}>
                      {name}
                    </span>
                    {loading ? (
                      <Spinner className="size-3.5 shrink-0" aria-label={t("Loading…")} />
                    ) : unavailable ? (
                      <Badge variant="outline" title={unavailable}>
                        {t("Unknown")}
                      </Badge>
                    ) : info?.enabled ? (
                      <Badge variant="secondary">
                        <RiCheckLine aria-hidden />
                        {t("Enabled")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t("S3 bucket")}</Badge>
                    )}
                  </button>
                )
              })
            ) : (
              <p className="p-4 text-sm text-muted-foreground">{t("No matching buckets.")}</p>
            )}
          </div>
        </aside>

        <section className="min-w-0" aria-labelledby="selected-table-bucket-heading">
          <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Warehouse")}</p>
              <h2 id="selected-table-bucket-heading" className="mt-1 break-all font-mono text-base font-semibold">
                {selectedBucket ? `s3://${selectedBucket}/` : t("No bucket selected")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedInfo?.enabled
                  ? t("Iceberg metadata and data are managed through this table bucket.")
                  : t("Enable this bucket to create namespaces and tables.")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {selectedInfo?.enabled ? (
                <Badge variant="secondary">
                  <RiCheckLine aria-hidden />
                  {t("Ready")}
                </Badge>
              ) : selectedInfo ? (
                <Badge variant="outline">{t("Not enabled")}</Badge>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refreshWorkspace()}
                disabled={!selectedBucket || bucketStatusLoading[selectedBucket]}
              >
                <RiRefreshLine className="size-4" aria-hidden />
                {t("Refresh")}
              </Button>
              {selectedInfo?.enabled && activeTab === "tables" ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setTableDialogOpen(true)}
                  disabled={!canCreateTable || !selectedNamespaceSegments.length}
                >
                  <RiAddLine className="size-4" aria-hidden />
                  {t("Create table")}
                </Button>
              ) : selectedInfo?.enabled && activeTab === "views" ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={openCreateView}
                  disabled={!canCreateView || !selectedNamespaceSegments.length}
                >
                  <RiAddLine className="size-4" aria-hidden />
                  {t("Create view")}
                </Button>
              ) : selectedInfo?.enabled ? null : selectedInfo &&
                !bucketErrors[selectedBucket] &&
                !bucketStatusLoading[selectedBucket] ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleEnableBucket}
                  disabled={!canEnableBucket || !selectedBucket}
                >
                  <RiTableLine className="size-4" aria-hidden />
                  {t("Enable table bucket")}
                </Button>
              ) : null}
            </div>
          </div>

          {bucketErrors[selectedBucket] ? (
            <div className="m-4 border border-amber-500/40 bg-amber-500/10 p-4" role="status">
              <div className="flex items-start gap-2">
                <RiAlertLine className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t("Table bucket status is unavailable.")}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{bucketErrors[selectedBucket]}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void refreshWorkspace()}>
                <RiRefreshLine className="size-4" aria-hidden />
                {t("Retry")}
              </Button>
            </div>
          ) : null}

          {!selectedInfo && !bucketErrors[selectedBucket] ? (
            <div
              className="flex min-h-96 items-center justify-center gap-3 text-sm text-muted-foreground"
              role="status"
            >
              <Spinner className="size-5" aria-hidden />
              {t("Loading bucket status…")}
            </div>
          ) : selectedInfo && !selectedInfo.enabled ? (
            <EmptyState
              className="min-h-96"
              icon={<RiTableLine className="size-6" aria-hidden />}
              title={t("This bucket is not table-enabled")}
              description={t(
                "Enabling registers the existing S3 bucket as an Iceberg REST Catalog warehouse. Existing objects are not deleted.",
              )}
            >
              <Button onClick={handleEnableBucket} disabled={!canEnableBucket}>
                <RiTableLine className="size-4" aria-hidden />
                {t("Enable table bucket")}
              </Button>
            </EmptyState>
          ) : selectedInfo ? (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <RiCloudLine className="size-4" aria-hidden />
                  {selectedInfo.catalogType || "rest"}
                </span>
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <span>{t("Catalog URI")}</span>
                  <code className="max-w-[20rem] truncate font-mono text-foreground" title={selectedInfo.catalogUri}>
                    {selectedInfo.catalogUri || `${catalogPrefix}/${selectedBucket}`}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t("Copy catalog URI")}
                    title={t("Copy catalog URI")}
                    onClick={() => void copyValue(selectedInfo.catalogUri || `${catalogPrefix}/${selectedBucket}`)}
                  >
                    <RiClipboardLine className="size-3.5" aria-hidden />
                  </Button>
                </span>
              </div>

              <div className="space-y-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="table-catalog-namespace-select" className="mb-1.5 block text-xs font-medium">
                      {t("Namespace")}
                    </label>
                    <NativeSelect
                      id="table-catalog-namespace-select"
                      name="namespace"
                      value={selectedNamespace}
                      onChange={(event) => setSelectedNamespace(event.target.value)}
                      className="w-full sm:max-w-sm"
                      disabled={namespaceLoading || !namespaces.length}
                      aria-label={t("Select namespace")}
                    >
                      {!namespaces.length ? (
                        <NativeSelectOption value="">{t("No namespaces")}</NativeSelectOption>
                      ) : null}
                      {namespaces.map((item) => {
                        const label = displayNamespace(item.namespace)
                        return (
                          <NativeSelectOption key={label} value={label}>
                            {label}
                          </NativeSelectOption>
                        )
                      })}
                    </NativeSelect>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={openCreateNamespace} disabled={!canCreateNamespace}>
                      <RiAddLine className="size-4" aria-hidden />
                      {t("Create namespace")}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {namespaceLoading ? t("Loading…") : `${namespaces.length} ${t("namespaces")}`}
                    </span>
                  </div>
                </div>

                {namespaceError ? (
                  <Alert variant="destructive">
                    <RiAlertLine className="size-4" aria-hidden />
                    <AlertTitle>{t("Unable to load namespaces")}</AlertTitle>
                    <AlertDescription>
                      <span className="break-words">{namespaceError}</span>
                      <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadWorkspace()}>
                        <RiRefreshLine className="size-4" aria-hidden />
                        {t("Retry")}
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Tabs
                  value={activeTab}
                  onValueChange={(value) => setActiveTab((value as CatalogTab) || "tables")}
                  className="gap-4"
                >
                  <TabsList variant="line" className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="tables">{t("Tables")}</TabsTrigger>
                    <TabsTrigger value="views">{t("Views")}</TabsTrigger>
                    <TabsTrigger value="namespaces">{t("Namespaces")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="tables" className="mt-0 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{selectedNamespace || t("Tables")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("Open a table to inspect metadata, snapshots, and recovery evidence.")}
                        </p>
                      </div>
                      <SearchInput
                        value={tableSearch}
                        onChange={setTableSearch}
                        placeholder={t("Search tables")}
                        aria-label={t("Search tables")}
                        clearable
                        className="sm:max-w-xs"
                      />
                    </div>
                    {tableError ? (
                      <Alert variant="destructive">
                        <RiAlertLine className="size-4" aria-hidden />
                        <AlertTitle>{t("Unable to load tables")}</AlertTitle>
                        <AlertDescription>
                          <span className="break-words">{tableError}</span>
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadTables()}>
                            <RiRefreshLine className="size-4" aria-hidden />
                            {t("Retry")}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    <DataTable
                      table={tableTable}
                      isLoading={tableLoading}
                      caption={t("Iceberg tables")}
                      emptyTitle={tableSearch ? t("No matching tables") : t("No tables")}
                      emptyDescription={
                        tableSearch
                          ? t("Try a different table name.")
                          : t("Create a table in this namespace to start publishing data.")
                      }
                    />
                  </TabsContent>

                  <TabsContent value="views" className="mt-0 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{selectedNamespace || t("Views")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("Create and replace SQL views registered in this namespace.")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <SearchInput
                          value={viewSearch}
                          onChange={setViewSearch}
                          placeholder={t("Search views")}
                          aria-label={t("Search views")}
                          clearable
                          className="sm:max-w-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openCreateView}
                          disabled={!canCreateView || !selectedNamespaceSegments.length}
                        >
                          <RiAddLine className="size-4" aria-hidden />
                          {t("Create view")}
                        </Button>
                      </div>
                    </div>
                    {viewError ? (
                      <Alert variant="destructive">
                        <RiAlertLine className="size-4" aria-hidden />
                        <AlertTitle>{t("Unable to load views")}</AlertTitle>
                        <AlertDescription>
                          <span className="break-words">{viewError}</span>
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => void loadViews()}>
                            <RiRefreshLine className="size-4" aria-hidden />
                            {t("Retry")}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    <DataTable
                      table={viewTable}
                      isLoading={viewLoading}
                      caption={t("Iceberg views")}
                      emptyTitle={viewSearch ? t("No matching views") : t("No views")}
                      emptyDescription={
                        viewSearch
                          ? t("Try a different view name.")
                          : t("Create a view in this namespace to expose SQL.")
                      }
                    />
                  </TabsContent>

                  <TabsContent value="namespaces" className="mt-0 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">{t("Namespaces")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("Namespaces group tables and carry optional catalog properties.")}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={openCreateNamespace} disabled={!canCreateNamespace}>
                        <RiAddLine className="size-4" aria-hidden />
                        {t("Create namespace")}
                      </Button>
                    </div>
                    <DataTable
                      table={namespaceTable}
                      isLoading={namespaceLoading}
                      caption={t("Iceberg namespaces")}
                      emptyTitle={t("No namespaces")}
                      emptyDescription={t("Create a namespace before creating an Iceberg table.")}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    )
  }

  return (
    <Page>
      <PageHeader
        description={
          <p className="text-sm text-muted-foreground">
            {t("Manage Iceberg REST Catalog table buckets, namespaces, tables, and views.")}
          </p>
        }
        actions={
          <Button variant="outline" onClick={() => void loadPage(true)} disabled={refreshing}>
            <RiRefreshLine
              className={cn("size-4", refreshing && "animate-spin motion-reduce:animate-none")}
              aria-hidden
            />
            {refreshing ? t("Refreshing…") : t("Refresh")}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{t("S3 Tables")}</h1>
          <Badge variant="outline">{t("Iceberg REST Catalog")}</Badge>
        </div>
      </PageHeader>

      {pageError && bucketNames.length ? (
        <div className="border border-destructive/50 bg-destructive/10 p-4" role="alert">
          <div className="flex items-start gap-2">
            <RiAlertLine className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium text-destructive">{t("The table catalog could not be loaded.")}</p>
              <p className="mt-1 break-words text-sm text-muted-foreground">{pageError}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void loadPage(true)}
            disabled={refreshing}
          >
            <RiRefreshLine className="size-4" aria-hidden />
            {t("Retry")}
          </Button>
        </div>
      ) : null}

      <section aria-labelledby="table-catalog-state-heading" className="border bg-card">
        <h2 id="table-catalog-state-heading" className="sr-only">
          {t("Table catalog status")}
        </h2>
        <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <div className="space-y-1 p-4">
            <p className="text-xs text-muted-foreground">{t("Catalog endpoint")}</p>
            <p className="break-all font-mono text-sm">{catalogPrefix}</p>
          </div>
          <div className="space-y-1 p-4">
            <p className="text-xs text-muted-foreground">{t("Catalog backing")}</p>
            <p className="text-sm">{backing}</p>
          </div>
          <div className="space-y-1 p-4">
            <p className="text-xs text-muted-foreground">{t("Credential mode")}</p>
            <p className="break-words text-sm">{credentialMode}</p>
          </div>
          <div className="space-y-1 p-4">
            <p className="text-xs text-muted-foreground">{t("Catalog contract")}</p>
            <p className="text-sm">{tableMetadataCount(config)}</p>
          </div>
        </div>
      </section>

      {renderWorkspace()}

      <NamespaceDialog
        open={namespaceDialogOpen}
        bucket={selectedBucket}
        initialNamespace={namespaceDialogNamespace}
        canCreate={canCreateNamespace}
        canUpdate={canUpdateNamespace}
        onOpenChange={setNamespaceDialogOpen}
        onSuccess={() => void loadWorkspace()}
      />
      <TableDialog
        open={tableDialogOpen}
        bucket={selectedBucket}
        namespace={selectedNamespaceSegments}
        canCreate={canCreateTable}
        onOpenChange={setTableDialogOpen}
        onSuccess={() => void loadTables()}
      />
      <TableDetailDialog
        open={Boolean(detailIdentifier)}
        bucket={selectedBucket}
        identifier={detailIdentifier}
        onOpenChange={(open) => {
          if (!open) setDetailIdentifier(null)
        }}
        canCommit={canCommitTable}
        canDelete={canDeleteTable}
        onRequestCommit={handleRequestCommit}
        onRequestDelete={handleDeleteTable}
      />
      <TableCommitDialog
        open={Boolean(commitIdentifier)}
        bucket={selectedBucket}
        identifier={commitIdentifier}
        canCommit={canCommitTable}
        onOpenChange={(open) => {
          if (!open) setCommitIdentifier(null)
        }}
        onSuccess={() => {
          setCommitIdentifier(null)
          void loadTables()
        }}
      />
      <ViewDialog
        open={viewDialogOpen}
        bucket={selectedBucket}
        namespace={viewDialogIdentifier?.namespace ?? selectedNamespaceSegments}
        mode={viewDialogMode}
        identifier={viewDialogIdentifier}
        canSubmit={viewDialogMode === "create" ? canCreateView : canReplaceView}
        onOpenChange={setViewDialogOpen}
        onSuccess={handleViewSuccess}
      />
      <ViewDetailDialog
        open={Boolean(viewDetailIdentifier)}
        bucket={selectedBucket}
        identifier={viewDetailIdentifier}
        canReplace={canReplaceView}
        canDelete={canDeleteView}
        onOpenChange={(open) => {
          if (!open) setViewDetailIdentifier(null)
        }}
        onRequestEdit={openEditView}
        onRequestDelete={handleDeleteView}
      />
    </Page>
  )
}
