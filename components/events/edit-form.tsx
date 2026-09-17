"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
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
import {
  EVENT_OPTIONS,
  getEventSelection,
  toS3Events,
  updateNotificationRule,
  type NotificationItem,
} from "@/lib/events"
import { scheduleMicrotask } from "@/lib/schedule-microtask"

interface EventsEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketName: string
  subscription: NotificationItem | null
  onSuccess?: () => void
  disabled?: boolean
}

export function EventsEditForm({
  open,
  onOpenChange,
  bucketName,
  subscription,
  onSuccess,
  disabled = false,
}: EventsEditFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { getEventTargetArnList } = useEventTarget()
  const { putBucketNotifications, listBucketNotifications } = useBucket()

  const [resourceName, setResourceName] = useState("")
  const [prefix, setPrefix] = useState("")
  const [suffix, setSuffix] = useState("")
  const [events, setEvents] = useState<string[]>([])
  const [arnList, setArnList] = useState<string[]>([])
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
      setArnList(res ?? [])
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
    setResourceName(subscription?.arn ?? "")
    setPrefix(subscription?.prefix ?? "")
    setSuffix(subscription?.suffix ?? "")
    setEvents(subscription ? getEventSelection(subscription.events) : [])
    setResourceNameError("")
    setEventsError("")
    setSaveError("")
  }, [subscription])

  useEffect(() => {
    if (open) scheduleMicrotask(() => resetForm())
  }, [open, resetForm])

  // The subscription may point at a target that is no longer configured, so keep
  // it selectable to show what the current rule uses.
  const arnOptions = useMemo(() => {
    const options = arnList.map((item) => ({ label: item, value: item }))
    if (resourceName && !arnList.includes(resourceName)) {
      options.unshift({ label: resourceName, value: resourceName })
    }
    return options
  }, [arnList, resourceName])

  const customEvents = events.filter((value) => !EVENT_OPTIONS.some((option) => option.value === value))

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
    if (rnErr) document.getElementById("event-edit-resource-name")?.focus()
    else if (evErr) document.getElementById("event-edit-option-put")?.focus()
    return !rnErr && !evErr
  }

  const handleSubmit = async () => {
    if (disabled || submitting || arnLoading || arnError) {
      if (disabled) {
        message.warning(t("Notify is disabled. Enable notify before managing bucket event subscriptions."))
      }
      return
    }

    if (!subscription?.sourceId) {
      message.error(t("Configuration changed. Refresh and try again."))
      return
    }

    if (!validate()) return

    setSubmitting(true)
    setSaveError("")
    try {
      const uniqueS3Events = toS3Events(events)

      if (!uniqueS3Events.length) {
        message.error(t("No valid events found after conversion"))
        return
      }

      const filterRules = [
        ...(prefix ? [{ Name: "Prefix", Value: prefix }] : []),
        ...(suffix ? [{ Name: "Suffix", Value: suffix }] : []),
      ]

      const currentResponse = await listBucketNotifications(bucketName)
      const currentNotifications = (currentResponse ?? {}) as unknown as Record<string, unknown>
      const updated = updateNotificationRule(currentNotifications, subscription, {
        arn: resourceName,
        events: uniqueS3Events,
        filterRules,
      })

      if (!updated) throw new Error(t("Configuration changed. Refresh and try again."))

      await putBucketNotifications(bucketName, updated)
      message.success(t("Update Success"))
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to update bucket notification:", error)
      const msg = (error as Error)?.message || t("Update Failed")
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

  if (!subscription) return null

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
            {t("Edit Event Subscription")}
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              {t("Bucket")}: {bucketName} · {subscription.sourceId}
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
              <FieldLabel htmlFor="event-edit-resource-name">{t("Amazon Resource Name")}</FieldLabel>
              <FieldContent>
                <Select
                  value={resourceName}
                  onValueChange={(value) => {
                    setResourceName(value ?? "")
                    if (value) setResourceNameError("")
                  }}
                  disabled={disabled || submitting || arnLoading || Boolean(arnError) || !arnOptions.length}
                >
                  <SelectTrigger
                    id="event-edit-resource-name"
                    aria-label={t("Amazon Resource Name")}
                    aria-invalid={Boolean(resourceNameError)}
                    aria-describedby={resourceNameError ? "event-edit-resource-name-error" : undefined}
                  >
                    <SelectValue placeholder={t("Please select resource name")} />
                  </SelectTrigger>
                  <SelectContent className="w-max min-w-(--anchor-width) max-w-(--available-width)">
                    {arnOptions.map((item) => (
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
                <FieldDescription id="event-edit-resource-name-error" role="alert" className="text-destructive">
                  {resourceNameError}
                </FieldDescription>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="event-edit-prefix">{t("Prefix")}</FieldLabel>
              <FieldContent>
                <Input
                  id="event-edit-prefix"
                  name="event-edit-prefix"
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
              <FieldLabel htmlFor="event-edit-suffix">{t("Suffix")}</FieldLabel>
              <FieldContent>
                <Input
                  id="event-edit-suffix"
                  name="event-edit-suffix"
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
                aria-describedby={eventsError ? "event-edit-selection-error" : undefined}
              >
                <legend className="mb-2 text-sm font-medium">{t("Select events")}</legend>
                <div className="bg-muted/20 p-4">
                  <div className="flex flex-col gap-3">
                    {EVENT_OPTIONS.map((event) => (
                      <label
                        key={event.value}
                        htmlFor={`event-edit-option-${event.value.toLowerCase()}`}
                        className="flex cursor-pointer items-start gap-3"
                      >
                        <Checkbox
                          id={`event-edit-option-${event.value.toLowerCase()}`}
                          checked={events.includes(event.value)}
                          onCheckedChange={(v) => handleEventChecked(event.value, v)}
                          disabled={disabled || submitting}
                          className="mt-1"
                        />
                        <span>{t(event.labelKey)}</span>
                      </label>
                    ))}
                    {customEvents.map((event) => (
                      <label key={event} className="flex items-start gap-3">
                        <Checkbox checked disabled className="mt-1" />
                        <span className="break-all">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>
              {eventsError ? (
                <FieldDescription id="event-edit-selection-error" role="alert" className="text-destructive">
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
