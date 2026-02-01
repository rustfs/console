"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { BucketSelector } from "@/components/buckets/selector"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { EventsNewForm } from "@/components/events/new-form"
import { getEventsColumns } from "@/components/events/columns"
import { useBucket } from "@/hooks/use-bucket"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import type { NotificationItem } from "@/lib/events"

export default function EventsPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { listBucketNotifications, putBucketNotifications } = useBucket()

  const [bucketName, setBucketName] = useState<string | null>(null)
  const [data, setData] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [newFormOpen, setNewFormOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (!bucketName) {
      setData([])
      return
    }
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
        arnKey: "LambdaFunctionArn" | "QueueArn" | "TopicArn"
      ) => {
        ;(configs ?? []).forEach((config: { Id?: string; Filter?: { Key?: { FilterRules?: Array<{ Name: string; Value: string }> } }; Events?: string[] }) => {
          const prefix = config.Filter?.Key?.FilterRules?.find(
            (r) => r.Name === "Prefix"
          )?.Value
          const suffix = config.Filter?.Key?.FilterRules?.find(
            (r) => r.Name === "Suffix"
          )?.Value
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
        })
      }

      const r = response as {
        LambdaFunctionConfigurations?: unknown[]
        QueueConfigurations?: unknown[]
        TopicConfigurations?: unknown[]
      }

      addFromConfig(
        (r?.LambdaFunctionConfigurations ?? []) as never[],
        "Lambda",
        "LambdaFunctionArn"
      )
      addFromConfig(
        (r?.QueueConfigurations ?? []) as never[],
        "SQS",
        "QueueArn"
      )
      addFromConfig(
        (r?.TopicConfigurations ?? []) as never[],
        "SNS",
        "TopicArn"
      )

      setData(notifications)
    } catch (error) {
      console.error(t("Get Notification Config Failed"), error)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [bucketName, listBucketNotifications, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRowDelete = useCallback(
    async (row: NotificationItem) => {
      const confirmed = await new Promise<boolean>((resolve) => {
        dialog.warning({
          title: t("Confirm Delete"),
          content: t(
            "Are you sure you want to delete this notification configuration?"
          ),
          positiveText: t("Delete"),
          negativeText: t("Cancel"),
          onPositiveClick: () => resolve(true),
          onNegativeClick: () => resolve(false),
        })
      })

      if (!confirmed || !bucketName) return

      try {
        setLoading(true)
        const currentResponse = await listBucketNotifications(bucketName)
        const currentNotifications = (currentResponse ?? {}) as unknown as Record<
          string,
          unknown[]
        >

        const configKey =
          row.type === "Lambda"
            ? "LambdaFunctionConfigurations"
            : row.type === "SQS"
              ? "QueueConfigurations"
              : "TopicConfigurations"
        const configs = (
          currentNotifications as Record<string, Array<{ Id?: string }>>
        )[configKey]
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
        console.error(t("Delete Failed"), error)
        message.error(
          `${t("Delete Failed")}: ${(error as Error).message ?? error}`
        )
      } finally {
        setLoading(false)
      }
    },
    [
      bucketName,
      dialog,
      listBucketNotifications,
      loadData,
      message,
      putBucketNotifications,
      t,
    ]
  )

  const columns = useMemo(
    () => getEventsColumns(t, handleRowDelete),
    [t, handleRowDelete]
  )

  const { table } = useDataTable<NotificationItem>({
    data,
    columns,
    getRowId: (row) => row.id,
  })

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <BucketSelector
              value={bucketName}
              onChange={setBucketName}
              placeholder={t("Please select bucket")}
              selectorClass="w-full"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewFormOpen(true)}
              disabled={!bucketName}
            >
              <RiAddLine className="size-4" aria-hidden />
              <span>{t("Add Event Subscription")}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={loadData}
              disabled={loading}
            >
              <RiRefreshLine className="size-4" aria-hidden />
              <span>{t("Refresh")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Events")}</h1>
      </PageHeader>

      <DataTable
        table={table}
        isLoading={loading}
        emptyTitle={t("No Data")}
        emptyDescription={t("Add Event Subscription to get started")}
      />

      {bucketName && (
        <EventsNewForm
          open={newFormOpen}
          onOpenChange={setNewFormOpen}
          bucketName={bucketName}
          onSuccess={loadData}
        />
      )}
    </Page>
  )
}
