"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { EventsNewForm } from "@/components/events/new-form"
import { getEventsColumns } from "@/components/events/columns"
import { useBucket } from "@/hooks/use-bucket"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import type { NotificationItem } from "@/lib/events"

interface BucketEventsTabProps {
  bucketName: string
}

export function BucketEventsTab({ bucketName }: BucketEventsTabProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { listBucketNotifications, putBucketNotifications } = useBucket()

  const [data, setData] = React.useState<NotificationItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [newFormOpen, setNewFormOpen] = React.useState(false)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await listBucketNotifications(bucketName)
      const notifications: NotificationItem[] = []

      const addFromConfig = (
        configs: Array<{
          Id?: string
          LambdaFunctionArn?: string
          QueueArn?: string
          TopicArn?: string
          Events?: string[]
          Filter?: { Key?: { FilterRules?: Array<{ Name: string; Value: string }> } }
        }>,
        type: NotificationItem["type"],
        arnKey: "LambdaFunctionArn" | "QueueArn" | "TopicArn",
      ) => {
        ;(configs ?? []).forEach(
          (config: {
            Id?: string
            Filter?: { Key?: { FilterRules?: Array<{ Name: string; Value: string }> } }
            Events?: string[]
          }) => {
            const prefix = config.Filter?.Key?.FilterRules?.find((r) => r.Name === "Prefix")?.Value
            const suffix = config.Filter?.Key?.FilterRules?.find((r) => r.Name === "Suffix")?.Value
            const arn = (config as Record<string, string>)[arnKey]
            notifications.push({
              id: config.Id ?? "",
              type,
              arn: arn ?? "",
              events: config.Events ?? [],
              prefix,
              suffix,
              filterRules: config.Filter?.Key?.FilterRules ?? [],
            })
          },
        )
      }

      const r = response as {
        LambdaFunctionConfigurations?: unknown[]
        QueueConfigurations?: unknown[]
        TopicConfigurations?: unknown[]
      }

      addFromConfig((r?.LambdaFunctionConfigurations ?? []) as never[], "Lambda", "LambdaFunctionArn")
      addFromConfig((r?.QueueConfigurations ?? []) as never[], "SQS", "QueueArn")
      addFromConfig((r?.TopicConfigurations ?? []) as never[], "SNS", "TopicArn")

      setData(notifications)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [bucketName, listBucketNotifications])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const handleRowDelete = React.useCallback(
    async (row: NotificationItem) => {
      const confirmed = await new Promise<boolean>((resolve) => {
        dialog.warning({
          title: t("Confirm Delete"),
          content: t("Are you sure you want to delete this notification configuration?"),
          positiveText: t("Delete"),
          negativeText: t("Cancel"),
          onPositiveClick: () => resolve(true),
          onNegativeClick: () => resolve(false),
        })
      })

      if (!confirmed) return

      try {
        setLoading(true)
        const currentResponse = await listBucketNotifications(bucketName)
        const currentNotifications = (currentResponse ?? {}) as unknown as Record<string, unknown[]>

        const configKey =
          row.type === "Lambda"
            ? "LambdaFunctionConfigurations"
            : row.type === "SQS"
              ? "QueueConfigurations"
              : "TopicConfigurations"
        const configs = (currentNotifications as Record<string, Array<{ Id?: string }>>)[configKey]
        const updated = configs?.filter((c) => c.Id !== row.id) ?? []

        const newConfig = {
          ...currentNotifications,
          ...(row.type === "Lambda"
            ? { LambdaFunctionConfigurations: updated }
            : row.type === "SQS"
              ? { QueueConfigurations: updated }
              : { TopicConfigurations: updated }),
        }

        await putBucketNotifications(bucketName, newConfig)
        message.success(t("Delete Success"))
        loadData()
      } catch (error) {
        message.error(`${t("Delete Failed")}: ${(error as Error).message ?? error}`)
      } finally {
        setLoading(false)
      }
    },
    [bucketName, dialog, listBucketNotifications, loadData, message, putBucketNotifications, t],
  )

  const columns = React.useMemo(() => getEventsColumns(t, handleRowDelete), [t, handleRowDelete])

  const { table } = useDataTable<NotificationItem>({
    data,
    columns,
    getRowId: (row) => row.id,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t("Events")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNewFormOpen(true)}>
            <RiAddLine className="size-4" />
            <span>{t("Add Event Subscription")}</span>
          </Button>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RiRefreshLine className="size-4" />
            <span>{t("Refresh")}</span>
          </Button>
        </div>
      </div>

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Data")}
        emptyDescription={t("Add Event Subscription to get started")}
      />

      <EventsNewForm open={newFormOpen} onOpenChange={setNewFormOpen} bucketName={bucketName} onSuccess={loadData} />
    </div>
  )
}
