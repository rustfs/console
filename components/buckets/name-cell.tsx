"use client"

import Link from "next/link"
import { RiArchiveLine } from "@remixicon/react"

export interface BucketNameRow {
  Name: string
  BucketHref: string
}

export function BucketNameCell({ row }: { row: { original: BucketNameRow } }) {
  return (
    <Link
      href={row.original.BucketHref}
      className="flex min-w-0 max-w-full items-center gap-2 text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <RiArchiveLine className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 truncate">{row.original.Name}</span>
    </Link>
  )
}
