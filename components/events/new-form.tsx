"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { useBucket } from "@/hooks/use-bucket"
import { useEventTarget } from "@/hooks/use-event-target"
import { useMessage } from "@/lib/feedback/message"
import { scheduleMicrotask } from "@/lib/schedule-microtask"

interface EventsNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketName: string
  onSuccess?: () => void
  disabled?: boolean
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

export function EventsNewForm({ open, onOpenChange, bucketName, onSuccess, disabled = false }: EventsNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { getEventTargetArnList } = useEventTarget()
  const { putBucketNotifications, listBucketNotifications } = useBucket()

  const [resourceName, setResourceName] = useState("")
  const [prefix, setPrefix] = useState("")
  const [suffix, setSuffix] = useState("")
  const [events, setEvents] = useState<string[]>([])
  const [arnList, setArnList] = useState<Array<{ label: string; value: string }>>([])
  const [arnLoading, setArnLoading] = useState(false)
  const [arnError, setArnError] = useState("")
  const [arnReloadVersion, setArnReloadVersion] = useState(0)
  const [resourceNameError, setResourceNameError] = useState("")
  const [eventsError, setEventsError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadArnList = useCallback(async () => {
    setArnLoading(true)
    setArnError("")
    try {
      const res = (await getEventTargetArnList()) as string[]
      setArnList((res ?? []).map((item) => ({ label: item, value: item })))
    } catch {
      setArnList([])
      setArnError(t("Unable to load event targets."))
    } finally {
      setArnLoading(false)
    }
  }, [getEventTargetArnList, t])

  useEffect(() => {
    if (open) scheduleMicrotask(() => loadArnList())
  }, [arnReloadVersion, loadArnList, open])

  const resetForm = useCallback(() => {
    setResourceName("")
    setPrefix("")
    setSuffix("")
    setEvents([])
    setResourceNameError("")
    setEventsError("")
    setSaveError("")
  }, [])

  useEffect(() => {
    if (open) {
      scheduleMicrotask(() => resetForm())
    }
  }, [open, resetForm])

  const handleEventChecked = (eventValue: string, checked: boolean | "indeterminate") => {
    const isChecked = checked === true || checked === "indeterminate"
    if (isChecked) setEventsError("")
    setEvents((prev) =>
      isChecked ? (prev.includes(eventValue) ? prev : [...prev, eventValue]) : prev.filter((e) => e !== eventValue),
    )
  }

  const validate = () => {
    const rnErr = !resourceName ? t("Please select resource name") : ""
    const evErr = events.length === 0 ? t("Please select at least one event") : ""
    setResourceNameError(rnErr)
    setEventsError(evErr)
    if (rnErr) document.getElementById("event-resource-name")?.focus()
    else if (evErr) document.getElementById("event-option-put")?.focus()
    return !rnErr && !evErr
  }

  const handleSubmit = async () => {
    if (disabled || submitting || arnLoading || arnError) {
      if (disabled) {
        message.warning(t("Notify is disabled. Enable notify before managing bucket event subscriptions."))
      }
      return
    }

    if (!validate()) return

    setSubmitting(true)
    setSaveError("")
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

      const currentResponse = await listBucketNotifications(bucketName)
      const currentNotifications = (currentResponse ?? {}) as unknown as Record<string, unknown>

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
      const msg = (error as Error)?.message || t("Create Failed")
      setSaveError(msg)
      message.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (submitting) return
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel()
          return
        }
        onOpenChange(true)
      }}
      disablePointerDismissal
    >
      <DialogContent className="max-h-[min(90dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-3 pe-12 text-start sm:px-6">
          <DialogTitle>
            {t("Subscribe to event notification")}
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              {t("Bucket")}: {bucketName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form
          className="contents"
          aria-busy={submitting}
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6">
            {saveError ? (
              <div role="alert" className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {saveError}
              </div>
            ) : null}
            {arnError ? (
              <Alert variant="destructive">
                <AlertTitle>{t("Unable to load event targets.")}</AlertTitle>
                <AlertDescription>{t("Refresh to try again.")}</AlertDescription>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setArnReloadVersion((value) => value + 1)}
                >
                  {t("Refresh")}
                </Button>
              </Alert>
            ) : null}
            <Field>
              <FieldLabel htmlFor="event-resource-name">{t("Amazon Resource Name")}</FieldLabel>
              <FieldContent>
                <Select
                  value={resourceName}
                  onValueChange={(value) => {
                    setResourceName(value ?? "")
                    if (value) setResourceNameError("")
                  }}
                  disabled={disabled || submitting || arnLoading || Boolean(arnError) || !arnList.length}
                >
                  <SelectTrigger
                    id="event-resource-name"
                    aria-label={t("Amazon Resource Name")}
                    aria-invalid={Boolean(resourceNameError)}
                    aria-describedby={resourceNameError ? "event-resource-name-error" : undefined}
                  >
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
              {arnLoading ? <FieldDescription>{t("Loading")}</FieldDescription> : null}
              {!arnLoading && !arnError && arnList.length === 0 ? (
                <FieldDescription>{t("No Data")}</FieldDescription>
              ) : null}
              {resourceNameError ? (
                <FieldDescription id="event-resource-name-error" role="alert" className="text-destructive">
                  {resourceNameError}
                </FieldDescription>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="event-prefix">{t("Prefix")}</FieldLabel>
              <FieldContent>
                <Input
                  id="event-prefix"
                  name="event-prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  autoComplete="off"
                  disabled={disabled || submitting}
                  placeholder={t("Please enter prefix")}
                  spellCheck={false}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="event-suffix">{t("Suffix")}</FieldLabel>
              <FieldContent>
                <Input
                  id="event-suffix"
                  name="event-suffix"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  autoComplete="off"
                  disabled={disabled || submitting}
                  placeholder={t("Please enter suffix")}
                  spellCheck={false}
                />
              </FieldContent>
            </Field>

            <Field>
              <fieldset
                aria-invalid={Boolean(eventsError)}
                aria-describedby={eventsError ? "event-selection-error" : undefined}
              >
                <legend className="mb-2 text-sm font-medium">{t("Select events")}</legend>
                <div className="bg-muted/20 p-4">
                  <div className="flex flex-col gap-3">
                    {EVENT_OPTIONS.map((event) => (
                      <label
                        key={event.value}
                        htmlFor={`event-option-${event.value.toLowerCase()}`}
                        className="flex cursor-pointer items-start gap-3"
                      >
                        <Checkbox
                          id={`event-option-${event.value.toLowerCase()}`}
                          checked={events.includes(event.value)}
                          onCheckedChange={(v) => handleEventChecked(event.value, v)}
                          disabled={disabled || submitting}
                          className="mt-1"
                        />
                        <span>{t(event.labelKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>
              {eventsError ? (
                <FieldDescription id="event-selection-error" role="alert" className="text-destructive">
                  {eventsError}
                </FieldDescription>
              ) : null}
            </Field>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleCancel}
              disabled={submitting}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={disabled || submitting || arnLoading || Boolean(arnError)}
            >
              {submitting ? t("Saving…") : t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
