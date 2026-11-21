"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiRefreshLine, RiSettings5Line, RiDeleteBin5Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/search-input"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { BucketNewForm } from "@/components/buckets/new-form"
import { BucketUsageOverview } from "@/components/buckets/usage-overview"
import { Spinner } from "@/components/ui/spinner"
import { useBucket } from "@/hooks/use-bucket"
import { useObject } from "@/hooks/use-object"
import { usePermissions } from "@/hooks/use-permissions"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { formatDateTime } from "@/lib/functions"
import { normalizeDateToIso } from "@/lib/safe-date"
import { getAccountBucketUsage, getAccountBucketScanStatus } from "@/lib/account-bucket-usage"
import type { AccountBucketScanStatus } from "@/lib/account-bucket-usage"
import { BucketUsageValue, BucketScanNotice } from "@/components/buckets/usage-value"
import { BucketNameCell, type BucketNameRow } from "@/components/buckets/name-cell"
import { loadBucketPolicyStatuses } from "@/lib/bucket-policy-status"
import { BrowserContent } from "./content"
import type { ColumnDef } from "@tanstack/react-table"

interface BucketRow {
  Name: string
  CreationDate: string
  Unmeasured?: boolean
  Count?: number
  ScanStatus?: AccountBucketScanStatus
  SizeBytes?: number
  IsPublic?: boolean
}

type BucketViewRow = BucketRow & BucketNameRow

function BrowserBucketsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const message = useMessage()
  const dialog = useDialog()
  const {
    canCapability,
    mayCapability,
    userInfo,
    isLoading: accountInfoLoading,
    hasFetchedPolicy,
    fetchUserPolicy,
  } = usePermissions()
  const { listBuckets, deleteBucket, getBucketPolicyStatus } = useBucket()

  const [formVisible, setFormVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [data, setData] = useState<BucketRow[]>([])
  const [loadError, setLoadError] = useState(false)
  const [pending, setPending] = useState(true)
  const [policyLoading, setPolicyLoading] = useState(false)
  const fetchIdRef = useRef(0)

  const canCreateBucket = mayCapability("bucket.create")

  const loadPolicyStatus = useCallback(
    async (fetchId: number, bucketNames: string[]) => {
      if (bucketNames.length === 0) {
        setPolicyLoading(false)
        return
      }

      try {
        const policyMap = await loadBucketPolicyStatuses(bucketNames, getBucketPolicyStatus)
        if (fetchId !== fetchIdRef.current) return

        setData((prev) =>
          prev.map((row) => ({
            ...row,
            IsPublic: policyMap[row.Name],
          })),
        )
      } catch {
        if (fetchId !== fetchIdRef.current) return
      } finally {
        if (fetchId === fetchIdRef.current) {
          setPolicyLoading(false)
        }
      }
    },
    [getBucketPolicyStatus],
  )

  const fetchBuckets = useCallback(
    async (options?: { force?: boolean }) => {
      const fetchId = fetchIdRef.current + 1
      fetchIdRef.current = fetchId
      setPending(true)
      setLoadError(false)
      try {
        const response = await listBuckets(options)
        if (fetchId !== fetchIdRef.current) return

        const buckets = ((response as { Buckets?: Array<{ Name?: string; CreationDate?: string }> })?.Buckets ?? [])
          .map((item) => {
            const name = item?.Name
            if (!name) return null

            const bucketRow: BucketRow = {
              Name: name,
              CreationDate: normalizeDateToIso(item?.CreationDate),
            }

            return bucketRow
          })
          .filter((bucket): bucket is BucketRow => bucket !== null)
          .sort((a, b) => a.Name.localeCompare(b.Name))

        setData(buckets)
        setPending(false)

        if (options?.force) {
          void fetchUserPolicy()
        }

        setPolicyLoading(true)
        void loadPolicyStatus(
          fetchId,
          buckets.map((bucket) => bucket.Name),
        )
      } catch (error) {
        if (fetchId !== fetchIdRef.current) return
        console.error("Failed to fetch buckets:", error)
        setLoadError(true)
      } finally {
        if (fetchId === fetchIdRef.current) {
          setPending(false)
        }
      }
    },
    [fetchUserPolicy, listBuckets, loadPolicyStatus],
  )

  useEffect(() => {
    fetchBuckets({ force: true })
  }, [fetchBuckets])

  const usageLoading = accountInfoLoading || !hasFetchedPolicy
  const bucketUsage = useMemo(() => getAccountBucketUsage(userInfo), [userInfo])
  const scanStatuses = useMemo(() => getAccountBucketScanStatus(userInfo), [userInfo])
  const rowsWithUsage = useMemo(
    () =>
      data.map((row) => {
        const usage = bucketUsage.get(row.Name)
        const ScanStatus = scanStatuses.get(row.Name)
        const BucketHref = `/browser?bucket=${encodeURIComponent(row.Name)}`
        if (!usage) return { ...row, BucketHref, ScanStatus, Unmeasured: usage === null }

        return {
          ...row,
          BucketHref,
          ScanStatus,
          Count: usage.objectsCount,
          SizeBytes: usage.sizeBytes,
        }
      }),
    [bucketUsage, scanStatuses, data],
  )
  const filteredData = useMemo(
    () =>
      searchTerm
        ? rowsWithUsage.filter((bucket) => bucket.Name.toLowerCase().includes(searchTerm.toLowerCase()))
        : rowsWithUsage,
    [rowsWithUsage, searchTerm],
  )

  const objectApi = useObject("")

  const baseColumns: ColumnDef<BucketViewRow>[] = [
    {
      header: () => t("Bucket"),
      accessorKey: "Name",
      cell: BucketNameCell,
    },
    {
      header: () => t("Creation Date"),
      accessorKey: "CreationDate",
      cell: ({ row }) => formatDateTime(row.original.CreationDate),
    },
  ]

  baseColumns.push(
    {
      header: () => t("Object Count"),
      accessorKey: "Count",
      meta: { align: "end" },
      cell: ({ row }) => (
        <BucketUsageValue
          value={row.original.Count}
          kind="objects"
          status={row.original.ScanStatus}
          loading={usageLoading}
          unmeasured={row.original.Unmeasured}
        />
      ),
    },
    {
      header: () => t("Size"),
      id: "SizeBytes",
      meta: { align: "end" },
      // use numeric bytes for sorting via accessorFn, but display the formatted string
      accessorFn: (row) => (typeof row.SizeBytes === "number" ? row.SizeBytes : undefined),
      cell: ({ row }) => (
        <BucketUsageValue
          value={row.original.SizeBytes}
          kind="size"
          status={row.original.ScanStatus}
          loading={usageLoading}
          unmeasured={row.original.Unmeasured}
        />
      ),
    },
  )

  baseColumns.push({
    header: () => t("Access Policy"),
    accessorKey: "IsPublic",
    cell: ({ row }) => {
      if (typeof row.original.IsPublic === "boolean") {
        return row.original.IsPublic ? (
          <span className="text-destructive">{t("Public")}</span>
        ) : (
          <span className="text-muted-foreground">{t("Private")}</span>
        )
      }
      return policyLoading ? <Spinner className="size-3 text-muted-foreground" /> : "-"
    },
  })

  baseColumns.push({
    id: "actions",
    header: () => t("Actions"),
    enableSorting: false,
    meta: { width: 200 },
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/buckets?bucket=${encodeURIComponent(row.original.Name)}`)}
        >
          <RiSettings5Line className="size-4" aria-hidden />
          <span>{t("Settings")}</span>
        </Button>
        {canCapability("bucket.delete", { bucket: row.original.Name }) ? (
          <Button variant="outline" size="sm" onClick={() => confirmDelete(row.original)}>
            <RiDeleteBin5Line className="size-4" aria-hidden />
            <span>{t("Delete")}</span>
          </Button>
        ) : null}
      </div>
    ),
  })

  const { table } = useDataTable<BucketViewRow>({
    data: filteredData,
    columns: baseColumns,
    manualPagination: true,
    getRowId: (row) => row.Name,
  })

  const handleFormClosed = (value: boolean) => {
    setFormVisible(value)
    if (!value) fetchBuckets({ force: true })
  }

  const confirmDelete = (row: BucketRow) => {
    dialog.error({
      title: t("Warning"),
      content: `${row.Name}: ${t("Are you sure you want to delete this bucket?")}`,
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: () => deleteItem(row),
    })
  }

  const deleteItem = async (row: BucketRow) => {
    try {
      const files = await objectApi.listObject(row.Name, undefined, 1)
      const hasObjects =
        Boolean((files as { Contents?: Array<{ Key?: string }> })?.Contents?.some((item) => Boolean(item?.Key))) ||
        Boolean((files as { CommonPrefixes?: unknown[] })?.CommonPrefixes?.length)

      if (hasObjects) {
        message.error(t("Bucket is not empty"))
        return
      }

      await deleteBucket(row.Name)
      message.success(t("Delete Success"))
      await fetchBuckets({ force: true })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      const msg = err?.response?.data?.message ?? (error as Error)?.message ?? t("Delete Failed")
      message.error(msg)
    }
  }

  return (
    <Page>
      <PageHeader
        actions={
          <>
            {canCreateBucket ? (
              <Button onClick={() => setFormVisible(true)}>
                <RiAddLine className="size-4" aria-hidden />
                <span>{t("Create Bucket")}</span>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => fetchBuckets({ force: true })}>
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Buckets")}</h1>
      </PageHeader>

      <BucketUsageOverview
        names={data.map((bucket) => bucket.Name)}
        usage={bucketUsage}
        unavailable={pending || loadError}
        usageLoading={usageLoading}
        usageAvailable={!usageLoading && Array.isArray(userInfo?.buckets)}
      />

      <BucketScanNotice statuses={scanStatuses} />

      <DataTable
        toolbar={
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("Search")}
            clearable
            className="max-w-sm"
          />
        }
        keepPreviousData
        table={table}
        isLoading={pending}
        caption={t("Buckets")}
        errorTitle={loadError ? t("Failed to load bucket list") : undefined}
        onRetry={() => void fetchBuckets({ force: true })}
        emptyTitle={searchTerm ? t("No buckets match your search") : t("No Buckets")}
        emptyDescription={searchTerm ? "" : t("Create a bucket to start storing objects.")}
      />

      <BucketNewForm show={formVisible} onShowChange={handleFormClosed} />
    </Page>
  )
}

export default function BrowserPage() {
  const searchParams = useSearchParams()
  const bucketName = searchParams.get("bucket") ?? ""
  const keyPath = searchParams.get("key") ?? ""
  const preview = searchParams.get("preview") === "true"
  const previewKey = searchParams.get("previewKey") ?? ""

  if (bucketName) {
    return <BrowserContent bucketName={bucketName} keyPath={keyPath} preview={preview} previewKey={previewKey} />
  }

  return <BrowserBucketsPage />
}
