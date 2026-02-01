"use client"

import { RiDeleteBin7Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  TYPE_BADGE_CLASSES,
  getDisplayEvents,
  type NotificationItem,
} from "@/lib/events"
import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"

export function getEventsColumns(
  t: TFunction,
  onDelete: (row: NotificationItem) => void
): ColumnDef<NotificationItem>[] {
  return [
    {
      id: "type",
      header: () => t("Type"),
      cell: ({ row }) => (
        <Badge className={TYPE_BADGE_CLASSES[row.original.type] ?? ""}>
          {row.original.type}
        </Badge>
      ),
      meta: { maxWidth: "7rem" },
    },
    {
      id: "arn",
      header: () => t("ARN"),
      cell: ({ row }) => (
        <span className="line-clamp-2 break-all font-medium">
          {row.original.arn}
        </span>
      ),
      meta: { maxWidth: "180px" },
    },
    {
      id: "events",
      header: () => t("Events"),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {getDisplayEvents(row.original.events).map((event) => (
            <Badge key={event} variant="secondary">
              {event}
            </Badge>
          ))}
        </div>
      ),
      meta: { maxWidth: "13rem" },
    },
    {
      id: "prefix",
      header: () => t("Prefix"),
      cell: ({ row }) => (
        <span>{row.original.prefix ?? "-"}</span>
      ),
      meta: { maxWidth: "9rem" },
    },
    {
      id: "suffix",
      header: () => t("Suffix"),
      cell: ({ row }) => (
        <span>{row.original.suffix ?? "-"}</span>
      ),
      meta: { maxWidth: "9rem" },
    },
    {
      id: "actions",
      header: () => t("Actions"),
      enableSorting: false,
      meta: { maxWidth: "6rem" },
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(row.original)
            }}
          >
            <RiDeleteBin7Line className="size-4" aria-hidden />
            <span>{t("Delete")}</span>
          </Button>
        </div>
      ),
    },
  ]
}
