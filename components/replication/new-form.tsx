"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { useBucket } from "@/hooks/use-bucket"
import { useRuntimeCapabilities } from "@/hooks/use-runtime-capabilities"
import { useMessage } from "@/lib/feedback/message"
import { getBytes, randomUUID } from "@/lib/functions"
import { isMissingBucketConfiguration, normalizeReplicationRulesForRolelessConfig } from "@/lib/bucket-configuration"
import { buildBucketReplicationTlsPayload, type BucketReplicationTlsMode } from "@/lib/bucket-replication-tls"
import { getRuntimeCapabilityFieldState } from "@/lib/runtime-capabilities"

interface ReplicationNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketName: string | null
  onSuccess?: () => void
}

interface Tag {
  key: string
  value: string
}

interface ReplicationRulePayload extends Record<string, unknown> {
  Destination?: { Bucket?: string; StorageClass?: string }
}

export function ReplicationNewForm({ open, onOpenChange, bucketName, onSuccess }: ReplicationNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { setRemoteReplicationTarget, listRemoteReplicationTargets, putBucketReplication, getBucketReplication } =
    useBucket()
  const { capabilities, isLoading: capabilitiesLoading, error: capabilitiesError } = useRuntimeCapabilities()

  const [level, setLevel] = useState("1")
  const [endpoint, setEndpoint] = useState("")
  const [tls, setTls] = useState(false)
  const [tlsMode, setTlsMode] = useState<BucketReplicationTlsMode>("verify")
  const [caCertPem, setCaCertPem] = useState("")
  const [accessKey, setAccessKey] = useState("")
  const [secretKey, setSecretKey] = useState("")
  const [bucket, setBucket] = useState("")
  const [region, setRegion] = useState("us-east-1")
  const [modeType, setModeType] = useState("async")
  const [timecheck, setTimecheck] = useState("60")
  const [unit, setUnit] = useState("Gi")
  const [bandwidth, setBandwidth] = useState(100)
  const [storageType, setStorageType] = useState("STANDARD")
  const [prefix, setPrefix] = useState("")
  const [tags, setTags] = useState<Tag[]>([{ key: "", value: "" }])
  const [existingObject, setExistingObject] = useState(true)
  const [expiredDeleteMark, setExpiredDeleteMark] = useState(true)
  const [replicateDelete, setReplicateDelete] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<{
    endpoint?: string
    bucket?: string
    accessKey?: string
    secretKey?: string
    timecheck?: string
    caCertPem?: string
  }>({})

  const modeOptions = useMemo(
    () => [
      { label: t("Asynchronous"), value: "async" },
      { label: t("Synchronous"), value: "sync" },
    ],
    [t],
  )

  const unitOptions = useMemo(
    () => [
      { label: "KiB/s", value: "Ki" },
      { label: "MiB/s", value: "Mi" },
      { label: "GiB/s", value: "Gi" },
    ],
    [],
  )

  const canEditBucketField = useCallback(
    (fieldName: string) => getRuntimeCapabilityFieldState(capabilities, "bucketReplication", fieldName) === "supported",
    [capabilities],
  )

  const canEditTargetField = useCallback(
    (fieldName: string) => getRuntimeCapabilityFieldState(capabilities, "remoteTargets", fieldName) === "supported",
    [capabilities],
  )

  const canEditCurrentTagFilter =
    tags.length > 1 ? canEditBucketField("Rule.Filter.And") : canEditBucketField("Rule.Filter.Tag")
  const canAddTag = canEditBucketField("Rule.Filter.And")

  const storageClassOptions = useMemo(() => {
    const supported = capabilities?.storageClasses.supportedWriteClasses ?? []
    const current = storageType.trim() || "STANDARD"
    const values = [...supported]
    if (!values.includes(current)) {
      values.push(current)
    }
    return values
  }, [capabilities, storageType])

  const bucketHistoricalFields = useMemo(
    () =>
      (capabilities?.replication.bucketReplication.fields ?? []).filter(
        (field) => field.state === "read_only_historical",
      ),
    [capabilities],
  )

  const remoteTargetUnsupportedFields = useMemo(
    () => (capabilities?.replication.remoteTargets.fields ?? []).filter((field) => field.state === "unsupported"),
    [capabilities],
  )

  const replicationFeaturesSupported =
    capabilities?.replication.bucketReplication.status.state === "supported" &&
    capabilities.replication.remoteTargets.status.state === "supported"
  const requiredBucketFieldsSupported = [
    "Role",
    "Rule.ID",
    "Rule.Status",
    "Rule.Priority",
    "Rule.Destination.Bucket",
  ].every(canEditBucketField)
  const requiredTargetFieldsSupported = [
    "sourcebucket",
    "endpoint",
    "credentials.accessKey",
    "credentials.secretKey",
    "targetbucket",
    "secure",
    "path",
    "api",
    "type",
    "region",
    "bandwidth",
    "replicationSync",
    "skipTlsVerify",
    "caCertPem",
  ].every(canEditTargetField)
  const controlsLocked =
    submitting ||
    capabilitiesLoading ||
    !capabilities ||
    !replicationFeaturesSupported ||
    !requiredBucketFieldsSupported ||
    !requiredTargetFieldsSupported

  const resetForm = useCallback(() => {
    setLevel("1")
    setEndpoint("")
    setTls(false)
    setTlsMode("verify")
    setCaCertPem("")
    setAccessKey("")
    setSecretKey("")
    setBucket("")
    setRegion("us-east-1")
    setModeType("async")
    setTimecheck("60")
    setUnit("Gi")
    setBandwidth(100)
    setStorageType("STANDARD")
    setPrefix("")
    setTags([{ key: "", value: "" }])
    setExistingObject(true)
    setExpiredDeleteMark(true)
    setReplicateDelete(true)
    setSaveError("")
    setFieldErrors({})
  }, [])

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
  }

  const updateTag = (index: number, field: "key" | "value", value: string) => {
    setTags((prev) => prev.map((tag, i) => (i === index ? { ...tag, [field]: value } : tag)))
  }

  const validate = () => {
    const errors: typeof fieldErrors = {}
    if (!endpoint) {
      errors.endpoint = t("Please enter endpoint")
    }
    if (!bucket) {
      errors.bucket = t("Please enter bucket")
    }
    if (!accessKey) errors.accessKey = t("Please enter Access Key")
    if (!secretKey) errors.secretKey = t("Please enter Secret Key")
    if (modeType === "async" && Number(timecheck) < 1) {
      errors.timecheck = t("Please enter valid health check interval")
    }
    if (tls && tlsMode === "custom-ca" && !caCertPem.trim()) {
      errors.caCertPem = t("Custom CA certificate is required")
    }
    setFieldErrors(errors)
    const firstErrorId = errors.endpoint
      ? "replication-endpoint"
      : errors.bucket
        ? "replication-bucket"
        : errors.accessKey
          ? "replication-access-key"
          : errors.secretKey
            ? "replication-secret-key"
            : errors.timecheck
              ? "replication-health-check-interval"
              : errors.caCertPem
                ? "replication-ca-certificate"
                : null
    if (firstErrorId) document.getElementById(firstErrorId)?.focus()
    return !firstErrorId
  }

  const handleSave = async () => {
    if (submitting || controlsLocked) return
    if (!validate()) return
    if (!bucketName) {
      message.error(t("Bucket name is required"))
      return
    }
    setSubmitting(true)
    setSaveError("")
    let remoteTargetSaved = false
    try {
      const tlsConfig = buildBucketReplicationTlsPayload(tls, tlsMode, caCertPem)
      const currentTargets = (await listRemoteReplicationTargets(bucketName)) as Record<string, unknown>[]
      const currentTarget = currentTargets.find((target) => {
        const targetBucket = typeof target.targetbucket === "string" ? target.targetbucket : ""
        const targetEndpoint = typeof target.endpoint === "string" ? target.endpoint : ""
        return targetBucket === bucket || targetEndpoint === endpoint
      })
      const config: Record<string, unknown> = {
        sourcebucket: bucketName,
        endpoint,
        credentials: {
          accessKey,
          secretKey,
        },
        targetbucket: bucket,
        secure: tls,
        skipTlsVerify: tlsConfig.skipTlsVerify,
        caCertPem: tlsConfig.caCertPem,
        region,
        path: "auto",
        api: "s3v4",
        type: "replication",
        replicationSync: modeType === "sync",
        ...(canEditTargetField("healthCheckDuration") ? { healthCheckDuration: Number(timecheck) || 60 } : {}),
        ...(canEditTargetField("disableProxy") ? { disableProxy: false } : {}),
        ...(canEditTargetField("resetBeforeDate") ? { resetBeforeDate: "0001-01-01T00:00:00Z" } : {}),
        ...(canEditTargetField("totalDowntime") ? { totalDowntime: 0 } : {}),
        ...(canEditTargetField("lastOnline") ? { lastOnline: "0001-01-01T00:00:00Z" } : {}),
        ...(canEditTargetField("isOnline") ? { isOnline: false } : {}),
        ...(canEditTargetField("latency") ? { latency: { curr: 0, avg: 0, max: 0 } } : {}),
        ...(canEditTargetField("edge") ? { edge: false } : {}),
        ...(canEditTargetField("edgeSyncBeforeExpiry") ? { edgeSyncBeforeExpiry: false } : {}),
        ...(typeof currentTarget?.arn === "string" && currentTarget.arn && canEditTargetField("arn")
          ? { arn: currentTarget.arn }
          : {}),
      }

      if (modeType === "async") {
        config.bandwidth = Number(getBytes(String(bandwidth), unit, true)) || 0
      }
      let oldConfig: {
        ReplicationConfiguration?: { Role?: string; Rules?: ReplicationRulePayload[] }
      } | null = null
      try {
        oldConfig = (await getBucketReplication(bucketName)) as {
          ReplicationConfiguration?: { Role?: string; Rules?: ReplicationRulePayload[] }
        }
      } catch (error) {
        if (!isMissingBucketConfiguration(error, "replication")) {
          throw error
        }
      }

      const targetResponse = (await setRemoteReplicationTarget(bucketName, config)) as string
      if (!targetResponse) {
        throw new Error(t("Save failed"))
      }
      remoteTargetSaved = true

      const newRule: ReplicationRulePayload = {
        ...(canEditBucketField("Rule.ID") ? { ID: randomUUID() } : {}),
        ...(canEditBucketField("Rule.Status") ? { Status: "Enabled" } : {}),
        ...(canEditBucketField("Rule.Priority") ? { Priority: parseInt(level) || 1 } : {}),
        ...(canEditBucketField("Rule.ExistingObjectReplication.Status")
          ? { ExistingObjectReplication: { Status: existingObject ? "Enabled" : "Disabled" } }
          : {}),
        ...(canEditBucketField("Rule.DeleteMarkerReplication.Status")
          ? { DeleteMarkerReplication: { Status: expiredDeleteMark ? "Enabled" : "Disabled" } }
          : {}),
        ...(canEditBucketField("Rule.DeleteReplication.Status")
          ? { DeleteReplication: { Status: replicateDelete ? "Enabled" : "Disabled" } }
          : {}),
        ...(canEditBucketField("Rule.Destination.Bucket")
          ? { Destination: { Bucket: targetResponse, StorageClass: storageType || "STANDARD" } }
          : {}),
      }

      const validTags = tags.filter((tag) => tag.key && tag.value)
      const filter: Record<string, unknown> = {}

      if (prefix && canEditBucketField("Rule.Filter.Prefix")) {
        filter.Prefix = prefix
      }

      if (validTags.length === 1) {
        const [singleTag] = validTags
        if (singleTag && canEditBucketField("Rule.Filter.Tag")) {
          filter.Tag = { Key: singleTag.key, Value: singleTag.value }
        }
      } else if (validTags.length > 1 && canEditBucketField("Rule.Filter.And")) {
        filter.And = {
          ...(prefix && canEditBucketField("Rule.Filter.Prefix") ? { Prefix: prefix } : {}),
          Tags: validTags.map((tag) => ({ Key: tag.key, Value: tag.value })),
        }
        delete filter.Prefix
      }

      if (Object.keys(filter).length > 0) {
        newRule.Filter = filter
      }

      let latestConfig = oldConfig
      try {
        latestConfig = (await getBucketReplication(bucketName)) as {
          ReplicationConfiguration?: { Role?: string; Rules?: ReplicationRulePayload[] }
        }
      } catch (error) {
        if (isMissingBucketConfiguration(error, "replication")) {
          latestConfig = null
        } else {
          throw error
        }
      }

      const existingRules = normalizeReplicationRulesForRolelessConfig(
        latestConfig?.ReplicationConfiguration?.Rules ?? [],
        latestConfig?.ReplicationConfiguration?.Role,
      )
      const nextRules = [...existingRules, newRule]
      const payload = {
        Role: "",
        Rules: nextRules,
      }

      await putBucketReplication(bucketName, payload)
      remoteTargetSaved = false
      message.success(t("Create Success"))
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error(error)
      let errorMessage = (error as Error).message || t("Save failed")
      if (remoteTargetSaved) {
        errorMessage = `${errorMessage}. ${t("The remote target may have been saved. Review the replication configuration before retrying.")}`
      }
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
            {t("Add Replication Rule")} ({t("Bucket")}: {bucketName || ""})
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
            {capabilitiesError ? (
              <p role="alert" className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {capabilitiesError}
              </p>
            ) : null}
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="replication-priority">{t("Priority")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="replication-priority"
                      name="replication-priority"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      autoComplete="off"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      disabled={controlsLocked || !canEditBucketField("Rule.Priority")}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>{t("Mode")}</FieldLabel>
                  <FieldContent>
                    <Select
                      value={modeType}
                      onValueChange={(value) => setModeType(value ?? "")}
                      disabled={controlsLocked || !canEditTargetField("replicationSync")}
                    >
                      <SelectTrigger className="w-full" aria-label={t("Mode")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-endpoint">{t("Endpoint")}</FieldLabel>
                  <FieldContent>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 items-center whitespace-nowrap border border-input bg-muted px-3 text-sm text-muted-foreground">
                        {tls ? "https://" : "http://"}
                      </div>
                      <Input
                        id="replication-endpoint"
                        name="replication-endpoint"
                        className="flex-1"
                        value={endpoint}
                        onChange={(e) => {
                          setEndpoint(e.target.value)
                          setFieldErrors((current) => ({ ...current, endpoint: undefined }))
                        }}
                        aria-invalid={Boolean(fieldErrors.endpoint)}
                        aria-describedby={fieldErrors.endpoint ? "replication-endpoint-error" : undefined}
                        autoComplete="off"
                        placeholder={t("Please enter endpoint")}
                        spellCheck={false}
                        disabled={controlsLocked || !canEditTargetField("endpoint")}
                      />
                    </div>
                  </FieldContent>
                  <FieldError id="replication-endpoint-error">{fieldErrors.endpoint}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-bucket">{t("Bucket")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="replication-bucket"
                      name="replication-bucket"
                      value={bucket}
                      onChange={(e) => {
                        setBucket(e.target.value)
                        setFieldErrors((current) => ({ ...current, bucket: undefined }))
                      }}
                      aria-invalid={Boolean(fieldErrors.bucket)}
                      aria-describedby={fieldErrors.bucket ? "replication-bucket-error" : undefined}
                      autoComplete="off"
                      placeholder={t("Please enter bucket")}
                      spellCheck={false}
                      disabled={controlsLocked || !canEditTargetField("targetbucket")}
                    />
                  </FieldContent>
                  <FieldError id="replication-bucket-error">{fieldErrors.bucket}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-access-key">{t("Access Key")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="replication-access-key"
                      name="replication-access-key"
                      value={accessKey}
                      onChange={(e) => {
                        setAccessKey(e.target.value)
                        setFieldErrors((current) => ({ ...current, accessKey: undefined }))
                      }}
                      aria-invalid={Boolean(fieldErrors.accessKey)}
                      aria-describedby={fieldErrors.accessKey ? "replication-access-key-error" : undefined}
                      placeholder={t("Please enter Access Key")}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={controlsLocked || !canEditTargetField("credentials.accessKey")}
                    />
                  </FieldContent>
                  <FieldError id="replication-access-key-error">{fieldErrors.accessKey}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-secret-key">{t("Secret Key")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="replication-secret-key"
                      name="replication-secret-key"
                      type="password"
                      value={secretKey}
                      onChange={(e) => {
                        setSecretKey(e.target.value)
                        setFieldErrors((current) => ({ ...current, secretKey: undefined }))
                      }}
                      aria-invalid={Boolean(fieldErrors.secretKey)}
                      aria-describedby={fieldErrors.secretKey ? "replication-secret-key-error" : undefined}
                      placeholder={t("Please enter Secret Key")}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={controlsLocked || !canEditTargetField("credentials.secretKey")}
                    />
                  </FieldContent>
                  <FieldError id="replication-secret-key-error">{fieldErrors.secretKey}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-region">{t("Region")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="replication-region"
                      name="replication-region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      autoComplete="off"
                      placeholder={t("Please enter region")}
                      spellCheck={false}
                      disabled={controlsLocked || !canEditTargetField("region")}
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-storage-class">{t("Storage Class")}</FieldLabel>
                  <FieldContent>
                    <Select
                      value={storageType}
                      onValueChange={(value) => setStorageType(value ?? "")}
                      disabled={controlsLocked}
                    >
                      <SelectTrigger id="replication-storage-class" className="w-full" aria-label={t("Storage Class")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {storageClassOptions.map((option) => (
                          <SelectItem
                            key={option}
                            value={option}
                            disabled={!(capabilities?.storageClasses.supportedWriteClasses ?? []).includes(option)}
                          >
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="replication-prefix">{t("Prefix")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="replication-prefix"
                    name="replication-prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    autoComplete="off"
                    placeholder={t("Please enter prefix")}
                    spellCheck={false}
                    disabled={controlsLocked || !canEditBucketField("Rule.Filter.Prefix")}
                  />
                </FieldContent>
              </Field>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FieldLabel className="text-sm font-medium">{t("Tags")}</FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTag}
                    disabled={controlsLocked || !canAddTag}
                  >
                    <RiAddLine className="size-4" aria-hidden />
                    {t("Add Tag")}
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="space-y-3">
                    {tags.map((tag, index) => (
                      <div key={index} className="grid gap-2 border p-3 md:grid-cols-2 md:items-center md:gap-4">
                        <Input
                          id={`replication-tag-key-${index}`}
                          name={`replication-tag-key-${index}`}
                          aria-label={t("Tag Name")}
                          value={tag.key}
                          onChange={(e) => updateTag(index, "key", e.target.value)}
                          autoComplete="off"
                          placeholder={t("Tag Name")}
                          spellCheck={false}
                          disabled={controlsLocked || !canEditCurrentTagFilter}
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            id={`replication-tag-value-${index}`}
                            name={`replication-tag-value-${index}`}
                            aria-label={t("Tag Value")}
                            value={tag.value}
                            onChange={(e) => updateTag(index, "value", e.target.value)}
                            autoComplete="off"
                            placeholder={t("Tag Value")}
                            className="flex-1"
                            spellCheck={false}
                            disabled={controlsLocked || !canEditCurrentTagFilter}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            aria-label={`${t("Delete")} ${t("Tag Name")} ${index + 1}`}
                            disabled={tags.length === 1 || controlsLocked || !canEditCurrentTagFilter}
                            onClick={() => removeTag(index)}
                          >
                            <RiDeleteBinLine className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="replication-use-tls" className="text-sm font-medium">
                    {t("Use TLS")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t("Enable secure transport when connecting to endpoint.")}
                  </p>
                </div>
                <Switch
                  id="replication-use-tls"
                  name="replication-use-tls"
                  checked={tls}
                  disabled={controlsLocked || !canEditTargetField("secure")}
                  onCheckedChange={(checked) => {
                    setTls(checked)
                    if (!checked) {
                      setTlsMode("verify")
                      setCaCertPem("")
                      setFieldErrors((current) => ({ ...current, caCertPem: undefined }))
                    }
                  }}
                />
              </div>

              {tls ? (
                <div className="space-y-3 border-s-2 border-border ps-4">
                  <Field>
                    <FieldLabel htmlFor="replication-tls-verification">{t("TLS Verification")}</FieldLabel>
                    <FieldContent>
                      <Select
                        value={tlsMode}
                        onValueChange={(value) => {
                          if (value) setTlsMode(value as BucketReplicationTlsMode)
                          setFieldErrors((current) => ({ ...current, caCertPem: undefined }))
                        }}
                        disabled={controlsLocked || !canEditTargetField("skipTlsVerify")}
                      >
                        <SelectTrigger id="replication-tls-verification" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verify">{t("Default certificate verification")}</SelectItem>
                          <SelectItem value="custom-ca">{t("Custom CA certificate")}</SelectItem>
                          <SelectItem value="skip">{t("Skip TLS verification")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>

                  {tlsMode === "custom-ca" ? (
                    <Field>
                      <FieldLabel htmlFor="replication-ca-certificate">{t("Custom CA certificate")}</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id="replication-ca-certificate"
                          name="replication-ca-certificate"
                          value={caCertPem}
                          onChange={(event) => {
                            setCaCertPem(event.target.value)
                            if (event.target.value.trim()) {
                              setFieldErrors((current) => ({ ...current, caCertPem: undefined }))
                            }
                          }}
                          aria-invalid={Boolean(fieldErrors.caCertPem)}
                          aria-describedby={
                            fieldErrors.caCertPem
                              ? "replication-ca-certificate-error"
                              : "replication-ca-certificate-description"
                          }
                          className="min-h-32 font-mono"
                          placeholder="-----BEGIN CERTIFICATE-----"
                          disabled={controlsLocked || !canEditTargetField("caCertPem")}
                          spellCheck={false}
                        />
                      </FieldContent>
                      <p id="replication-ca-certificate-description" className="text-xs text-muted-foreground">
                        {t("Paste the CA certificate in PEM format.")}
                      </p>
                      <FieldError id="replication-ca-certificate-error">{fieldErrors.caCertPem}</FieldError>
                    </Field>
                  ) : null}

                  {tlsMode === "skip" ? (
                    <p
                      role="alert"
                      className="border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive"
                    >
                      {t("Certificate verification is disabled. Only use this for trusted networks.")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="replication-existing-object" className="text-sm font-medium">
                    {t("Replicate Existing Objects")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t("Include objects that already exist in the source bucket.")}
                  </p>
                </div>
                <Switch
                  id="replication-existing-object"
                  name="replication-existing-object"
                  checked={existingObject}
                  onCheckedChange={setExistingObject}
                  disabled={controlsLocked || !canEditBucketField("Rule.ExistingObjectReplication.Status")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="replication-expired-delete-marker" className="text-sm font-medium">
                    {t("Replicate Delete Markers")}
                  </label>
                  <p className="text-xs text-muted-foreground">{t("Sync delete markers to destination bucket.")}</p>
                </div>
                <Switch
                  id="replication-expired-delete-marker"
                  name="replication-expired-delete-marker"
                  checked={expiredDeleteMark}
                  onCheckedChange={setExpiredDeleteMark}
                  disabled={controlsLocked || !canEditBucketField("Rule.DeleteMarkerReplication.Status")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="replication-delete" className="text-sm font-medium">
                    {t("Replicate Delete")}
                  </label>
                  <p className="text-xs text-muted-foreground">{t("Sync delete to destination bucket.")}</p>
                </div>
                <Switch
                  id="replication-delete"
                  name="replication-delete"
                  checked={replicateDelete}
                  onCheckedChange={setReplicateDelete}
                  disabled={controlsLocked || !canEditBucketField("Rule.DeleteReplication.Status")}
                />
              </div>

              {modeType === "async" && (
                <div className="space-y-3">
                  <Field>
                    <FieldLabel htmlFor="replication-health-check-interval">
                      {t("Health Check Interval (seconds)")}
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="replication-health-check-interval"
                        name="replication-health-check-interval"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        autoComplete="off"
                        value={timecheck}
                        onChange={(e) => {
                          setTimecheck(e.target.value)
                          setFieldErrors((current) => ({ ...current, timecheck: undefined }))
                        }}
                        aria-invalid={Boolean(fieldErrors.timecheck)}
                        aria-describedby={fieldErrors.timecheck ? "replication-health-check-interval-error" : undefined}
                        className="w-32"
                        disabled={controlsLocked || !canEditTargetField("healthCheckDuration")}
                      />
                    </FieldContent>
                    <FieldError id="replication-health-check-interval-error">{fieldErrors.timecheck}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="replication-bandwidth-limit">{t("Bandwidth Limit")}</FieldLabel>
                    <FieldContent>
                      <div className="flex items-center gap-2">
                        <Input
                          id="replication-bandwidth-limit"
                          name="replication-bandwidth-limit"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          autoComplete="off"
                          value={bandwidth}
                          onChange={(e) => setBandwidth(Number(e.target.value))}
                          className="w-32"
                          disabled={controlsLocked || !canEditTargetField("bandwidth")}
                        />
                        <Select
                          value={unit}
                          onValueChange={(value) => setUnit(value ?? "")}
                          disabled={controlsLocked || !canEditTargetField("bandwidth")}
                        >
                          <SelectTrigger className="w-28" aria-label={t("Bandwidth Unit")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {unitOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </FieldContent>
                  </Field>
                </div>
              )}

              {bucketHistoricalFields.length || remoteTargetUnsupportedFields.length ? (
                <fieldset className="space-y-3 border-t pt-4">
                  <legend className="text-sm font-medium">{t("Advanced Settings")}</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {bucketHistoricalFields.map((field) => (
                      <div key={field.name} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{field.name}</p>
                        <p className="text-sm">
                          <span className="inline-flex items-center rounded-none border border-dashed px-2 py-1 text-xs text-muted-foreground">
                            {t("Read-only settings")}
                          </span>
                        </p>
                      </div>
                    ))}
                    {remoteTargetUnsupportedFields.map((field) => (
                      <div key={field.name} className="space-y-1">
                        <p className="text-xs text-muted-foreground">{field.name}</p>
                        <p className="text-sm">
                          <span className="inline-flex items-center rounded-none border border-dashed px-2 py-1 text-xs text-muted-foreground">
                            {t("Unsupported")}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </div>
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
            <Button type="submit" className="w-full sm:w-auto" disabled={controlsLocked}>
              {submitting ? t("Saving…") : capabilitiesLoading ? t("Loading") : t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
