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
import { getBytes } from "@/lib/functions"
import { isMissingBucketConfiguration, normalizeReplicationRulesForRolelessConfig } from "@/lib/bucket-configuration"
import { buildBucketReplicationTlsPayload, type BucketReplicationTlsMode } from "@/lib/bucket-replication-tls"
import { getRuntimeCapabilityFieldState } from "@/lib/runtime-capabilities"

export interface RemoteReplicationTarget {
  arn?: string
  endpoint?: string
  targetbucket?: string
  secure?: boolean
  region?: string
  replicationSync?: boolean
  bandwidth_limit?: number
  healthCheckDuration?: number
  skipTlsVerify?: boolean
  caCertPem?: string
  credentials?: { accessKey?: string }
}

interface Tag {
  key: string
  value: string
}

export interface EditableReplicationRule {
  ID?: string
  Status?: string
  Priority?: number
  Filter?: {
    Prefix?: string
    Tag?: { Key?: string; Value?: string }
    And?: { Prefix?: string; Tags?: { Key?: string; Value?: string }[] }
  }
  ExistingObjectReplication?: { Status?: string }
  DeleteMarkerReplication?: { Status?: string }
  DeleteReplication?: { Status?: string }
  Destination?: { Bucket?: string; StorageClass?: string }
}

interface ReplicationEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketName: string | null
  rule: EditableReplicationRule | null
  target: RemoteReplicationTarget | null
  onSuccess?: () => void
}

const BANDWIDTH_UNITS = ["Gi", "Mi", "Ki"] as const

function bytesToBandwidth(bytes: number | undefined): { bandwidth: number; unit: string } {
  if (!bytes || bytes <= 0) return { bandwidth: 100, unit: "Gi" }
  for (const unit of BANDWIDTH_UNITS) {
    const factor = unit === "Gi" ? 1024 ** 3 : unit === "Mi" ? 1024 ** 2 : 1024
    if (bytes % factor === 0) return { bandwidth: bytes / factor, unit }
  }
  return { bandwidth: Math.max(1, Math.round(bytes / 1024)), unit: "Ki" }
}

function ruleTags(rule: EditableReplicationRule | null): Tag[] {
  const andTags = rule?.Filter?.And?.Tags
  if (andTags?.length) {
    return andTags.map((tag) => ({ key: tag.Key ?? "", value: tag.Value ?? "" }))
  }
  const single = rule?.Filter?.Tag
  if (single?.Key) {
    return [{ key: single.Key, value: single.Value ?? "" }]
  }
  return [{ key: "", value: "" }]
}

