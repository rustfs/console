"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiRefreshLine } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { EventsNewForm } from "@/components/events/new-form"
import { getEventsColumns } from "@/components/events/columns"
import { useBucket } from "@/hooks/use-bucket"
import { useModuleSwitches } from "@/hooks/use-module-switches"
import { usePermissions } from "@/hooks/use-permissions"
import { canManageNotifyBackedFeature } from "@/lib/notify-module-access"
import { createLatestRequestGate } from "@/lib/bucket-configuration"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import { getDisplayEvents, TYPE_BADGE_CLASSES, type NotificationItem } from "@/lib/events"

interface BucketEventsTabProps {
  bucketName: string
  hideTitle?: boolean
  renderHeader?: (actions: React.ReactNode) => React.ReactNode
}

export function BucketEventsTab({ bucketName, hideTitle = false, renderHeader }: BucketEventsTabProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { canCapability } = usePermissions()
  const { listBucketNotifications, putBucketNotifications } = useBucket()
  const { getModuleSwitches } = useModuleSwitches()
  const eventsContext = React.useMemo(() => ({ bucket: bucketName }), [bucketName])
  const canEditEvents = canCapability("bucket.events.edit", eventsContext)

  const [data, setData] = React.useState<NotificationItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [notifyError, setNotifyError] = React.useState("")
  const [mutatingId, setMutatingId] = React.useState<string | null>(null)
  const [newFormOpen, setNewFormOpen] = React.useState(false)
  const [notifyEnabled, setNotifyEnabled] = React.useState<boolean | undefined>(undefined)
  const [requestGate] = React.useState(createLatestRequestGate)

  const canManageBucketEvents =
    canEditEvents &&
    canManageNotifyBackedFeature(notifyEnabled) &&
    !loadError &&
    !notifyError &&
    !loading &&
    !mutatingId

  const loadData = React.useCallback(async () => {
    const requestVersion = requestGate.begin()
    setLoading(true)
    try {
      const [response, switches] = await Promise.allSettled([
        listBucketNotifications(bucketName),
        getModuleSwitches({ suppress403Redirect: true }),
      ])

      if (!requestGate.isCurrent(requestVersion)) return

      if (switches.status === "fulfilled" && switches.value) {
        setNotifyEnabled(switches.value.notify_enabled)
        setNotifyError("")
      } else {
        setNotifyEnabled(undefined)
        setNotifyError(t("Unable to verify whether notify is enabled. Refresh before making changes."))
      }

      if (response.status === "rejected") {
        throw response.reason
      }

      const responseValue = response.value
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
            const sourceId = config.Id?.trim() || undefined
            notifications.push({
              id: sourceId ?? `missing-${type.toLowerCase()}-${notifications.length}`,
              sourceId,
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

      const r = responseValue as {
        LambdaFunctionConfigurations?: unknown[]
        QueueConfigurations?: unknown[]
        TopicConfigurations?: unknown[]
      }

      addFromConfig((r?.LambdaFunctionConfigurations ?? []) as never[], "Lambda", "LambdaFunctionArn")
      addFromConfig((r?.QueueConfigurations ?? []) as never[], "SQS", "QueueArn")
      addFromConfig((r?.TopicConfigurations ?? []) as never[], "SNS", "TopicArn")

      setData(notifications)
      setLoadError("")
    } catch {
      if (!requestGate.isCurrent(requestVersion)) return
      setLoadError(t("Unable to load event subscriptions. Refresh before making changes."))
    } finally {
      if (requestGate.isCurrent(requestVersion)) setLoading(false)
    }
  }, [bucketName, getModuleSwitches, listBucketNotifications, requestGate, t])

  React.useEffect(() => {
    loadData()
    return () => {
      requestGate.invalidate()
    }
  }, [loadData, requestGate])

  const handleRowDelete = React.useCallback(
    (row: NotificationItem) => {
      if (!canEditEvents) return
      if (!canManageBucketEvents) {
        message.warning(t("Notify is disabled. Enable notify before managing bucket event subscriptions."))
        return
      }
      if (!row.sourceId) {
        message.error(t("This subscription has no stable ID. Refresh before deleting it."))
        return
      }

      dialog.warning({
        title: t("Confirm Delete"),
        content: `${t("Are you sure you want to delete this notification configuration?")} ${row.sourceId} · ${bucketName}`,
        positiveText: t("Delete Event Subscription"),
        negativeText: t("Cancel"),
        onPositiveClick: async () => {
          if (mutatingId) return
          setMutatingId(row.sourceId ?? row.id)
          try {
            const currentResponse = await listBucketNotifications(bucketName)
            const currentNotifications = (currentResponse ?? {}) as unknown as Record<string, unknown[]>
            const configKey =
              row.type === "Lambda"
                ? "LambdaFunctionConfigurations"
                : row.type === "SQS"
                  ? "QueueConfigurations"
                  : "TopicConfigurations"
            const configs = (currentNotifications as Record<string, Array<{ Id?: string }>>)[configKey] ?? []
            const matches = configs.filter((config) => config.Id === row.sourceId)
            if (matches.length !== 1) throw new Error(t("Configuration changed. Refresh and try again."))
            const updated = configs.filter((config) => config.Id !== row.sourceId)
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
            await loadData()
          } catch (error) {
            message.error(`${t("Delete Failed")}: ${(error as Error).message ?? error}`)
          } finally {
            setMutatingId(null)
          }
        },
      })
    },
    [
      bucketName,
      canEditEvents,
      canManageBucketEvents,
      dialog,
      listBucketNotifications,
      loadData,
      message,
      mutatingId,
      putBucketNotifications,
      t,
    ],
  )

  const columns = React.useMemo(
    () => getEventsColumns(t, handleRowDelete, canManageBucketEvents),
    [canManageBucketEvents, t, handleRowDelete],
  )

  const { table } = useDataTable<NotificationItem>({
    data,
    columns,
    getRowId: (row) => row.id,
  })

  const actions = (
    <>
      {canEditEvents ? (
        <Button onClick={() => setNewFormOpen(true)} disabled={!canManageBucketEvents}>
          <RiAddLine className="size-4" aria-hidden />
          <span>{t("Add Event Subscription")}</span>
        </Button>
      ) : null}
      <Button variant="outline" onClick={loadData} disabled={loading || mutatingId !== null}>
        <RiRefreshLine className="size-4" aria-hidden />
        <span>{t("Refresh")}</span>
      </Button>
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      {renderHeader ? (
        renderHeader(actions)
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {hideTitle ? null : <h2 className="text-lg font-medium">{t("Events")}</h2>}
          <div className="grid w-full gap-2 sm:ms-auto sm:flex sm:w-auto">{actions}</div>
        </div>
      )}

      {canEditEvents && notifyEnabled === false ? (
        <Alert>
          <AlertTitle>{t("Notify is disabled")}</AlertTitle>
          <AlertDescription>
            {t("Enable notify in Settings before managing bucket event subscriptions.")}
          </AlertDescription>
        </Alert>
      ) : null}

      {notifyError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("Notify status unavailable")}</AlertTitle>
          <AlertDescription>{notifyError}</AlertDescription>
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>{t("Event subscriptions unavailable")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="hidden md:block">
        <DataTable
          table={table}
          isLoading={loading}
          emptyTitle={t("No event subscriptions")}
          emptyDescription={t("Add Event Subscription to get started")}
        />
      </div>

      <div className="space-y-3 md:hidden" aria-live="polite">
        {loading && data.length === 0 ? (
          <div className="border p-4 text-sm text-muted-foreground">{t("Loading")}</div>
        ) : data.length === 0 && !loadError ? (
          <div className="border p-4">
            <p className="text-sm font-medium">{t("No event subscriptions")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("Add Event Subscription to get started")}</p>
          </div>
        ) : (
          data.map((item) => (
            <article key={item.id} className="space-y-4 border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-all text-sm font-medium">{item.sourceId ?? t("Unnamed subscription")}</h3>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{item.arn}</p>
                </div>
                <Badge className={TYPE_BADGE_CLASSES[item.type] ?? ""}>{item.type}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {getDisplayEvents(item.events).map((event) => (
                  <Badge key={event} variant="secondary">
                    {event}
                  </Badge>
                ))}
              </div>
              {item.prefix || item.suffix ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("Prefix")}</dt>
                    <dd className="break-all">{item.prefix || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("Suffix")}</dt>
                    <dd className="break-all">{item.suffix || "-"}</dd>
                  </div>
                </dl>
              ) : null}
              {canEditEvents ? (
                <Button
                  variant="outline"
                  className="min-h-11 w-full whitespace-normal break-all"
                  onClick={() => handleRowDelete(item)}
                  disabled={!canManageBucketEvents || !item.sourceId}
                >
                  {`${t("Delete Event Subscription")}: ${item.sourceId ?? t("Unnamed subscription")}`}
                </Button>
              ) : null}
            </article>
          ))
        )}
      </div>

      <EventsNewForm
        open={newFormOpen}
        onOpenChange={setNewFormOpen}
        bucketName={bucketName}
        onSuccess={loadData}
        disabled={!canManageBucketEvents}
      />
    </div>
  )
}
