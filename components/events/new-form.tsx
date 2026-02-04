"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useBucket } from "@/hooks/use-bucket"
import { useEventTarget } from "@/hooks/use-event-target"
import { useMessage } from "@/lib/feedback/message"

interface EventsNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketName: string
  onSuccess?: () => void
}

const EVENT_OPTIONS = [
  { value: "PUT", labelKey: "PUT - Object upload" },
  { value: "GET", labelKey: "GET - Object access" },
  { value: "DELETE", labelKey: "DELETE - Object deletion" },
  { value: "REPLICA", labelKey: "REPLICA - Object migration" },
  { value: "RESTORE", labelKey: "ILM - Object converted" },
  {
    value: "SCANNER",
    labelKey: "SCANNER - Object has too many versions/prefix has too many subfolders",
  },
] as const

const EVENT_MAPPING: Record<string, string[]> = {
  PUT: ["s3:ObjectCreated:*"],
  GET: ["s3:ObjectAccessed:*"],
  DELETE: ["s3:ObjectRemoved:*"],
  REPLICA: ["s3:Replication:*"],
  RESTORE: ["s3:ObjectRestore:*", "s3:ObjectTransition:*"],
  SCANNER: ["s3:Scanner:ManyVersions", "s3:Scanner:BigPrefix"],
}

export function EventsNewForm({ open, onOpenChange, bucketName, onSuccess }: EventsNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { getEventTargetArnList } = useEventTarget()
  const { putBucketNotifications, listBucketNotifications } = useBucket()

  const [resourceName, setResourceName] = useState("")
  const [prefix, setPrefix] = useState("")
  const [suffix, setSuffix] = useState("")
  const [events, setEvents] = useState<string[]>([])
  const [arnList, setArnList] = useState<Array<{ label: string; value: string }>>([])
  const [resourceNameError, setResourceNameError] = useState("")
  const [eventsError, setEventsError] = useState("")

  const loadArnList = useCallback(async () => {
    try {
      const res = (await getEventTargetArnList()) as string[]
      setArnList((res ?? []).map((item) => ({ label: item, value: item })))
    } catch {
      setArnList([])
    }
  }, [getEventTargetArnList])

  useEffect(() => {
    queueMicrotask(() => loadArnList())
  }, [loadArnList])

  const resetForm = useCallback(() => {
    setResourceName("")
    setPrefix("")
    setSuffix("")
    setEvents([])
    setResourceNameError("")
    setEventsError("")
  }, [])

  useEffect(() => {
    if (open) {
      queueMicrotask(() => resetForm())
    }
  }, [open, resetForm])

  const handleEventChecked = (eventValue: string, checked: boolean | "indeterminate") => {
    const isChecked = checked === true || checked === "indeterminate"
    setEvents((prev) =>
      isChecked ? (prev.includes(eventValue) ? prev : [...prev, eventValue]) : prev.filter((e) => e !== eventValue),
    )
  }

  const validate = () => {
    const rnErr = !resourceName ? t("Please select resource name") : ""
    const evErr = events.length === 0 ? t("Please select at least one event") : ""
    setResourceNameError(rnErr)
    setEventsError(evErr)
    return !rnErr && !evErr
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      const s3Events: string[] = []
      events.forEach((event) => {
        if (EVENT_MAPPING[event]) {
          s3Events.push(...EVENT_MAPPING[event])
        } else {
          s3Events.push(event)
        }
      })
      const uniqueS3Events = [...new Set(s3Events)]

      if (!uniqueS3Events.length) {
        message.error(t("No valid events found after conversion"))
        return
      }

      let currentNotifications: Record<string, unknown> = {}
      try {
        const currentResponse = await listBucketNotifications(bucketName)
        currentNotifications = (currentResponse ?? {}) as unknown as Record<string, unknown>
      } catch {
        currentNotifications = {}
      }

      const arn = resourceName
      const baseConfig = {
        Id: `notification-${Date.now()}`,
        Events: uniqueS3Events,
        Filter:
          prefix || suffix
            ? {
                Key: {
                  FilterRules: [
                    ...(prefix ? [{ Name: "Prefix" as const, Value: prefix }] : []),
                    ...(suffix ? [{ Name: "Suffix" as const, Value: suffix }] : []),
                  ],
                },
              }
            : undefined,
      }

      const newLambda = arn.includes(":lambda:") ? [{ ...baseConfig, LambdaFunctionArn: arn }] : []
      const newQueue = arn.includes(":sqs:") ? [{ ...baseConfig, QueueArn: arn }] : []
      const newTopic = !arn.includes(":lambda:") && !arn.includes(":sqs:") ? [{ ...baseConfig, TopicArn: arn }] : []

      const merged = {
        ...currentNotifications,
        LambdaFunctionConfigurations: [
          ...((currentNotifications.LambdaFunctionConfigurations as unknown[]) ?? []),
          ...newLambda,
        ],
        QueueConfigurations: [...((currentNotifications.QueueConfigurations as unknown[]) ?? []), ...newQueue],
        TopicConfigurations: [...((currentNotifications.TopicConfigurations as unknown[]) ?? []), ...newTopic],
      }

      await putBucketNotifications(bucketName, merged)
      message.success(t("Create Success"))
      onOpenChange(false)
      onSuccess?.()
      resetForm()
    } catch (error) {
      console.error("Failed to create bucket notification:", error)
      message.error(t("Create Failed"))
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-left">
          <DialogTitle>
            {t("Subscribe to event notification")}
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              {t("Bucket")}: {bucketName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Field>
            <FieldLabel htmlFor="event-resource-name">{t("Amazon Resource Name")}</FieldLabel>
            <FieldContent>
              <Select value={resourceName} onValueChange={setResourceName} disabled={!arnList.length}>
                <SelectTrigger id="event-resource-name">
                  <SelectValue placeholder={t("Please select resource name")} />
                </SelectTrigger>
                <SelectContent>
                  {arnList.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
            {resourceNameError && <FieldDescription className="text-destructive">{resourceNameError}</FieldDescription>}
          </Field>

          <Field>
            <FieldLabel htmlFor="event-prefix">{t("Prefix")}</FieldLabel>
            <FieldContent>
              <Input
                id="event-prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder={t("Please enter prefix")}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="event-suffix">{t("Suffix")}</FieldLabel>
            <FieldContent>
              <Input
                id="event-suffix"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                placeholder={t("Please enter suffix")}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("Select events")}</FieldLabel>
            <FieldContent>
              <ScrollArea className="max-h-64 rounded-md border">
                <div className="flex flex-col gap-2 p-4">
                  {EVENT_OPTIONS.map((event) => (
                    <label key={event.value} className="flex cursor-pointer items-start gap-3">
                      <Checkbox
                        checked={events.includes(event.value)}
                        onCheckedChange={(v) => handleEventChecked(event.value, v)}
                        className="mt-1"
                      />
                      <span>{t(event.labelKey)}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </FieldContent>
            {eventsError && <FieldDescription className="text-destructive">{eventsError}</FieldDescription>}
          </Field>
        </div>

        <div className="flex flex-col gap-2 pt-6 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={handleCancel}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSubmit}>{t("Save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