export function ReplicationEditForm({
  open,
  onOpenChange,
  bucketName,
  rule,
  target,
  onSuccess,
}: ReplicationEditFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { setRemoteReplicationTarget, putBucketReplication, getBucketReplication } = useBucket()
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
    !requiredTargetFieldsSupported ||
    !target?.arn

  const resetFormFromRule = useCallback(() => {
    setLevel(String(rule?.Priority ?? 1))
    setEndpoint(target?.endpoint ?? "")
    setTls(Boolean(target?.secure))
    setTlsMode(target?.skipTlsVerify ? "skip" : target?.caCertPem ? "custom-ca" : "verify")
    setCaCertPem(target?.caCertPem ?? "")
    setAccessKey(target?.credentials?.accessKey ?? "")
    setSecretKey("")
    setBucket(target?.targetbucket ?? "")
    setRegion(target?.region || "us-east-1")
    setModeType(target?.replicationSync ? "sync" : "async")
    setTimecheck(String(target?.healthCheckDuration || 60))
    const initial = bytesToBandwidth(target?.bandwidth_limit)
    setBandwidth(initial.bandwidth)
    setUnit(initial.unit)
    setStorageType(rule?.Destination?.StorageClass || "STANDARD")
    setPrefix(rule?.Filter?.Prefix ?? rule?.Filter?.And?.Prefix ?? "")
    setTags(ruleTags(rule))
    setExistingObject(rule?.ExistingObjectReplication?.Status === "Enabled")
    setExpiredDeleteMark(rule?.DeleteMarkerReplication?.Status === "Enabled")
    setReplicateDelete(rule?.DeleteReplication?.Status === "Enabled")
    setSubmitting(false)
    setSaveError("")
    setFieldErrors({})
  }, [rule, target])

  useEffect(() => {
    if (open) {
      resetFormFromRule()
    }
  }, [open, resetFormFromRule])

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

  // Field-group change detection, mirroring the server's MinIO-style update ops:
  // only groups that actually changed are sent, and credentials are required
  // only when the connection group ("creds") is being replaced.
  const initialTlsMode: BucketReplicationTlsMode = target?.skipTlsVerify
    ? "skip"
    : target?.caCertPem
      ? "custom-ca"
      : "verify"
  const connectionChanged =
    endpoint !== (target?.endpoint ?? "") ||
    bucket !== (target?.targetbucket ?? "") ||
    tls !== Boolean(target?.secure) ||
    (tls && tlsMode !== initialTlsMode) ||
    (tls && tlsMode === "custom-ca" && caCertPem !== (target?.caCertPem ?? "")) ||
    accessKey !== (target?.credentials?.accessKey ?? "")
  const credsOp = connectionChanged || secretKey !== ""
  const syncOp = (modeType === "sync") !== Boolean(target?.replicationSync)
  const bandwidthOp =
    modeType === "async" && (Number(getBytes(String(bandwidth), unit, true)) || 0) !== (target?.bandwidth_limit ?? 0)

  const validate = () => {
    const errors: typeof fieldErrors = {}
    if (!endpoint) errors.endpoint = t("Please enter endpoint")
    if (!bucket) errors.bucket = t("Please enter bucket")
    if (!accessKey) errors.accessKey = t("Please enter Access Key")
    if (connectionChanged && !secretKey) errors.secretKey = t("Please enter Secret Key")
    if (modeType === "async" && Number(timecheck) < 1) {
      errors.timecheck = t("Please enter valid health check interval")
    }
    if (tls && tlsMode === "custom-ca" && !caCertPem.trim()) {
      errors.caCertPem = t("Custom CA certificate is required")
    }
    setFieldErrors(errors)
    const firstErrorId = errors.endpoint
      ? "replication-edit-endpoint"
      : errors.bucket
        ? "replication-edit-bucket"
        : errors.accessKey
          ? "replication-edit-access-key"
          : errors.secretKey
            ? "replication-edit-secret-key"
            : errors.timecheck
              ? "replication-edit-health-check-interval"
              : errors.caCertPem
                ? "replication-edit-ca-certificate"
                : null
    if (firstErrorId) document.getElementById(firstErrorId)?.focus()
    return !firstErrorId
  }

  const handleSave = async () => {
    if (submitting || controlsLocked) return
    if (!validate()) return
    if (!bucketName || !rule || !target?.arn) {
      message.error(t("Remote target not found for this rule. Refresh and try again."))
      return
    }
    setSubmitting(true)
    setSaveError("")
    let remoteTargetSaved = false
    try {
      const tlsConfig = buildBucketReplicationTlsPayload(tls, tlsMode, caCertPem)
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
        arn: target.arn,
        ...(canEditTargetField("healthCheckDuration") ? { healthCheckDuration: Number(timecheck) || 60 } : {}),
      }
      if (modeType === "async") {
        config.bandwidth = Number(getBytes(String(bandwidth), unit, true)) || 0
      }

      const targetOps = [
        ...(credsOp ? ["creds"] : []),
        ...(syncOp ? ["sync"] : []),
        ...(bandwidthOp ? ["bandwidth"] : []),
      ]
      if (targetOps.length > 0) {
        await setRemoteReplicationTarget(bucketName, config, true, targetOps)
        remoteTargetSaved = true
      }

      const updatedRule: EditableReplicationRule = {
        ...(rule.ID && canEditBucketField("Rule.ID") ? { ID: rule.ID } : {}),
        ...(canEditBucketField("Rule.Status") ? { Status: rule.Status ?? "Enabled" } : {}),
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
          ? { Destination: { Bucket: target.arn, StorageClass: storageType || "STANDARD" } }
          : {}),
      }

      const validTags = tags.filter((tag) => tag.key && tag.value)
      const filter: NonNullable<EditableReplicationRule["Filter"]> = {}
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
        updatedRule.Filter = filter
      }

      let latestConfig: {
        ReplicationConfiguration?: { Role?: string; Rules?: EditableReplicationRule[] }
      } | null = null
      try {
        latestConfig = (await getBucketReplication(bucketName)) as {
          ReplicationConfiguration?: { Role?: string; Rules?: EditableReplicationRule[] }
        }
      } catch (error) {
        if (!isMissingBucketConfiguration(error, "replication")) {
          throw error
        }
      }

      const existingRules = normalizeReplicationRulesForRolelessConfig(
        latestConfig?.ReplicationConfiguration?.Rules ?? [],
        latestConfig?.ReplicationConfiguration?.Role,
      ) as EditableReplicationRule[]
      const matchIndex = rule.ID
        ? existingRules.findIndex((item) => item.ID === rule.ID)
        : existingRules.findIndex((item) => JSON.stringify(item) === JSON.stringify(rule))
      if (matchIndex === -1) {
        throw new Error(t("Configuration changed. Refresh and try again."))
      }
      const nextRules = [...existingRules]
      nextRules[matchIndex] = updatedRule

      await putBucketReplication(bucketName, {
        Role: "",
        Rules: nextRules,
      })
      remoteTargetSaved = false
      message.success(t("Update Success"))
      onSuccess?.()
      onOpenChange(false)
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
  }

  const tlsModeLabels: Record<BucketReplicationTlsMode, string> = {
    verify: t("Default certificate verification"),
    "custom-ca": t("Custom CA certificate"),
    skip: t("Skip TLS verification"),
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
            {t("Edit Replication Rule")} ({t("Bucket")}: {bucketName || ""})
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
                  <FieldLabel htmlFor="replication-edit-priority">{t("Priority")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="replication-edit-priority"
                      name="replication-edit-priority"
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
                        <SelectValue>{modeOptions.find((opt) => opt.value === modeType)?.label ?? null}</SelectValue>
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
                  <FieldLabel htmlFor="replication-edit-endpoint">{t("Endpoint")}</FieldLabel>
                  <FieldContent>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 items-center whitespace-nowrap border border-input bg-muted px-3 text-sm text-muted-foreground">
                        {tls ? "https://" : "http://"}
                      </div>
                      <Input
                        id="replication-edit-endpoint"
                        name="replication-edit-endpoint"
                        className="flex-1"
                        value={endpoint}
                        onChange={(e) => {
                          setEndpoint(e.target.value)
                          setFieldErrors((current) => ({ ...current, endpoint: undefined }))
                        }}
                        aria-invalid={Boolean(fieldErrors.endpoint)}
                        aria-describedby={fieldErrors.endpoint ? "replication-edit-endpoint-error" : undefined}
                        autoComplete="off"
                        placeholder={t("Please enter endpoint")}
                        spellCheck={false}
                        disabled={controlsLocked || !canEditTargetField("endpoint")}
                      />
                    </div>
                  </FieldContent>
                  <FieldError id="replication-edit-endpoint-error">{fieldErrors.endpoint}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-edit-bucket">{t("Bucket")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="replication-edit-bucket"
                      name="replication-edit-bucket"
                      value={bucket}
                      onChange={(e) => {
                        setBucket(e.target.value)
                        setFieldErrors((current) => ({ ...current, bucket: undefined }))
                      }}
                      aria-invalid={Boolean(fieldErrors.bucket)}
                      aria-describedby={fieldErrors.bucket ? "replication-edit-bucket-error" : undefined}
                      autoComplete="off"
                      placeholder={t("Please enter bucket")}
                      spellCheck={false}
                      disabled={controlsLocked || !canEditTargetField("targetbucket")}
                    />
                  </FieldContent>
                  <FieldError id="replication-edit-bucket-error">{fieldErrors.bucket}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-edit-access-key">{t("Access Key")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="replication-edit-access-key"
                      name="replication-edit-access-key"
                      value={accessKey}
                      onChange={(e) => {
                        setAccessKey(e.target.value)
                        setFieldErrors((current) => ({ ...current, accessKey: undefined }))
                      }}
                      aria-invalid={Boolean(fieldErrors.accessKey)}
                      aria-describedby={fieldErrors.accessKey ? "replication-edit-access-key-error" : undefined}
                      placeholder={t("Please enter Access Key")}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={controlsLocked || !canEditTargetField("credentials.accessKey")}
                    />
                  </FieldContent>
                  <FieldError id="replication-edit-access-key-error">{fieldErrors.accessKey}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-edit-secret-key">{t("Secret Key")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="replication-edit-secret-key"
                      name="replication-edit-secret-key"
                      type="password"
                      value={secretKey}
                      onChange={(e) => {
                        setSecretKey(e.target.value)
                        setFieldErrors((current) => ({ ...current, secretKey: undefined }))
                      }}
                      aria-invalid={Boolean(fieldErrors.secretKey)}
                      aria-describedby={
                        fieldErrors.secretKey ? "replication-edit-secret-key-error" : "replication-edit-secret-key-hint"
                      }
                      placeholder={t("Please enter Secret Key")}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={controlsLocked || !canEditTargetField("credentials.secretKey")}
                    />
                  </FieldContent>
                  <p id="replication-edit-secret-key-hint" className="text-xs text-muted-foreground">
                    {t("Leave blank to keep the current credentials.")}
                  </p>
                  <FieldError id="replication-edit-secret-key-error">{fieldErrors.secretKey}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-edit-region">{t("Region")}</FieldLabel>
                  <FieldContent>
                    {/* No region update group exists in the MinIO update contract,
                        so the stored region is shown read-only. */}
                    <Input
                      id="replication-edit-region"
                      name="replication-edit-region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      autoComplete="off"
                      placeholder={t("Please enter region")}
                      spellCheck={false}
                      disabled
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="replication-edit-storage-class">{t("Storage Class")}</FieldLabel>
                  <FieldContent>
                    <Select
                      value={storageType}
                      onValueChange={(value) => setStorageType(value ?? "")}
                      disabled={controlsLocked}
                    >
                      <SelectTrigger
                        id="replication-edit-storage-class"
                        className="w-full"
                        aria-label={t("Storage Class")}
                      >
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
                <FieldLabel htmlFor="replication-edit-prefix">{t("Prefix")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="replication-edit-prefix"
                    name="replication-edit-prefix"
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
                          id={`replication-edit-tag-key-${index}`}
                          name={`replication-edit-tag-key-${index}`}
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
                            id={`replication-edit-tag-value-${index}`}
                            name={`replication-edit-tag-value-${index}`}
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
                  <label htmlFor="replication-edit-use-tls" className="text-sm font-medium">
                    {t("Use TLS")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t("Enable secure transport when connecting to endpoint.")}
                  </p>
                </div>
                <Switch
                  id="replication-edit-use-tls"
                  name="replication-edit-use-tls"
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
                    <FieldLabel htmlFor="replication-edit-tls-verification">{t("TLS Verification")}</FieldLabel>
                    <FieldContent>
                      <Select
                        value={tlsMode}
                        onValueChange={(value) => {
                          if (value) setTlsMode(value as BucketReplicationTlsMode)
                          setFieldErrors((current) => ({ ...current, caCertPem: undefined }))
                        }}
                        disabled={controlsLocked || !canEditTargetField("skipTlsVerify")}
                      >
                        <SelectTrigger id="replication-edit-tls-verification" className="w-full">
                          <SelectValue>{tlsModeLabels[tlsMode]}</SelectValue>
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
                      <FieldLabel htmlFor="replication-edit-ca-certificate">{t("Custom CA certificate")}</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id="replication-edit-ca-certificate"
                          name="replication-edit-ca-certificate"
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
                              ? "replication-edit-ca-certificate-error"
                              : "replication-edit-ca-certificate-description"
                          }
                          className="min-h-32 font-mono"
                          placeholder="-----BEGIN CERTIFICATE-----"
                          disabled={controlsLocked || !canEditTargetField("caCertPem")}
                          spellCheck={false}
                        />
                      </FieldContent>
                      <p id="replication-edit-ca-certificate-description" className="text-xs text-muted-foreground">
                        {t("Paste the CA certificate in PEM format.")}
                      </p>
                      <FieldError id="replication-edit-ca-certificate-error">{fieldErrors.caCertPem}</FieldError>
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
                  <label htmlFor="replication-edit-existing-object" className="text-sm font-medium">
                    {t("Replicate Existing Objects")}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t("Include objects that already exist in the source bucket.")}
                  </p>
                </div>
                <Switch
                  id="replication-edit-existing-object"
                  name="replication-edit-existing-object"
                  checked={existingObject}
                  onCheckedChange={setExistingObject}
                  disabled={controlsLocked || !canEditBucketField("Rule.ExistingObjectReplication.Status")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="replication-edit-expired-delete-marker" className="text-sm font-medium">
                    {t("Replicate Delete Markers")}
                  </label>
                  <p className="text-xs text-muted-foreground">{t("Sync delete markers to destination bucket.")}</p>
                </div>
                <Switch
                  id="replication-edit-expired-delete-marker"
                  name="replication-edit-expired-delete-marker"
                  checked={expiredDeleteMark}
                  onCheckedChange={setExpiredDeleteMark}
                  disabled={controlsLocked || !canEditBucketField("Rule.DeleteMarkerReplication.Status")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="replication-edit-delete" className="text-sm font-medium">
                    {t("Replicate Delete")}
                  </label>
                  <p className="text-xs text-muted-foreground">{t("Sync delete to destination bucket.")}</p>
                </div>
                <Switch
                  id="replication-edit-delete"
                  name="replication-edit-delete"
                  checked={replicateDelete}
                  onCheckedChange={setReplicateDelete}
                  disabled={controlsLocked || !canEditBucketField("Rule.DeleteReplication.Status")}
                />
              </div>

              {modeType === "async" && (
                <div className="space-y-3">
                  <Field>
                    <FieldLabel htmlFor="replication-edit-health-check-interval">
                      {t("Health Check Interval (seconds)")}
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="replication-edit-health-check-interval"
                        name="replication-edit-health-check-interval"
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
                        aria-describedby={
                          fieldErrors.timecheck ? "replication-edit-health-check-interval-error" : undefined
                        }
                        className="w-32"
                        disabled={controlsLocked || !canEditTargetField("healthCheckDuration")}
                      />
                    </FieldContent>
                    <FieldError id="replication-edit-health-check-interval-error">{fieldErrors.timecheck}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="replication-edit-bandwidth-limit">{t("Bandwidth Limit")}</FieldLabel>
                    <FieldContent>
                      <div className="flex items-center gap-2">
                        <Input
                          id="replication-edit-bandwidth-limit"
                          name="replication-edit-bandwidth-limit"
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
                            <SelectValue>{unitOptions.find((opt) => opt.value === unit)?.label ?? null}</SelectValue>
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
