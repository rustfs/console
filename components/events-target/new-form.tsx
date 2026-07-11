"use client"

import * as React from "react"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { useEventTarget } from "@/hooks/use-event-target"
import {
  EVENT_TARGET_CONFIG_OPTIONS,
  EVENT_TARGET_TYPE_MAPPING,
  EVENT_TARGET_TYPE_OPTIONS,
  type EventTargetType,
} from "@/lib/events-target-config"
import { useMessage } from "@/lib/feedback/message"
import { buildRoute } from "@/lib/routes"

interface EventsTargetNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EventsTargetNewForm({ open, onOpenChange, onSuccess }: EventsTargetNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { updateEventTarget } = useEventTarget()

  const [type, setType] = React.useState<EventTargetType | "">("")
  const [name, setName] = React.useState("")
  const [config, setConfig] = React.useState<Record<string, string | number>>({})
  const [nameError, setNameError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const currentConfigOptions = type ? (EVENT_TARGET_CONFIG_OPTIONS[type] ?? []) : []
  const selectedOption = EVENT_TARGET_TYPE_OPTIONS.find((o) => o.value === type)

  const resetForm = React.useCallback(() => {
    setType("")
    setName("")
    setConfig({})
    setNameError("")
  }, [])

  React.useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, resetForm])

  React.useEffect(() => {
    if (type && EVENT_TARGET_CONFIG_OPTIONS[type]) {
      const nextConfig: Record<string, string | number> = {}
      EVENT_TARGET_CONFIG_OPTIONS[type].forEach((item) => {
        nextConfig[item.name] = ""
      })
      setConfig(nextConfig)
    }
  }, [type])

  const validateNameFormat = (v: string) => {
    if (!v) {
      setNameError(t("Please enter name"))
      return
    }
    if (!/^[A-Za-z0-9_]+$/.test(v)) {
      setNameError(t("Please enter name") + " (A-Z,0-9,_)")
    } else {
      setNameError("")
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setName(v)
    validateNameFormat(v)
  }

  const validateForm = () => {
    validateNameFormat(name)
    if (!type) {
      message.error(t("Please select event target type"))
      return false
    }
    if (nameError) {
      message.error(nameError)
      return false
    }
    const hasConfig = Object.values(config).some((v) => v !== "" && v !== null && v !== undefined)
    if (!hasConfig) {
      message.error(t("Please fill in at least one configuration item"))
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setSubmitting(true)
    try {
      if (!type) return
      const targetType = EVENT_TARGET_TYPE_MAPPING[type]
      const keyValues = Object.entries(config).map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      }))
      const payload = { key_values: keyValues }
      await updateEventTarget(targetType, name, payload)
      message.success(t("Event Target created successfully"))
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error(error)
      const msg = (error as Error)?.message || t("Failed to create event target")
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
      disablePointerDismissal={submitting}
      onOpenChange={(nextOpen) => {
        if (!submitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[min(90dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-4 py-4 pe-12 sm:px-6">
          <DialogTitle>{type ? t("Add {type} Destination", { type }) : t("Add Event Destination")}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 space-y-6 overflow-y-auto px-4 py-5 sm:px-6" aria-busy={submitting}>
          {!type ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {EVENT_TARGET_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className="cursor-pointer border border-border/70 text-start transition hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                >
                  <div className="flex items-center gap-3 p-4">
                    <Image
                      src={buildRoute(option.icon)}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 object-contain"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold" title={t(option.labelKey)}>
                        {t(option.labelKey)}
                      </p>
                      <p className="break-words text-sm text-muted-foreground">{t(option.descKey)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setType("")}
                className="flex w-full cursor-pointer items-center gap-3 border p-4 text-start transition hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                {selectedOption && (
                  <Image
                    src={buildRoute(selectedOption.icon)}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 shrink-0 object-contain"
                  />
                )}
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm text-muted-foreground">{t("Selected Type")}</span>
                  <span className="truncate text-base font-semibold" title={type}>
                    {type}
                  </span>
                </div>
              </button>

              <div className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="target-name">{t("Name")} (A-Z,0-9,_)</FieldLabel>
                  <FieldContent>
                    <Input
                      id="target-name"
                      name="target-name"
                      value={name}
                      onChange={handleNameChange}
                      placeholder={t("Please enter name")}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </FieldContent>
                  {nameError && <FieldDescription className="text-destructive">{nameError}</FieldDescription>}
                </Field>

                {currentConfigOptions.map((cfg) => (
                  <Field key={cfg.name}>
                    <FieldLabel htmlFor={`config-${cfg.name}`}>{t(cfg.label)}</FieldLabel>
                    <FieldContent>
                      <Input
                        id={`config-${cfg.name}`}
                        name={`config-${cfg.name}`}
                        value={String(config[cfg.name] ?? "")}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            [cfg.name]: cfg.type === "number" ? Number(e.target.value) || 0 : e.target.value,
                          }))
                        }
                        type={cfg.type === "password" ? "password" : "text"}
                        autoComplete="off"
                        placeholder={`${t("Please enter")} ${t(cfg.label).toLowerCase()}`}
                        spellCheck={false}
                      />
                    </FieldContent>
                  </Field>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="border-t bg-muted/20 px-4 py-4 sm:px-6">
          <Button variant="outline" onClick={handleCancel} disabled={submitting}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!type || submitting}>
            {submitting ? t("Saving…") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
