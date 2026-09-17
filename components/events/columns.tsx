"use client"

import { RiDeleteBin7Line, RiEditLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TYPE_BADGE_CLASSES, getDisplayEvents, type NotificationItem } from "@/lib/events"
import type { ColumnDef } from "@tanstack/react-table"
import type { TFunction } from "i18next"

export function getEventsColumns(
  t: TFunction,
  onEdit: (row: NotificationItem) => void,
  onDelete: (row: NotificationItem) => void,
  canManage: boolean,
): ColumnDef<NotificationItem>[] {
  return [
    {
      id: "type",
      header: () => t("Type"),
      cell: ({ row }) => <Badge className={TYPE_BADGE_CLASSES[row.original.type] ?? ""}>{row.original.type}</Badge>,
      meta: { maxWidth: "7rem" },
    },
    {
      id: "arn",
      header: () => t("ARN"),
      cell: ({ row }) => <span className="line-clamp-2 break-all font-medium">{row.original.arn}</span>,
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
      cell: ({ row }) => <span>{row.original.prefix ?? "-"}</span>,
      meta: { maxWidth: "9rem" },
    },
    {
      id: "suffix",
      header: () => t("Suffix"),
      cell: ({ row }) => <span>{row.original.suffix ?? "-"}</span>,
      meta: { maxWidth: "9rem" },
    },
    {
      id: "actions",
      header: () => t("Actions"),
      enableSorting: false,
      meta: { maxWidth: "12rem" },
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          {canManage ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={!row.original.sourceId}
                aria-label={`${t("Edit Event Subscription")} ${row.original.sourceId ?? t("Unnamed subscription")}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(row.original)
                }}
              >
                <RiEditLine className="size-4" aria-hidden />
                <span>{t("Edit")}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={!row.original.sourceId}
                aria-label={`${t("Delete Event Subscription")} ${row.original.sourceId ?? t("Unnamed subscription")}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(row.original)
                }}
              >
                <RiDeleteBin7Line className="size-4" aria-hidden />
                <span>{t("Delete")}</span>
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ]
}
