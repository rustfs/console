"use client"

import * as React from "react"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { useEventTarget } from "@/hooks/use-event-target"
import { useMessage } from "@/lib/feedback/message"
import { cn } from "@/lib/utils"

interface EventsTargetNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const CONFIG_OPTIONS: Record<
  string,
  Array<{ label: string; name: string; type: "text" | "password" | "number" }>
> = {
  MQTT: [
    { label: "MQTT_BROKER", name: "broker", type: "text" },
    { label: "MQTT_TOPIC", name: "topic", type: "text" },
    { label: "MQTT_USERNAME", name: "username", type: "text" },
    { label: "MQTT_PASSWORD", name: "password", type: "password" },
    { label: "MQTT_QOS", name: "qos", type: "number" },
    { label: "MQTT_RECONNECT_INTERVAL", name: "reconnect_interval", type: "number" },
    { label: "MQTT_KEEP_ALIVE_INTERVAL", name: "keep_alive_interval", type: "number" },
    { label: "MQTT_QUEUE_DIR", name: "queue_dir", type: "text" },
    { label: "MQTT_QUEUE_LIMIT", name: "queue_limit", type: "number" },
    { label: "COMMENT_KEY", name: "comment", type: "text" },
  ],
  Webhook: [
    { label: "WEBHOOK_ENDPOINT", name: "endpoint", type: "text" },
    { label: "WEBHOOK_AUTH_TOKEN", name: "auth_token", type: "text" },
    { label: "WEBHOOK_QUEUE_LIMIT", name: "queue_limit", type: "number" },
    { label: "WEBHOOK_QUEUE_DIR", name: "queue_dir", type: "text" },
    { label: "COMMENT_KEY", name: "comment", type: "text" },
  ],
}

const TYPE_OPTIONS = [
  {
    labelKey: "MQTT",
    value: "MQTT",
    icon: "/svg/mqtt.svg",
    descKey: "Send events via MQTT broker",
  },
  {
    labelKey: "Webhook",
    value: "Webhook",
    icon: "/svg/webhooks.svg",
    descKey: "Trigger custom HTTP endpoints",
  },
] as const

export function EventsTargetNewForm({
  open,
  onOpenChange,
  onSuccess,
}: EventsTargetNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { updateEventTarget } = useEventTarget()

  const [type, setType] = React.useState("")
  const [name, setName] = React.useState("")
  const [config, setConfig] = React.useState<Record<string, string | number>>({})
  const [nameError, setNameError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const currentConfigOptions = type ? CONFIG_OPTIONS[type] ?? [] : []
  const selectedOption = TYPE_OPTIONS.find((o) => o.value === type)

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
    if (type && CONFIG_OPTIONS[type]) {
      const nextConfig: Record<string, string | number> = {}
      CONFIG_OPTIONS[type].forEach((item) => {
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
    const hasConfig = Object.values(config).some(
      (v) => v !== "" && v !== null && v !== undefined
    )
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
      const targetType = type === "MQTT" ? "notify_mqtt" : "notify_webhook"
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
      message.error(t("Failed to create event target"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {type
              ? t("Add {type} Destination", { type })
              : t("Add Event Destination")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {!type ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={cn(
                    "cursor-pointer border border-border/70 text-left transition hover:border-primary"
                  )}
                >
                  <div className="flex items-center gap-3 p-4">
                    <Image
                      src={option.icon}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 object-contain"
                    />
                    <div>
                      <p className="text-base font-semibold">
                        {t(option.labelKey)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t(option.descKey)}
                      </p>
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
                className="flex w-full cursor-pointer items-center gap-3 border p-4 text-left transition hover:border-primary"
              >
                {selectedOption && (
                  <Image
                    src={selectedOption.icon}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 shrink-0 object-contain"
                  />
                )}
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    {t("Selected Type")}
                  </span>
                  <span className="text-base font-semibold">{type}</span>
                </div>
              </button>

              <div className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="target-name">
                    {t("Name")} (A-Z,0-9,_)
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="target-name"
                      value={name}
                      onChange={handleNameChange}
                      placeholder={t("Please enter name")}
                      autoComplete="off"
                    />
                  </FieldContent>
                  {nameError && (
                    <FieldDescription className="text-destructive">
                      {nameError}
                    </FieldDescription>
                  )}
                </Field>

                {currentConfigOptions.map((cfg) => (
                  <Field key={cfg.name}>
                    <FieldLabel htmlFor={`config-${cfg.name}`}>
                      {t(cfg.label)}
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id={`config-${cfg.name}`}
                        value={String(config[cfg.name] ?? "")}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            [cfg.name]:
                              cfg.type === "number"
                                ? Number(e.target.value) || 0
                                : e.target.value,
                          }))
                        }
                        type={cfg.type === "password" ? "password" : "text"}
                        autoComplete="off"
                        placeholder={`${t("Please enter")} ${t(cfg.label).toLowerCase()}`}
                      />
                    </FieldContent>
                  </Field>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!type}
            aria-disabled={submitting}
          >
            {submitting ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
