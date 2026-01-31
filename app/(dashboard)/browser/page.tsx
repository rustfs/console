"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiRefreshLine, RiArchiveLine, RiSettings5Line, RiDeleteBin5Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/search-input"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { BucketsNewForm } from "@/components/buckets/buckets-new-form"
import { useBucket } from "@/hooks/use-bucket"
import { useObject } from "@/hooks/use-object"
import { useSystem } from "@/hooks/use-system"
import { useAuth } from "@/contexts/auth-context"
import { useDialog } from "@/lib/ui/dialog"
import { useMessage } from "@/lib/ui/message"
import { niceBytes } from "@/lib/functions"
import type { ColumnDef } from "@tanstack/react-table"
import dayjs from "dayjs"

interface BucketRow {
  Name: string
  CreationDate: string
  Count?: number
  Size?: string
}

type BucketUsageMap = Record<string, { objects_count?: number; size?: number } | undefined>

export default function BrowserPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const message = useMessage()
  const dialog = useDialog()
  const { isAdmin } = useAuth()
  const { listBuckets, deleteBucket } = useBucket()
  const systemApi = useSystem()

  const [formVisible, setFormVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [data, setData] = useState<BucketRow[]>([])
  const [pending, setPending] = useState(true)

  const fetchBuckets = async () => {
    setPending(true)
    try {
      const response = await listBuckets()
      let bucketUsage: BucketUsageMap = {}

      if (isAdmin) {
        try {
          const usage = (await systemApi.getDataUsageInfo()) as { buckets_usage?: BucketUsageMap }
          bucketUsage = usage?.buckets_usage ?? {}
        } catch {
          // Non-admin or API not available
        }
      }

      const buckets = ((response as { Buckets?: Array<{ Name?: string; CreationDate?: string }> })?.Buckets ?? [])
        .map((item) => {
          const name = item?.Name
          if (!name) return null

          const bucketRow: BucketRow = {
            Name: name,
            CreationDate: item?.CreationDate ? new Date(item.CreationDate).toISOString() : "",
          }

          if (isAdmin) {
            const stats = bucketUsage[name]
            const objectsCount = typeof stats?.objects_count === "number" ? stats.objects_count : 0
            const totalSize = typeof stats?.size === "number" ? stats.size : 0
            bucketRow.Count = objectsCount
            bucketRow.Size = niceBytes(String(totalSize))
          }

          return bucketRow
        })
        .filter((bucket): bucket is BucketRow => bucket !== null)
        .sort((a, b) => a.Name.localeCompare(b.Name))

      setData(buckets)
    } catch (error) {
      console.error("Failed to fetch buckets:", error)
      setData([])
    } finally {
      setPending(false)
    }
  }

  useEffect(() => {
    fetchBuckets()
  }, [isAdmin])

  const filteredData = searchTerm
    ? data.filter((bucket) => bucket.Name.toLowerCase().includes(searchTerm.toLowerCase()))
    : data

  const objectApi = useObject("")

  const baseColumns: ColumnDef<BucketRow>[] = [
    {
      header: () => t("Bucket"),
      accessorKey: "Name",
      cell: ({ row }) => (
        <Link
          href={`/browser/${encodeURIComponent(row.original.Name)}`}
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
        dayjs(row.original.CreationDate).format("YYYY-MM-DD HH:mm:ss"),
    },
  ]

  if (isAdmin) {
    baseColumns.push(
      {
        header: () => t("Object Count"),
        accessorKey: "Count",
        cell: ({ row }) => row.original.Count?.toLocaleString() ?? "0",
      },
      {
        header: () => t("Size"),
        accessorKey: "Size",
      }
    )
  }

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
          onClick={() =>
            router.push(`/buckets/${encodeURIComponent(row.original.Name)}`)
          }
        >
          <RiSettings5Line className="size-4" />
          <span>{t("Settings")}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => confirmDelete(row.original)}
        >
          <RiDeleteBin5Line className="size-4" />
          <span>{t("Delete")}</span>
        </Button>
      </div>
    ),
  })

  const { table } = useDataTable<BucketRow>({
    data: filteredData,
    columns: baseColumns,
    manualPagination: true,
    getRowId: (row) => row.Name,
  })

  const handleFormClosed = (value: boolean) => {
    setFormVisible(value)
    if (!value) fetchBuckets()
  }

  const confirmDelete = (row: BucketRow) => {
    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to delete this bucket?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: () => deleteItem(row),
    })
  }

  const deleteItem = async (row: BucketRow) => {
    const files = await objectApi.listObject(row.Name, undefined, 1)
    const hasObjects =
      Boolean((files as { Contents?: Array<{ Key?: string }> })?.Contents?.some((item) => Boolean(item?.Key))) ||
      Boolean((files as { CommonPrefixes?: unknown[] })?.CommonPrefixes?.length)

    if (hasObjects) {
      message.error(t("Bucket is not empty"))
      return
    }

    try {
      await deleteBucket(row.Name)
      message.success(t("Delete Success"))
      await fetchBuckets()
    } catch (error: unknown) {
      message.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || t("Delete Failed"))
    }
  }

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t("Search")}
              clearable
              className="max-w-sm"
            />
            <Button variant="outline" onClick={() => setFormVisible(true)}>
              <RiAddLine className="size-4" />
              <span>{t("Create Bucket")}</span>
            </Button>
            <Button variant="outline" onClick={() => fetchBuckets()}>
              <RiRefreshLine className="size-4" />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Buckets")}</h1>
      </PageHeader>

      <DataTable
        table={table}
        isLoading={pending}
        emptyTitle={t("No Buckets")}
        emptyDescription={t("Create a bucket to start storing objects.")}
      />

      <BucketsNewForm show={formVisible} onShowChange={handleFormClosed} />
    </Page>
  )
}
