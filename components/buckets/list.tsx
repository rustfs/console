"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { RiArchiveLine, RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/search-input"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useBucket } from "@/hooks/use-bucket"
import { usePermissions } from "@/hooks/use-permissions"
import { Spinner } from "@/components/ui/spinner"
import { formatDateTime, formatInteger, niceBytes } from "@/lib/functions"
import { normalizeDateToIso } from "@/lib/safe-date"
import { getAccountBucketUsage } from "@/lib/account-bucket-usage"
import type { ColumnDef } from "@tanstack/react-table"

export interface BucketListRow {
  Name: string
  CreationDate: string
  Count?: number
  Size?: string
  SizeBytes?: number
  IsPublic?: boolean
}

interface BucketListProps {
  title: React.ReactNode
  emptyDescription: string
  getBucketHref: (bucketName: string) => string
}

export function BucketList({ title, emptyDescription, getBucketHref }: BucketListProps) {
  const { t } = useTranslation()
  const { listBuckets, getBucketPolicyStatus } = useBucket()
  const { userInfo, isLoading: accountInfoLoading, hasFetchedPolicy, fetchUserPolicy } = usePermissions()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [data, setData] = React.useState<BucketListRow[]>([])
  const [pending, setPending] = React.useState(true)
  const [policyLoading, setPolicyLoading] = React.useState(false)
  const fetchIdRef = React.useRef(0)

  const loadPolicyStatus = React.useCallback(
    async (fetchId: number, bucketNames: string[]) => {
      if (bucketNames.length === 0) {
        setPolicyLoading(false)
        return
      }

      try {
        const results = await Promise.all(
          bucketNames.map(async (name) => {
            try {
              const resp = (await getBucketPolicyStatus(name)) as {
                PolicyStatus?: { IsPublic?: boolean }
              }
              return { name, isPublic: resp?.PolicyStatus?.IsPublic === true }
            } catch {
              return { name, isPublic: false }
            }
          }),
        )
        if (fetchId !== fetchIdRef.current) return

        const policyMap = Object.fromEntries(results.map((r) => [r.name, r.isPublic]))
        setData((prev) =>
          prev.map((row) => ({
            ...row,
            IsPublic: policyMap[row.Name] ?? false,
          })),
        )
      } finally {
        if (fetchId === fetchIdRef.current) {
          setPolicyLoading(false)
        }
      }
    },
    [getBucketPolicyStatus],
  )

  const fetchBuckets = React.useCallback(
    async (options?: { force?: boolean }) => {
      const fetchId = fetchIdRef.current + 1
      fetchIdRef.current = fetchId
      setPending(true)
      try {
        const response = await listBuckets(options)
        if (fetchId !== fetchIdRef.current) return

        const buckets = ((response as { Buckets?: Array<{ Name?: string; CreationDate?: string }> })?.Buckets ?? [])
          .map((item) => {
            const name = item?.Name
            if (!name) return null

            return {
              Name: name,
              CreationDate: normalizeDateToIso(item?.CreationDate),
            }
          })
          .filter((bucket): bucket is BucketListRow => bucket !== null)
          .sort((a, b) => a.Name.localeCompare(b.Name))

        setData(buckets)

        const bucketNames = buckets.map((bucket) => bucket.Name)
        if (options?.force) {
          void fetchUserPolicy()
        }

        setPolicyLoading(true)
        void loadPolicyStatus(fetchId, bucketNames)
      } catch {
        if (fetchId !== fetchIdRef.current) return
        setData([])
      } finally {
        if (fetchId === fetchIdRef.current) {
          setPending(false)
        }
      }
    },
    [fetchUserPolicy, listBuckets, loadPolicyStatus],
  )

  React.useEffect(() => {
    fetchBuckets()
  }, [fetchBuckets])

  const usageLoading = accountInfoLoading || !hasFetchedPolicy
  const bucketUsage = React.useMemo(() => getAccountBucketUsage(userInfo), [userInfo])
  const rowsWithUsage = React.useMemo(
    () =>
      data.map((row) => {
        const usage = bucketUsage.get(row.Name)
        if (!usage) return row

        return {
          ...row,
          Count: usage.objectsCount,
          Size: niceBytes(String(usage.sizeBytes)),
          SizeBytes: usage.sizeBytes,
        }
      }),
    [bucketUsage, data],
  )
  const filteredData = React.useMemo(
    () =>
      searchTerm
        ? rowsWithUsage.filter((bucket) => bucket.Name.toLowerCase().includes(searchTerm.toLowerCase()))
        : rowsWithUsage,
    [rowsWithUsage, searchTerm],
  )

  const columns: ColumnDef<BucketListRow>[] = React.useMemo(
    () => [
      {
        header: () => t("Bucket"),
        accessorKey: "Name",
        cell: ({ row }) => (
          <Link
            href={getBucketHref(row.original.Name)}
            className="flex min-w-0 max-w-full items-center gap-2 text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            <RiArchiveLine className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{row.original.Name}</span>
          </Link>
        ),
      },
      {
        header: () => t("Creation Date"),
        accessorKey: "CreationDate",
        cell: ({ row }) => formatDateTime(row.original.CreationDate),
      },
      {
        header: () => t("Object Count"),
        accessorKey: "Count",
        cell: ({ row }) =>
          typeof row.original.Count === "number" ? (
            formatInteger(row.original.Count)
          ) : usageLoading ? (
            <Spinner className="size-3 text-muted-foreground" />
          ) : (
            "--"
          ),
      },
      {
        header: () => t("Size"),
        id: "SizeBytes",
        accessorFn: (row) => (typeof row.SizeBytes === "number" ? row.SizeBytes : undefined),
        cell: ({ row }) =>
          row.original.Size ?? (usageLoading ? <Spinner className="size-3 text-muted-foreground" /> : "--"),
      },
      {
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
          return policyLoading ? <Spinner className="size-3 text-muted-foreground" /> : "--"
        },
      },
    ],
    [getBucketHref, policyLoading, t, usageLoading],
  )

  const { table } = useDataTable<BucketListRow>({
    data: filteredData,
    columns,
    manualPagination: true,
    getRowId: (row) => row.Name,
  })

  return (
    <>
      <div className="sticky top-0 z-5 flex flex-col justify-between gap-2 bg-background lg:flex-row">
        <div className="space-y-2">{title}</div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("Search")}
            clearable
            className="max-w-sm"
          />
          <Button variant="outline" onClick={() => fetchBuckets({ force: true })}>
            <RiRefreshLine className="size-4" aria-hidden />
            <span>{t("Refresh")}</span>
          </Button>
        </div>
      </div>

      <DataTable table={table} isLoading={pending} emptyTitle={t("No Buckets")} emptyDescription={emptyDescription} />
    </>
  )
}
