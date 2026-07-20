"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { useBucket } from "@/hooks/use-bucket"
import { useTiers, type TierRow } from "@/hooks/use-tiers"
import { useMessage } from "@/lib/feedback/message"
import { randomUUID } from "@/lib/functions"
import { isMissingBucketConfiguration } from "@/lib/bucket-configuration"
import {
  buildCurrentVersionExpirationRules,
  buildLifecycleFilter,
  findIncompleteLifecycleTag,
  getBucketVersioningMode,
  hasCompleteLifecycleTags,
  MAX_LIFECYCLE_RULES,
  type BucketVersioningMode,
} from "@/lib/bucket-lifecycle"

interface LifecycleNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketName: string | null
  onSuccess?: () => void
}

interface Tag {
  key: string
  value: string
}

export function LifecycleNewForm({ open, onOpenChange, bucketName, onSuccess }: LifecycleNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { putBucketLifecycleConfiguration, getBucketVersioning, getBucketLifecycleConfiguration } = useBucket()
  const { listTiers } = useTiers()

  const [activeTab, setActiveTab] = useState<"expire" | "transition">("expire")
  const [versionType, setVersionType] = useState("current")
  const [days, setDays] = useState(1)
  const [storageType, setStorageType] = useState("")
  const [prefix, setPrefix] = useState("")
  const [expiredDeleteMark, setExpiredDeleteMark] = useState(false)
  const [tags, setTags] = useState<Tag[]>([{ key: "", value: "" }])
  const [tiers, setTiers] = useState<Array<{ label: string; value: string; type: string }>>([])
  const [tiersLoading, setTiersLoading] = useState(false)
  const [tiersError, setTiersError] = useState("")
  const [tiersReloadVersion, setTiersReloadVersion] = useState(0)
  const [versioningMode, setVersioningMode] = useState<BucketVersioningMode>("unversioned")
  const [versioningLoading, setVersioningLoading] = useState(false)
  const [versioningError, setVersioningError] = useState("")
  const [versioningReloadVersion, setVersioningReloadVersion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    days?: string
    storageType?: string
    tags?: string
    deleteMarker?: string
  }>({})

  const hasVersionHistory = versioningMode !== "unversioned"

  const versionOptions = useMemo(
    () => [
      { label: t("Current Version"), value: "current" },
      { label: t("Non-current Version"), value: "non-current" },
    ],
    [t],
  )

  const loadTiers = useCallback(async () => {
    setTiersLoading(true)
    setTiersError("")
    try {
      const res = await listTiers()
      if (res) {
        const tierOptions = res.map((item: TierRow) => {
          const config = item[item.type] as { name?: string } | undefined
          return {
            label: config?.name ?? "",
            value: config?.name ?? "",
            type: item.type,
          }
        })
        setTiers(tierOptions)
      }
    } catch {
      setTiers([])
      setTiersError(t("Unable to load storage tiers."))
    } finally {
      setTiersLoading(false)
    }
  }, [listTiers, t])

  const loadVersioningStatus = useCallback(async () => {
    if (!bucketName) {
      setVersioningMode("unversioned")
      return
    }
    setVersioningLoading(true)
    setVersioningError("")
    try {
      const resp = await getBucketVersioning(bucketName)
      setVersioningMode(getBucketVersioningMode(resp.Status))
    } catch {
      setVersioningMode("unversioned")
      setVersioningError(t("Unable to load versioning status."))
    } finally {
      setVersioningLoading(false)
    }
  }, [bucketName, getBucketVersioning, t])

  useEffect(() => {
    if (open) {
      loadTiers()
      loadVersioningStatus()
    }
  }, [open, loadTiers, loadVersioningStatus, tiersReloadVersion, versioningReloadVersion])

  useEffect(() => {
    if (activeTab !== "expire" || versionType !== "current") setExpiredDeleteMark(false)
  }, [activeTab, versionType])

  useEffect(() => {
    if (!hasVersionHistory) {
      setVersionType("current")
      setExpiredDeleteMark(false)
    }
  }, [hasVersionHistory])

  const resetForm = useCallback(() => {
    setActiveTab("expire")
    setVersionType("current")
    setDays(1)
    setStorageType("")
    setPrefix("")
    setExpiredDeleteMark(false)
    setTags([{ key: "", value: "" }])
    setSaveError("")
    setFieldErrors({})
  }, [])

  const selectedTierType = tiers.find((tier) => tier.value === storageType)?.type

  useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, resetForm])

  const addTag = () => {
    setTags((prev) => [...prev, { key: "", value: "" }])
  }

  const removeTag = (index: number) => {
    if (tags.length === 1) return
    setTags((prev) => prev.filter((_, i) => i !== index))
    setFieldErrors((current) => ({ ...current, tags: undefined, deleteMarker: undefined }))
  }

  const updateTag = (index: number, field: "key" | "value", value: string) => {
    setTags((prev) => prev.map((tag, i) => (i === index ? { ...tag, [field]: value } : tag)))
    setFieldErrors((current) => ({ ...current, tags: undefined, deleteMarker: undefined }))
  }

  const validate = () => {
    const errors: typeof fieldErrors = {}
    if (!days || days < 1) {
      errors.days = t("Please enter valid days")
    }
    if (activeTab === "transition" && !storageType) {
      errors.storageType = t("Please select storage type")
    }

    const incompleteTagIndex = findIncompleteLifecycleTag(tags)
    if (incompleteTagIndex >= 0) {
      errors.tags = tags[incompleteTagIndex].key.trim() ? t("Please enter tag value") : t("Please enter key name")
    }
    if (activeTab === "expire" && versionType === "current" && expiredDeleteMark && hasCompleteLifecycleTags(tags)) {
      errors.deleteMarker = `${t("Delete Marker Handling")}: ${t("Tags")} ${t("Unsupported")}`
    }

    setFieldErrors(errors)
    const firstErrorId = errors.days
      ? activeTab === "transition"
        ? "lifecycle-transition-days"
        : "lifecycle-expire-days"
      : errors.storageType
        ? "lifecycle-storage-type"
        : errors.tags && incompleteTagIndex >= 0
          ? tags[incompleteTagIndex].key.trim()
            ? `lifecycle-${activeTab}-tag-value-${incompleteTagIndex}`
            : `lifecycle-${activeTab}-tag-key-${incompleteTagIndex}`
          : errors.deleteMarker
            ? "lifecycle-expired-delete-marker"
            : null
    if (firstErrorId) document.getElementById(firstErrorId)?.focus()
    return !firstErrorId
  }

  const handleSave = async () => {
    if (submitting) return
    if (versioningLoading || versioningError || (activeTab === "transition" && (tiersLoading || tiersError))) return
    if (!validate()) return
    if (!bucketName) {
      message.error(t("Bucket name is required"))
      return
    }
    setSubmitting(true)
    setSaveError("")
    try {
      let currentConfig: { Rules?: unknown[] } | null = null
      try {
        currentConfig = (await getBucketLifecycleConfiguration(bucketName)) as {
          Rules?: unknown[]
        }
      } catch (error) {
        if (!isMissingBucketConfiguration(error, "lifecycle")) {
          throw error
        }
      }

      const filter = buildLifecycleFilter(prefix, tags)
      const baseId = randomUUID()
      const baseRule: Record<string, unknown> = {
        ID: baseId,
        Status: "Enabled",
        Filter: filter,
      }

      const daysValue = Number(days)
      let newRules: Record<string, unknown>[]

      if (activeTab === "expire") {
        if (versionType === "non-current") {
          baseRule.NoncurrentVersionExpiration = { NoncurrentDays: daysValue }
          newRules = [baseRule]
        } else {
          newRules = buildCurrentVersionExpirationRules(baseId, daysValue, filter, expiredDeleteMark)
        }
      } else {
        if (versionType === "non-current") {
          baseRule.NoncurrentVersionTransitions = [{ NoncurrentDays: daysValue, StorageClass: storageType }]
        } else {
          baseRule.Transitions = [{ Days: daysValue, StorageClass: storageType }]
        }
        newRules = [baseRule]
      }

      const existingRules = currentConfig?.Rules ?? []
      if (existingRules.length + newRules.length > MAX_LIFECYCLE_RULES) {
        throw new Error(t("Lifecycle configuration cannot contain more than 1000 rules."))
      }
      const payload = { Rules: [...existingRules, ...newRules] }

      await putBucketLifecycleConfiguration(bucketName, payload)
      message.success(t("Create Success"))
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      const errorMessage = (error as Error).message || t("Failed to create rule")
      setSaveError(errorMessage)
      message.error(errorMessage)
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
        <DialogHeader className="border-b px-4 py-3 pe-12 sm:px-6">
          <DialogTitle>
            {t("Add Lifecycle Rule")} ({t("Bucket")}: {bucketName || ""})
          </DialogTitle>
        </DialogHeader>

        <form
          className="contents"
          aria-busy={submitting}
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
        >
          <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6">
            {saveError ? (
              <div role="alert" className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {saveError}
              </div>
            ) : null}
            {versioningError ? (
              <Alert variant="destructive">
                <AlertTitle>{t("Unable to load versioning status.")}</AlertTitle>
                <AlertDescription>{t("Refresh to try again.")}</AlertDescription>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setVersioningReloadVersion((value) => value + 1)}
                >
                  {t("Refresh")}
                </Button>
              </Alert>
            ) : null}
            {tiersError && activeTab === "transition" ? (
              <Alert variant="destructive">
                <AlertTitle>{t("Unable to load storage tiers.")}</AlertTitle>
                <AlertDescription>{t("Refresh to try again.")}</AlertDescription>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setTiersReloadVersion((value) => value + 1)}
                >
                  {t("Refresh")}
                </Button>
              </Alert>
            ) : null}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "expire" | "transition")}
              className="flex flex-col gap-4"
            >
              <TabsList className="justify-start overflow-x-auto overflow-y-hidden">
                <TabsTrigger value="expire">{t("Expiration")}</TabsTrigger>
                <TabsTrigger value="transition">{t("Transition")}</TabsTrigger>
              </TabsList>

              <TabsContent value="expire" className="mt-0 space-y-6">
                <div className="space-y-4">
                  {hasVersionHistory && (
                    <Field>
                      <FieldLabel>{t("Object Version")}</FieldLabel>
                      <FieldContent>
                        <Select value={versionType} onValueChange={(value) => setVersionType(value ?? "")}>
                          <SelectTrigger className="w-full" aria-label={t("Object Version")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {versionOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                  )}

                  <Field>
                    <FieldLabel>{t("Time Cycle")}</FieldLabel>
                    <FieldDescription>{t("Set the time cycle for the rule")}</FieldDescription>
                    <FieldContent>
                      <div className="flex items-center gap-3">
                        <Input
                          id="lifecycle-expire-days"
                          name="lifecycle-expire-days"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          aria-label={t("Days")}
                          aria-invalid={Boolean(fieldErrors.days)}
                          aria-describedby={fieldErrors.days ? "lifecycle-expire-days-error" : undefined}
                          value={days}
                          onChange={(e) => {
                            setDays(Number(e.target.value))
                            setFieldErrors((current) => ({ ...current, days: undefined }))
                          }}
                          className="w-32"
                          placeholder={t("Days")}
                        />
                        <span className="text-sm text-muted-foreground">{t("Days After")}</span>
                      </div>
                    </FieldContent>
                    <FieldError id="lifecycle-expire-days-error">{fieldErrors.days}</FieldError>
                  </Field>
                </div>

                <details className="space-y-4">
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    {t("More Configurations")}
                  </summary>
                  <div className="mt-4 space-y-4">
                    <Field>
                      <FieldLabel htmlFor="lifecycle-expire-prefix">{t("Prefix")}</FieldLabel>
                      <FieldContent>
                        <Input
                          id="lifecycle-expire-prefix"
                          name="lifecycle-expire-prefix"
                          value={prefix}
                          onChange={(e) => setPrefix(e.target.value)}
                          autoComplete="off"
                          placeholder={t("Please enter prefix")}
                          spellCheck={false}
                        />
                      </FieldContent>
                    </Field>

                    <div className="space-y-3" aria-invalid={Boolean(fieldErrors.tags)}>
                      <div className="flex items-center justify-between">
                        <FieldLabel className="text-sm font-medium">{t("Tags")}</FieldLabel>
                        <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={submitting}>
                          <RiAddLine className="size-4" aria-hidden />
                          {t("Add Tag")}
                        </Button>
                      </div>
                      {tags.length > 0 && (
                        <div className="space-y-3">
                          {tags.map((tag, index) => (
                            <div key={index} className="grid gap-2 md:grid-cols-2 md:items-center md:gap-4">
                              <Input
                                id={`lifecycle-expire-tag-key-${index}`}
                                name={`lifecycle-expire-tag-key-${index}`}
                                value={tag.key}
                                onChange={(e) => updateTag(index, "key", e.target.value)}
                                aria-label={`${t("Tag Name")} ${index + 1}`}
                                aria-invalid={
                                  Boolean(fieldErrors.tags) && Boolean(tag.key.trim()) !== Boolean(tag.value.trim())
                                }
                                aria-describedby={fieldErrors.tags ? "lifecycle-expire-tags-error" : undefined}
                                autoComplete="off"
                                placeholder={t("Tag Name")}
                                spellCheck={false}
                              />
                              <div className="flex items-center gap-2">
                                <Input
                                  id={`lifecycle-expire-tag-value-${index}`}
                                  name={`lifecycle-expire-tag-value-${index}`}
                                  value={tag.value}
                                  onChange={(e) => updateTag(index, "value", e.target.value)}
                                  aria-label={`${t("Tag Value")} ${index + 1}`}
                                  aria-invalid={
                                    Boolean(fieldErrors.tags) && Boolean(tag.key.trim()) !== Boolean(tag.value.trim())
                                  }
                                  aria-describedby={fieldErrors.tags ? "lifecycle-expire-tags-error" : undefined}
                                  autoComplete="off"
                                  placeholder={t("Tag Value")}
                                  className="flex-1"
                                  spellCheck={false}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  disabled={tags.length === 1 || submitting}
                                  aria-label={`${t("Delete")} ${t("Tag Name")} ${index + 1}`}
                                  onClick={() => removeTag(index)}
                                >
                                  <RiDeleteBinLine className="size-4" aria-hidden />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <FieldError id="lifecycle-expire-tags-error">{fieldErrors.tags}</FieldError>
                    </div>
                  </div>
                </details>

                {hasVersionHistory && versionType === "current" && (
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-primary">
                      {t("Advanced Settings")}
                    </summary>
                    <Field className="mt-4">
                      <label
                        htmlFor="lifecycle-expired-delete-marker"
                        className="flex cursor-pointer items-start gap-3"
                      >
                        <Checkbox
                          id="lifecycle-expired-delete-marker"
                          name="lifecycle-expired-delete-marker"
                          checked={expiredDeleteMark}
                          aria-invalid={Boolean(fieldErrors.deleteMarker)}
                          aria-describedby={
                            fieldErrors.deleteMarker
                              ? "lifecycle-expired-delete-marker-description lifecycle-expired-delete-marker-error"
                              : "lifecycle-expired-delete-marker-description"
                          }
                          onCheckedChange={(checked) => {
                            setExpiredDeleteMark(checked === true)
                            setFieldErrors((current) => ({ ...current, deleteMarker: undefined }))
                          }}
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm font-medium">{t("Delete Marker Handling")}</span>
                          <FieldDescription id="lifecycle-expired-delete-marker-description">
                            {t("If no versions remain, delete references to this object")}
                          </FieldDescription>
                        </span>
                      </label>
                      <FieldError id="lifecycle-expired-delete-marker-error">{fieldErrors.deleteMarker}</FieldError>
                    </Field>
                  </details>
                )}

                {hasVersionHistory && versionType === "current" ? (
                  <Alert>
                    <AlertTitle>{t("Warning")}</AlertTitle>
                    <AlertDescription>
                      {t(
                        "Current version expiration creates a delete marker. Configure non-current version expiration to permanently remove object data.",
                      )}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {activeTab === "expire" && expiredDeleteMark ? (
                  <p className="text-sm text-muted-foreground">{t("2 lifecycle rules will be created.")}</p>
                ) : null}
              </TabsContent>

              <TabsContent value="transition" className="mt-0 space-y-6">
                <div className="space-y-4">
                  {hasVersionHistory && (
                    <Field>
                      <FieldLabel>{t("Object Version")}</FieldLabel>
                      <FieldContent>
                        <Select value={versionType} onValueChange={(value) => setVersionType(value ?? "")}>
                          <SelectTrigger className="w-full" aria-label={t("Object Version")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {versionOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>
                  )}

                  <Field>
                    <FieldLabel>{t("Time Cycle")}</FieldLabel>
                    <FieldContent>
                      <div className="flex items-center gap-3">
                        <Input
                          id="lifecycle-transition-days"
                          name="lifecycle-transition-days"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          aria-label={t("Days")}
                          aria-invalid={Boolean(fieldErrors.days)}
                          aria-describedby={fieldErrors.days ? "lifecycle-transition-days-error" : undefined}
                          value={days}
                          onChange={(e) => {
                            setDays(Number(e.target.value))
                            setFieldErrors((current) => ({ ...current, days: undefined }))
                          }}
                          className="w-32"
                          placeholder={t("Days")}
                        />
                        <span className="text-sm text-muted-foreground">{t("Days After")}</span>
                      </div>
                    </FieldContent>
                    <FieldError id="lifecycle-transition-days-error">{fieldErrors.days}</FieldError>
                  </Field>

                  <Field>
                    <FieldLabel>{t("Storage Type")}</FieldLabel>
                    <FieldContent>
                      <Select
                        value={storageType}
                        onValueChange={(value) => {
                          setStorageType(value ?? "")
                          setFieldErrors((current) => ({ ...current, storageType: undefined }))
                        }}
                      >
                        <SelectTrigger
                          id="lifecycle-storage-type"
                          className="w-full"
                          aria-label={t("Storage Type")}
                          aria-invalid={Boolean(fieldErrors.storageType)}
                          aria-describedby={fieldErrors.storageType ? "lifecycle-storage-type-error" : undefined}
                          disabled={tiersLoading || Boolean(tiersError)}
                        >
                          <SelectValue placeholder={t("Please select storage type")} />
                        </SelectTrigger>
                        <SelectContent>
                          {tiers.map((tier) => (
                            <SelectItem key={tier.value} value={tier.value}>
                              {tier.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldContent>
                    {tiersLoading ? <FieldDescription>{t("Loading")}</FieldDescription> : null}
                    <FieldError id="lifecycle-storage-type-error">{fieldErrors.storageType}</FieldError>
                  </Field>
                  {selectedTierType === "wasabi" ? (
                    <Alert>
                      <AlertTitle>{t("Wasabi lifecycle requirements")}</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc ps-4">
                          <li>{t("The remote Wasabi bucket must never have had Versioning enabled.")}</li>
                          <li>{t("Compliance or Object Lock retention may prevent deletion.")}</li>
                          <li>{t("Early expiry may still incur minimum storage duration charges.")}</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>

                <details className="space-y-4">
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    {t("More Configurations")}
                  </summary>
                  <div className="mt-4 space-y-4">
                    <Field>
                      <FieldLabel htmlFor="lifecycle-transition-prefix">{t("Prefix")}</FieldLabel>
                      <FieldContent>
                        <Input
                          id="lifecycle-transition-prefix"
                          name="lifecycle-transition-prefix"
                          value={prefix}
                          onChange={(e) => setPrefix(e.target.value)}
                          autoComplete="off"
                          placeholder={t("Please enter prefix")}
                          spellCheck={false}
                        />
                      </FieldContent>
                    </Field>

                    <div className="space-y-3" aria-invalid={Boolean(fieldErrors.tags)}>
                      <div className="flex items-center justify-between">
                        <FieldLabel className="text-sm font-medium">{t("Tags")}</FieldLabel>
                        <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={submitting}>
                          <RiAddLine className="size-4" aria-hidden />
                          {t("Add Tag")}
                        </Button>
                      </div>
                      {tags.length > 0 && (
                        <div className="space-y-3">
                          {tags.map((tag, index) => (
                            <div key={index} className="grid gap-2 border p-3 md:grid-cols-2 md:items-center md:gap-4">
                              <Input
                                id={`lifecycle-transition-tag-key-${index}`}
                                name={`lifecycle-transition-tag-key-${index}`}
                                value={tag.key}
                                onChange={(e) => updateTag(index, "key", e.target.value)}
                                aria-label={`${t("Tag Name")} ${index + 1}`}
                                aria-invalid={
                                  Boolean(fieldErrors.tags) && Boolean(tag.key.trim()) !== Boolean(tag.value.trim())
                                }
                                aria-describedby={fieldErrors.tags ? "lifecycle-transition-tags-error" : undefined}
                                autoComplete="off"
                                placeholder={t("Tag Name")}
                                spellCheck={false}
                              />
                              <div className="flex items-center gap-2">
                                <Input
                                  id={`lifecycle-transition-tag-value-${index}`}
                                  name={`lifecycle-transition-tag-value-${index}`}
                                  value={tag.value}
                                  onChange={(e) => updateTag(index, "value", e.target.value)}
                                  aria-label={`${t("Tag Value")} ${index + 1}`}
                                  aria-invalid={
                                    Boolean(fieldErrors.tags) && Boolean(tag.key.trim()) !== Boolean(tag.value.trim())
                                  }
                                  aria-describedby={fieldErrors.tags ? "lifecycle-transition-tags-error" : undefined}
                                  autoComplete="off"
                                  placeholder={t("Tag Value")}
                                  className="flex-1"
                                  spellCheck={false}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  disabled={tags.length === 1 || submitting}
                                  aria-label={`${t("Delete")} ${t("Tag Name")} ${index + 1}`}
                                  onClick={() => removeTag(index)}
                                >
                                  <RiDeleteBinLine className="size-4" aria-hidden />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <FieldError id="lifecycle-transition-tags-error">{fieldErrors.tags}</FieldError>
                    </div>
                  </div>
                </details>
              </TabsContent>
            </Tabs>
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
              disabled={
                submitting ||
                versioningLoading ||
                Boolean(versioningError) ||
                (activeTab === "transition" && (tiersLoading || Boolean(tiersError)))
              }
            >
              {submitting ? t("Saving…") : t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
