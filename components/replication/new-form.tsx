"use client"

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { useBucket } from "@/hooks/use-bucket"
import { useMessage } from "@/lib/feedback/message"
import { getBytes } from "@/lib/functions"

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

export function ReplicationNewForm({ open, onOpenChange, bucketName, onSuccess }: ReplicationNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { setRemoteReplicationTarget, putBucketReplication, getBucketReplication } = useBucket()

  const [level, setLevel] = useState("1")
  const [endpoint, setEndpoint] = useState("")
  const [tls, setTls] = useState(false)
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
  const [submitting, setSubmitting] = useState(false)

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

  const resetForm = useCallback(() => {
    setLevel("1")
    setEndpoint("")
    setTls(false)
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
    if (!endpoint) {
      message.error(t("Please enter endpoint"))
      return false
    }
    if (!bucket) {
      message.error(t("Please enter bucket"))
      return false
    }
    if (!accessKey || !secretKey) {
      message.error(t("Please provide credentials"))
      return false
    }
    if (modeType === "async" && Number(timecheck) < 1) {
      message.error(t("Please enter valid health check interval"))
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    if (!bucketName) {
      message.error(t("Bucket name is required"))
      return
    }
    setSubmitting(true)
    try {
      const config: Record<string, unknown> = {
        sourcebucket: bucketName,
        endpoint,
        credentials: {
          accessKey,
          secretKey,
          expiration: "0001-01-01T00:00:00Z",
        },
        targetbucket: bucket,
        secure: tls,
        region,
        path: "auto",
        api: "s3v4",
        type: "replication",
        replicationSync: modeType === "sync",
        healthCheckDuration: Number(timecheck) || 60,
        disableProxy: false,
        resetBeforeDate: "0001-01-01T00:00:00Z",
        totalDowntime: 0,
        lastOnline: "0001-01-01T00:00:00Z",
        isOnline: false,
        latency: { curr: 0, avg: 0, max: 0 },
        edge: false,
        edgeSyncBeforeExpiry: false,
      }

      if (modeType === "async") {
        config.bandwidth = Number(getBytes(String(bandwidth), unit, true)) || 0
      }

      const targetResponse = (await setRemoteReplicationTarget(bucketName, config)) as string
      if (!targetResponse) {
        return
      }

      let oldConfig: {
        ReplicationConfiguration?: { Rules?: unknown[] }
      } | null = null
      try {
        oldConfig = (await getBucketReplication(bucketName)) as {
          ReplicationConfiguration?: { Rules?: unknown[] }
        }
      } catch {
        oldConfig = null
      }

      const newRule: Record<string, unknown> = {
        ID: `replication-rule-${Date.now()}`,
        Status: "Enabled",
        Priority: parseInt(level) || 1,
        SourceSelectionCriteria: {
          SseKmsEncryptedObjects: { Status: "Enabled" },
        },
        ExistingObjectReplication: {
          Status: existingObject ? "Enabled" : "Disabled",
        },
        DeleteMarkerReplication: {
          Status: expiredDeleteMark ? "Enabled" : "Disabled",
        },
        Destination: {
          Bucket: targetResponse,
          StorageClass: storageType || "STANDARD",
        },
      }

      const validTags = tags.filter((tag) => tag.key && tag.value)
      const filter: Record<string, unknown> = {}

      if (prefix) {
        filter.Prefix = prefix
      }

      if (validTags.length === 1) {
        const [singleTag] = validTags
        if (singleTag) {
          filter.Tag = { Key: singleTag.key, Value: singleTag.value }
        }
      } else if (validTags.length > 1) {
        filter.And = {
          ...(prefix ? { Prefix: prefix } : {}),
          Tags: validTags.map((tag) => ({ Key: tag.key, Value: tag.value })),
        }
        delete filter.Prefix
      }

      if (Object.keys(filter).length > 0) {
        newRule.Filter = filter
      }

      const existingRules = oldConfig?.ReplicationConfiguration?.Rules ?? []
      const payload = {
        Role: targetResponse,
        Rules: [
          ...(existingRules as Array<{ Destination?: { Bucket?: string } }>).filter(
            (rule) => rule.Destination?.Bucket !== targetResponse,
          ),
          newRule,
        ],
      }

      await putBucketReplication(bucketName, payload)
      message.success(t("Create Success"))
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error(error)
      message.error((error as Error).message || t("Save failed"))
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
      <DialogContent
        className="sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {t("Add Replication Rule")} ({t("Bucket")}: {bucketName || ""})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field>
                <FieldLabel>{t("Priority")}</FieldLabel>
                <FieldContent>
                  <Input type="number" min={1} value={level} onChange={(e) => setLevel(e.target.value)} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>{t("Mode")}</FieldLabel>
                <FieldContent>
                  <Select value={modeType} onValueChange={setModeType}>
                    <SelectTrigger className="w-full">
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
                <FieldLabel>{t("Endpoint")}</FieldLabel>
                <FieldContent>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 items-center whitespace-nowrap rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                      {tls ? "https://" : "http://"}
                    </div>
                    <Input
                      className="flex-1"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder={t("Please enter endpoint")}
                    />
                  </div>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>{t("Bucket")}</FieldLabel>
                <FieldContent>
                  <Input
                    value={bucket}
                    onChange={(e) => setBucket(e.target.value)}
                    placeholder={t("Please enter bucket")}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>{t("Access Key")}</FieldLabel>
                <FieldContent>
                  <Input
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder={t("Please enter Access Key")}
                    autoComplete="off"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>{t("Secret Key")}</FieldLabel>
                <FieldContent>
                  <Input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder={t("Please enter Secret Key")}
                    autoComplete="off"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>{t("Region")}</FieldLabel>
                <FieldContent>
                  <Input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder={t("Please enter region")}
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>{t("Storage Class")}</FieldLabel>
                <FieldContent>
                  <Input
                    value={storageType}
                    onChange={(e) => setStorageType(e.target.value)}
                    placeholder={t("Please enter storage class")}
                  />
                </FieldContent>
              </Field>
            </div>

            <Field>
              <FieldLabel>{t("Prefix")}</FieldLabel>
              <FieldContent>
                <Input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder={t("Please enter prefix")}
                />
              </FieldContent>
            </Field>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel className="text-sm font-medium">{t("Tags")}</FieldLabel>
                <Button variant="outline" size="sm" onClick={addTag}>
                  <RiAddLine className="size-4" aria-hidden />
                  {t("Add Tag")}
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="space-y-3">
                  {tags.map((tag, index) => (
                    <div
                      key={index}
                      className="grid gap-2 rounded-md border p-3 md:grid-cols-2 md:items-center md:gap-4"
                    >
                      <Input
                        value={tag.key}
                        onChange={(e) => updateTag(index, "key", e.target.value)}
                        placeholder={t("Tag Name")}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          value={tag.value}
                          onChange={(e) => updateTag(index, "value", e.target.value)}
                          placeholder={t("Tag Value")}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          disabled={tags.length === 1}
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
                <p className="text-sm font-medium">{t("Use TLS")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Enable secure transport when connecting to endpoint.")}
                </p>
              </div>
              <Switch checked={tls} onCheckedChange={setTls} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("Replicate Existing Objects")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Include objects that already exist in the source bucket.")}
                </p>
              </div>
              <Switch checked={existingObject} onCheckedChange={setExistingObject} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("Replicate Delete Markers")}</p>
                <p className="text-xs text-muted-foreground">{t("Sync delete markers to destination bucket.")}</p>
              </div>
              <Switch checked={expiredDeleteMark} onCheckedChange={setExpiredDeleteMark} />
            </div>

            {modeType === "async" && (
              <div className="space-y-3">
                <Field>
                  <FieldLabel>{t("Health Check Interval (seconds)")}</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      min={1}
                      value={timecheck}
                      onChange={(e) => setTimecheck(e.target.value)}
                      className="w-32"
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>{t("Bandwidth Limit")}</FieldLabel>
                  <FieldContent>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={bandwidth}
                        onChange={(e) => setBandwidth(Number(e.target.value))}
                        className="w-32"
                      />
                      <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger className="w-28">
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
