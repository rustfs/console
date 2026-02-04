"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMessage } from "@/lib/feedback/message"
import { useBucket } from "@/hooks/use-bucket"
import { getBytes } from "@/lib/functions"
import { cn } from "@/lib/utils"

interface BucketNewFormProps {
  show: boolean
  onShowChange: (show: boolean) => void
}

const retentionModeOptions = [
  { label: "COMPLIANCE", value: "COMPLIANCE" as const },
  { label: "GOVERNANCE", value: "GOVERNANCE" as const },
]

const retentionUnitOptions = [
  { labelKey: "Day", value: "day" as const },
  { labelKey: "Year", value: "year" as const },
]

export function BucketNewForm({ show, onShowChange }: BucketNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { createBucket, putBucketVersioning, putObjectLockConfiguration, putBucketQuota } = useBucket()

  const [objectKey, setObjectKey] = React.useState("")
  const [version, setVersion] = React.useState(false)
  const [objectLock, setObjectLock] = React.useState(false)
  const [retentionEnabled, setRetentionEnabled] = React.useState(false)
  const [retentionMode, setRetentionMode] = React.useState<"COMPLIANCE" | "GOVERNANCE">("COMPLIANCE")
  const [retentionPeriod, setRetentionPeriod] = React.useState("180")
  const [retentionUnit, setRetentionUnit] = React.useState<"day" | "year">("day")
  const [quotaEnabled, setQuotaEnabled] = React.useState(false)
  const [quotaSize, setQuotaSize] = React.useState("1")
  const [quotaUnit, setQuotaUnit] = React.useState("GiB")
  const [creating, setCreating] = React.useState(false)

  const trimmedBucketName = objectKey.trim()
  const showNameError = trimmedBucketName.length > 0 && (trimmedBucketName.length < 3 || trimmedBucketName.length > 63)
  const parsedRetentionPeriod = Math.max(1, Number.parseInt(retentionPeriod, 10) || 1)
  const isSubmitDisabled = creating || trimmedBucketName.length < 3 || trimmedBucketName.length > 63

  React.useEffect(() => {
    if (objectLock) setVersion(true)
  }, [objectLock])

  React.useEffect(() => {
    if (!version && objectLock) setObjectLock(false)
  }, [version, objectLock])

  const resetForm = () => {
    setObjectKey("")
    setVersion(false)
    setObjectLock(false)
    setRetentionEnabled(false)
    setRetentionMode("COMPLIANCE")
    setRetentionPeriod("180")
    setRetentionUnit("day")
    setQuotaEnabled(false)
    setQuotaSize("1")
    setQuotaUnit("GiB")
  }

  const closeModal = () => {
    onShowChange(false)
    resetForm()
  }

  const handleCreateBucket = async () => {
    if (isSubmitDisabled) return

    const bucketName = trimmedBucketName
    setCreating(true)

    try {
      await createBucket({
        Bucket: bucketName,
        ObjectLockEnabledForBucket: objectLock,
      })

      const applyRetention = async () => {
        if (objectLock && retentionEnabled) {
          await putObjectLockConfiguration(bucketName, {
            ObjectLockEnabled: "Enabled",
            Rule: {
              DefaultRetention: {
                Mode: retentionMode,
                Days: retentionUnit === "day" ? parsedRetentionPeriod : undefined,
                Years: retentionUnit === "year" ? parsedRetentionPeriod : undefined,
              },
            },
          })
        }
      }

      if (version) {
        await putBucketVersioning(bucketName, "Enabled")
      }

      if (quotaEnabled) {
        try {
          await putBucketQuota(bucketName, {
            quota: Number.parseInt(getBytes(quotaSize, quotaUnit), 10),
            quota_type: "HARD",
          })
        } catch (e: unknown) {
          message.error(t("Quota Save Failed") + ": " + (e as Error).message)
        }
      }

      try {
        await applyRetention()
      } catch {
        message.error(t("Retention Save Failed"))
      }

      message.success(t("Create Success"))
      closeModal()
    } catch (error: unknown) {
      message.error((error as Error)?.message || t("Create Failed"))
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent
        className="sm:max-w-2xl"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Create Bucket")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[80vh] overflow-auto px-2 -mx-2">
          <Field>
            <FieldLabel htmlFor="bucket-name">{t("Please enter name")}</FieldLabel>
            <FieldContent>
              <Input
                id="bucket-name"
                value={objectKey}
                onChange={(e) => setObjectKey(e.target.value)}
                autoComplete="off"
                className={cn("w-full", showNameError && "border-destructive focus-visible:ring-destructive")}
              />
            </FieldContent>
          </Field>

          <Field orientation="responsive" className="items-center">
            <FieldLabel>{t("Version")}</FieldLabel>
            <FieldContent className="flex justify-end">
              <Switch checked={version} onCheckedChange={setVersion} />
            </FieldContent>
          </Field>

          <Field orientation="responsive" className="items-center">
            <FieldLabel>{t("Object Lock")}</FieldLabel>
            <FieldContent className="flex justify-end">
              <Switch checked={objectLock} onCheckedChange={setObjectLock} />
            </FieldContent>
          </Field>

          <Field orientation="responsive" className="items-center">
            <FieldLabel>{t("Bucket Quota")}</FieldLabel>
            <FieldContent className="flex justify-end">
              <Switch checked={quotaEnabled} onCheckedChange={setQuotaEnabled} />
            </FieldContent>
          </Field>

          {quotaEnabled && (
            <div className="space-y-4 rounded-lg border p-4">
              <Field>
                <FieldLabel>{t("Quota Size")}</FieldLabel>
                <FieldContent>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={quotaSize}
                      onChange={(e) => setQuotaSize(e.target.value)}
                      type="number"
                      className="sm:w-32"
                    />
                    <RadioGroup
                      value={quotaUnit}
                      onValueChange={(v) => setQuotaUnit(v)}
                      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                    >
                      {["MiB", "GiB", "TiB", "PiB"].map((unit) => (
                        <label key={unit} className="flex items-start gap-3 rounded-md border border-border/50 p-3">
                          <RadioGroupItem value={unit} className="mt-0.5" />
                          <span className="text-sm font-medium">{unit}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </FieldContent>
              </Field>
            </div>
          )}

          {objectLock && (
            <div className="space-y-4 rounded-lg border p-4">
              <Field orientation="responsive" className="items-center">
                <FieldLabel>{t("Retention")}</FieldLabel>
                <FieldContent className="flex justify-end">
                  <Switch checked={retentionEnabled} onCheckedChange={setRetentionEnabled} />
                </FieldContent>
              </Field>

              {retentionEnabled && (
                <div className="space-y-4">
                  <Field>
                    <FieldLabel>{t("Retention Mode")}</FieldLabel>
                    <FieldContent>
                      <RadioGroup
                        value={retentionMode}
                        onValueChange={(v) => setRetentionMode(v as "COMPLIANCE" | "GOVERNANCE")}
                        className="grid gap-2 sm:grid-cols-2"
                      >
                        {retentionModeOptions.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-start gap-3 rounded-md border border-border/50 p-3"
                          >
                            <RadioGroupItem value={option.value} className="mt-0.5" />
                            <span className="text-sm font-medium">{t(option.label)}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>{t("Validity")}</FieldLabel>
                    <FieldContent>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={retentionPeriod}
                          onChange={(e) => setRetentionPeriod(e.target.value)}
                          type="number"
                          className="sm:w-32"
                        />
                        <RadioGroup
                          value={retentionUnit}
                          onValueChange={(v) => setRetentionUnit(v as "day" | "year")}
                          className="grid gap-2 sm:grid-cols-2"
                        >
                          {retentionUnitOptions.map((option) => (
                            <label
                              key={option.value}
                              className="flex items-start gap-3 rounded-md border border-border/50 p-3"
                            >
                              <RadioGroupItem value={option.value} className="mt-0.5" />
                              <span className="text-sm font-medium">{t(option.labelKey)}</span>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>
                    </FieldContent>
                  </Field>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={closeModal}>
            {t("Cancel")}
          </Button>
          <Button variant="default" disabled={isSubmitDisabled} onClick={handleCreateBucket}>
            {creating ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("Create")}
              </span>
            ) : (
              t("Create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
