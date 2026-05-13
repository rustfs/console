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
import { useSystem } from "@/hooks/use-system"
import { Spinner } from "@/components/ui/spinner"
import { niceBytes } from "@/lib/functions"
import type { ColumnDef } from "@tanstack/react-table"
import dayjs from "dayjs"

export interface BucketListRow {
  Name: string
  CreationDate: string
  Count?: number
  Size?: string
  SizeBytes?: number
  IsPublic?: boolean
}

type BucketUsageMap = Record<string, { objects_count?: number; size?: number } | undefined>

interface BucketListProps {
  title: React.ReactNode
  emptyDescription: string
  getBucketHref: (bucketName: string) => string
}

export function BucketList({ title, emptyDescription, getBucketHref }: BucketListProps) {
  const { t } = useTranslation()
  const { listBuckets, getBucketPolicyStatus } = useBucket()
  const { getDataUsageInfo } = useSystem()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [data, setData] = React.useState<BucketListRow[]>([])
  const [pending, setPending] = React.useState(true)
  const [usageLoading, setUsageLoading] = React.useState(false)
  const [policyLoading, setPolicyLoading] = React.useState(false)
  const fetchIdRef = React.useRef(0)

  const loadBucketUsage = React.useCallback(
    async (fetchId: number, bucketNames: string[]) => {
      if (bucketNames.length === 0) {
        setUsageLoading(false)
        return
      }

      try {
        const usage = (await getDataUsageInfo()) as { buckets_usage?: BucketUsageMap } | undefined
        if (fetchId !== fetchIdRef.current || !usage) return

        const bucketUsage = usage.buckets_usage ?? {}
        setData((prev) =>
          prev.map((row) => {
            const stats = bucketUsage[row.Name]
            const objectsCount = typeof stats?.objects_count === "number" ? stats.objects_count : 0
            const totalSize = typeof stats?.size === "number" ? stats.size : 0
            return {
              ...row,
              Count: objectsCount,
              Size: niceBytes(String(totalSize)),
              SizeBytes: totalSize,
            }
          }),
        )
      } finally {
        if (fetchId === fetchIdRef.current) {
          setUsageLoading(false)
        }
      }
    },
    [getDataUsageInfo],
  )

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
              CreationDate: item?.CreationDate ? new Date(item.CreationDate).toISOString() : "",
            }
          })
          .filter((bucket): bucket is BucketListRow => bucket !== null)
          .sort((a, b) => a.Name.localeCompare(b.Name))

        setData(buckets)

        const bucketNames = buckets.map((bucket) => bucket.Name)
        setUsageLoading(true)
        void loadBucketUsage(fetchId, bucketNames)

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
    [listBuckets, loadBucketUsage, loadPolicyStatus],
  )

  React.useEffect(() => {
    fetchBuckets()
  }, [fetchBuckets])

  const filteredData = React.useMemo(
    () => (searchTerm ? data.filter((bucket) => bucket.Name.toLowerCase().includes(searchTerm.toLowerCase())) : data),
    [data, searchTerm],
  )

  const columns: ColumnDef<BucketListRow>[] = React.useMemo(
    () => [
      {
        header: () => t("Bucket"),
        accessorKey: "Name",
        cell: ({ row }) => (
          <Link
            href={getBucketHref(row.original.Name)}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <RiArchiveLine className="size-4" />
            {row.original.Name}
          </Link>
        ),
      },
      {
        header: () => t("Creation Date"),
        accessorKey: "CreationDate",
        cell: ({ row }) =>
          row.original.CreationDate ? dayjs(row.original.CreationDate).format("YYYY-MM-DD HH:mm:ss") : "--",
      },
      {
        header: () => t("Object Count"),
        accessorKey: "Count",
        cell: ({ row }) =>
          typeof row.original.Count === "number" ? (
            row.original.Count.toLocaleString()
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
              <span className="text-red-600 dark:text-red-400">{t("Public")}</span>
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
            <RiRefreshLine className="size-4" />
            <span>{t("Refresh")}</span>
          </Button>
        </div>
      </div>

      <DataTable table={table} isLoading={pending} emptyTitle={t("No Buckets")} emptyDescription={emptyDescription} />
    </>
  )
}
