"use client"

import Link from "next/link"
import { RiArchiveLine } from "@remixicon/react"
import type { AccountBucketScanStatus } from "@/lib/account-bucket-usage"
import { BucketUsageStatus } from "@/components/buckets/usage-value"

export interface BucketNameRow {
  Name: string
  BucketHref: string
  ScanStatus?: AccountBucketScanStatus
}

// flexRender treats cell renderers as component types. Keep this type stable
// while rows and loading states change so the live region stays mounted.
export function BucketNameCell({ row }: { row: { original: BucketNameRow } }) {
  return (
    <div className="min-w-0">
      <Link
        href={row.original.BucketHref}
        className="flex min-w-0 max-w-full items-center gap-2 text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
      >
        <RiArchiveLine className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 truncate">{row.original.Name}</span>
      </Link>
      <BucketUsageStatus bucketName={row.original.Name} status={row.original.ScanStatus} />
    </div>
  )
}
