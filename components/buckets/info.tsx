"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiCloseLine, RiEdit2Line } from "@remixicon/react"
import { useBucket } from "@/hooks/use-bucket"
import { useSSE } from "@/hooks/use-sse"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
  ItemActions,
} from "@/components/ui/item"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useMessage } from "@/lib/feedback/message"
import { formatBytes, getBytes } from "@/lib/functions"
import { detectBucketPolicy, setBucketPolicy, type BucketPolicyType } from "@/lib/bucket-policy"
import { cn } from "@/lib/utils"

interface BucketInfoProps {
  bucketName: string
}

interface Tag {
  Key: string
  Value: string
}

interface QuotaInfo {
  quota: number | null
  size: number
  quota_type: string
}

function parseEncryptionLabel(
  enc?: {
    ServerSideEncryptionConfiguration?: { Rules?: Array<{ ApplyServerSideEncryptionByDefault?: { SSEAlgorithm?: string } }> }
  } | null
): string {
  if (!enc?.ServerSideEncryptionConfiguration?.Rules?.length) return "-"
  const rule = enc.ServerSideEncryptionConfiguration.Rules[0]
  return rule?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm ?? "-"
}

export function BucketInfo({ bucketName }: BucketInfoProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const bucketApi = useBucket()
  const { getKeyList } = useSSE()

  const [policy, setPolicy] = React.useState<string | null>(null)
  const [policyType, setPolicyType] = React.useState<BucketPolicyType | "custom">("private")
  const [encryption, setEncryption] = React.useState<Record<string, unknown> | null>(null)
  const [tags, setTags] = React.useState<Tag[]>([])
  const [objectLock, setObjectLock] = React.useState<boolean | null>(null)
  const [versioning, setVersioning] = React.useState<string | null>(null)
  const [quotaInfo, setQuotaInfo] = React.useState<QuotaInfo | null>(null)
  const [retentionMode, setRetentionMode] = React.useState<string | null>(null)
  const [retentionPeriod, setRetentionPeriod] = React.useState<number | null>(null)
  const [retentionUnit, setRetentionUnit] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [versionLoading, setVersionLoading] = React.useState(false)
  const [objectLockLoading, setObjectLockLoading] = React.useState(false)

  const [showPolicyModal, setShowPolicyModal] = React.useState(false)
  const [policyFormPolicy, setPolicyFormPolicy] = React.useState<BucketPolicyType | "custom">("private")
  const [policyFormContent, setPolicyFormContent] = React.useState("{}")

  const [showEncryptModal, setShowEncryptModal] = React.useState(false)
  const [encryptFormType, setEncryptFormType] = React.useState("disabled")
  const [encryptFormKmsKeyId, setEncryptFormKmsKeyId] = React.useState("")
  const [kmsKeyOptions, setKmsKeyOptions] = React.useState<{ label: string; value: string }[]>([])

  const [showTagModal, setShowTagModal] = React.useState(false)
  const [tagFormKey, setTagFormKey] = React.useState("")
  const [tagFormValue, setTagFormValue] = React.useState("")
  const [editingTagIndex, setEditingTagIndex] = React.useState(-1)

  const [showQuotaModal, setShowQuotaModal] = React.useState(false)
  const [quotaFormEnabled, setQuotaFormEnabled] = React.useState(false)
  const [quotaFormSize, setQuotaFormSize] = React.useState("1")
  const [quotaFormUnit, setQuotaFormUnit] = React.useState("GiB")

  const [showRetentionModal, setShowRetentionModal] = React.useState(false)
  const [retentionFormMode, setRetentionFormMode] = React.useState("GOVERNANCE")
  const [retentionFormUnit, setRetentionFormUnit] = React.useState("Days")
  const [retentionPeriodInput, setRetentionPeriodInput] = React.useState("")
  const [deleteTagIndex, setDeleteTagIndex] = React.useState<number | null>(null)

  const fetchData = React.useCallback(async () => {
    if (!bucketName) return
    setLoading(true)
    try {
      const [p, e, tagResp, lockResp, verResp, quotaResp] = await Promise.all([
        bucketApi.getBucketPolicy(bucketName).catch(() => null),
        bucketApi.getBucketEncryption(bucketName).catch(() => null),
        bucketApi.getBucketTagging(bucketName).catch(() => null),
        bucketApi.getObjectLockConfiguration(bucketName).catch(() => null),
        bucketApi.getBucketVersioning(bucketName).catch(() => null),
        bucketApi.getBucketQuota(bucketName).catch(() => null),
      ])

      const policyStr = (p as { Policy?: string })?.Policy ?? null
      setPolicy(policyStr)

      if (policyStr) {
        try {
          const parsed = JSON.parse(policyStr) as { Statement?: unknown[] }
          const detected = detectBucketPolicy(
            (parsed.Statement ?? []) as Parameters<typeof detectBucketPolicy>[0],
            bucketName,
            ""
          )
          setPolicyType(detected === "none" ? "custom" : detected)
        } catch {
          setPolicyType("custom")
        }
      } else {
        setPolicyType("private")
      }

      setEncryption(e as unknown as Record<string, unknown>)
      setTags(
        (tagResp as { TagSet?: Array<{ Key?: string; Value?: string }> })?.TagSet?.map((x) => ({
          Key: x.Key ?? "",
          Value: x.Value ?? "",
        })) ?? []
      )

      const lockCfg = lockResp as {
        ObjectLockConfiguration?: {
          ObjectLockEnabled?: string
          Rule?: { DefaultRetention?: { Mode?: string; Days?: number; Years?: number } }
        }
      }
      const lockEnabled = lockCfg?.ObjectLockConfiguration?.ObjectLockEnabled === "Enabled"
      setObjectLock(lockEnabled)

      if (lockEnabled) {
        const rule = lockCfg?.ObjectLockConfiguration?.Rule?.DefaultRetention
        if (rule) {
          setRetentionMode(rule.Mode ?? null)
          setRetentionPeriod(rule.Days ?? rule.Years ?? null)
          setRetentionUnit(rule.Years ? "Years" : rule.Days ? "Days" : null)
        } else {
          setRetentionMode(null)
          setRetentionPeriod(null)
          setRetentionUnit(null)
        }
      } else {
        setRetentionMode(null)
        setRetentionPeriod(null)
        setRetentionUnit(null)
      }

      setVersioning((verResp as { Status?: string })?.Status ?? null)
      setQuotaInfo(quotaResp as QuotaInfo | null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bucketApi methods are stable
  }, [bucketName])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const openPolicyModal = () => {
    setPolicyFormPolicy(policyType)
    setPolicyFormContent(policy ?? "{}")
    setShowPolicyModal(true)
  }

  const submitPolicy = async () => {
    try {
      if (policyFormPolicy === "custom") {
        JSON.parse(policyFormContent)
        await bucketApi.putBucketPolicy(bucketName, policyFormContent)
      } else {
        const statements = setBucketPolicy(
          [],
          policyFormPolicy as BucketPolicyType,
          bucketName,
          ""
        )
        await bucketApi.putBucketPolicy(
          bucketName,
          JSON.stringify({ Version: "2012-10-17", Statement: statements })
        )
      }
      message.success(t("Edit Success"))
      setShowPolicyModal(false)
      await fetchData()
    } catch (err) {
      message.error(`${t("Edit Failed")}: ${(err as Error).message}`)
    }
  }

  const openEncryptModal = async () => {
    const enc = encryption as {
      ServerSideEncryptionConfiguration?: {
        Rules?: Array<{
          ApplyServerSideEncryptionByDefault?: { SSEAlgorithm?: string; KMSMasterKeyID?: string }
        }>
      }
    }
    const rule = enc?.ServerSideEncryptionConfiguration?.Rules?.[0]?.ApplyServerSideEncryptionByDefault
    if (rule?.SSEAlgorithm === "aws:kms") {
      setEncryptFormType("SSE-KMS")
      setEncryptFormKmsKeyId(rule.KMSMasterKeyID ?? "")
    } else if (rule?.SSEAlgorithm === "AES256") {
      setEncryptFormType("SSE-S3")
      setEncryptFormKmsKeyId("")
    } else {
      setEncryptFormType("disabled")
      setEncryptFormKmsKeyId("")
    }
    setShowEncryptModal(true)
  }

  React.useEffect(() => {
    if (showEncryptModal && encryptFormType === "SSE-KMS") {
      getKeyList()
        .then((keys) => {
          const list = (keys as { keys?: Array<{ key_id?: string; tags?: { name?: string }; description?: string }> })?.keys ?? []
          setKmsKeyOptions(
            list.map((k) => ({
              label: k.tags?.name ?? k.description ?? `Key-${(k.key_id ?? "").slice(0, 8)}`,
              value: k.key_id ?? "",
            }))
          )
        })
        .catch(() => setKmsKeyOptions([]))
    }
  }, [showEncryptModal, encryptFormType, getKeyList])

  const submitEncrypt = async () => {
    try {
      if (encryptFormType === "disabled") {
        await bucketApi.deleteBucketEncryption(bucketName)
      } else if (encryptFormType === "SSE-KMS") {
        if (!encryptFormKmsKeyId) {
          message.error(t("Please select a KMS key for SSE-KMS encryption"))
          return
        }
        await bucketApi.putBucketEncryption(bucketName, {
          Rules: [
            {
              ApplyServerSideEncryptionByDefault: {
                SSEAlgorithm: "aws:kms",
                KMSMasterKeyID: encryptFormKmsKeyId,
              },
            },
          ],
        })
      } else {
        await bucketApi.putBucketEncryption(bucketName, {
          Rules: [
            {
              ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" },
            },
          ],
        })
      }
      message.success(t("Edit Success"))
      setShowEncryptModal(false)
      await fetchData()
    } catch (err) {
      message.error(`${t("Edit Failed")}: ${(err as Error).message}`)
    }
  }

  const openTagModal = (index = -1) => {
    setEditingTagIndex(index)
    if (index >= 0 && tags[index]) {
      setTagFormKey(tags[index].Key)
      setTagFormValue(tags[index].Value)
    } else {
      setTagFormKey("")
      setTagFormValue("")
    }
    setShowTagModal(true)
  }

  const submitTag = async () => {
    if (!tagFormKey.trim() || !tagFormValue.trim()) {
      message.error(t("Please fill in complete tag information"))
      return
    }
    const next = [...tags]
    if (editingTagIndex >= 0) {
      next[editingTagIndex] = { Key: tagFormKey.trim(), Value: tagFormValue.trim() }
    } else {
      next.push({ Key: tagFormKey.trim(), Value: tagFormValue.trim() })
    }
    try {
      await bucketApi.putBucketTagging(bucketName, { TagSet: next })
      message.success(t("Tag Update Success"))
      setShowTagModal(false)
      await fetchData()
    } catch (err) {
      message.error(`${t("Tag Update Failed")}: ${(err as Error).message}`)
    }
  }

  const confirmDeleteTag = async () => {
    if (deleteTagIndex === null) return
    const next = tags.filter((_, i) => i !== deleteTagIndex)
    try {
      if (next.length === 0) {
        await bucketApi.deleteBucketTagging(bucketName)
      } else {
        await bucketApi.putBucketTagging(bucketName, { TagSet: next })
      }
      message.success(t("Tag Update Success"))
      setDeleteTagIndex(null)
      await fetchData()
    } catch (err) {
      message.error(t("Tag Delete Failed", { error: (err as Error).message }))
    }
  }

  const handleVersionToggle = async (enabled: boolean) => {
    setVersionLoading(true)
    const prev = versioning
    try {
      await bucketApi.putBucketVersioning(bucketName, enabled ? "Enabled" : "Suspended")
      setVersioning(enabled ? "Enabled" : "Suspended")
      message.success(t("Edit Success"))
    } catch (err) {
      setVersioning(prev)
      message.error(`${t("Edit Failed")}: ${(err as Error).message}`)
    } finally {
      setVersionLoading(false)
    }
  }

  const openQuotaModal = () => {
    if (quotaInfo?.quota && quotaInfo.quota > 0) {
      const bytes = quotaInfo.quota
      const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]
      let l = Math.floor(Math.log(bytes) / Math.log(1024)) || 0
      if (l < 2) l = 2
      if (l > 5) l = 5
      const value = bytes / 1024 ** l
      setQuotaFormEnabled(true)
      setQuotaFormSize(value.toFixed(0))
      setQuotaFormUnit(units[l])
    } else {
      setQuotaFormEnabled(false)
      setQuotaFormSize("1")
      setQuotaFormUnit("GiB")
    }
    setShowQuotaModal(true)
  }

  const submitQuota = async () => {
    try {
      if (!quotaFormEnabled) {
        await bucketApi.deleteBucketQuota(bucketName)
      } else {
        await bucketApi.putBucketQuota(bucketName, {
          quota: Number.parseInt(getBytes(quotaFormSize, quotaFormUnit), 10),
          quota_type: "HARD",
        })
      }
      message.success(t("Edit Success"))
      setShowQuotaModal(false)
      await fetchData()
    } catch (err) {
      message.error(`${t("Edit Failed")}: ${(err as Error).message}`)
    }
  }

  const openRetentionModal = () => {
    if (!objectLock) {
      message.error(t("Object lock is not enabled, cannot set retention"))
      return
    }
    setRetentionFormMode(retentionMode ?? "GOVERNANCE")
    setRetentionFormUnit(retentionUnit ?? "Days")
    setRetentionPeriodInput(retentionPeriod != null ? String(retentionPeriod) : "")
    setShowRetentionModal(true)
  }

  const submitRetention = async () => {
    const mode = retentionFormMode
    const unit = retentionFormUnit
    const period = retentionPeriodInput ? Math.max(1, Number.parseInt(retentionPeriodInput, 10) || 1) : null
    if (!period) {
      message.error(t("Please fill in complete retention information"))
      return
    }
    try {
      await bucketApi.putObjectLockConfiguration(bucketName, {
        ObjectLockEnabled: "Enabled",
        Rule: {
          DefaultRetention: {
            Mode: mode,
            Days: unit === "Days" ? period : undefined,
            Years: unit === "Years" ? period : undefined,
          },
        },
      })
      message.success(t("Edit Success"))
      setShowRetentionModal(false)
      await fetchData()
    } catch (err) {
      message.error(`${t("Edit Failed")}: ${(err as Error).message}`)
    }
  }

  const policyLabel =
    policyType === "custom"
      ? t("Custom")
      : policyType === "public"
        ? t("Public")
        : policyType === "private"
          ? t("Private")
          : policyType

  const encryptionLabel = parseEncryptionLabel(
    encryption as Parameters<typeof parseEncryptionLabel>[0]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ItemGroup className="space-y-4">
        {/* Access Policy */}
        <Item variant="outline" className="flex-col items-stretch gap-4">
          <ItemHeader className="items-center">
            <ItemTitle>{t("Access Policy")}</ItemTitle>
            <ItemActions>
              <Button variant="outline" size="sm" className="shrink-0" onClick={openPolicyModal}>
                <RiEdit2Line className="mr-2 size-4" />
                {t("Edit")}
              </Button>
            </ItemActions>
          </ItemHeader>
          <ItemContent>
            <ItemDescription className="text-sm">{policyLabel}</ItemDescription>
          </ItemContent>
        </Item>

        {/* Encryption */}
        <Item variant="outline" className="flex-col items-stretch gap-4">
          <ItemHeader className="items-start">
            <div className="flex flex-col gap-1">
              <ItemTitle>{t("Encryption")}</ItemTitle>
              <ItemDescription className="text-xs text-muted-foreground">
                {encryptionLabel}
              </ItemDescription>
            </div>
            <ItemActions>
              <Button variant="outline" size="sm" className="shrink-0" onClick={openEncryptModal}>
                <RiEdit2Line className="mr-2 size-4" />
                {t("Edit")}
              </Button>
            </ItemActions>
          </ItemHeader>
        </Item>

        {/* Tag */}
        <Item variant="outline" className="flex-col items-stretch gap-4">
          <ItemHeader className="items-center">
            <ItemTitle>{t("Tag")}</ItemTitle>
            <ItemActions>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => openTagModal()}>
                <RiAddLine className="mr-2 size-4" />
                {t("Add")}
              </Button>
            </ItemActions>
          </ItemHeader>
          <ItemContent>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <div
                    key={`${tag.Key}-${index}`}
                    className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs"
                  >
                    <button
                      type="button"
                      className="text-left hover:underline"
                      onClick={() => openTagModal(index)}
                    >
                      {tag.Key}:{tag.Value}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setDeleteTagIndex(index)}
                    >
                      <RiCloseLine className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <ItemDescription className="text-sm">{t("No Data")}</ItemDescription>
            )}
          </ItemContent>
        </Item>

        {/* Object Lock & Version Control */}
        <Item variant="outline" className="flex-col items-stretch gap-4">
          <ItemHeader>
            <ItemActions>
              {objectLockLoading && (
                <Spinner className="size-3 text-muted-foreground" />
              )}
            </ItemActions>
          </ItemHeader>
          <ItemContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{t("Object Lock")}</p>
              <Switch checked={objectLock ?? false} disabled />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{t("Version Control")}</p>
                {versionLoading && (
                  <Spinner className="size-3 text-muted-foreground" />
                )}
              </div>
              <Switch
                checked={versioning === "Enabled"}
                disabled={(objectLock ?? false) || versionLoading}
                onCheckedChange={handleVersionToggle}
              />
            </div>
          </ItemContent>
        </Item>

        {/* Bucket Quota */}
        <Item variant="outline" className="flex-col items-stretch gap-4">
          <ItemHeader className="items-start">
            <div>
              <ItemTitle>{t("Bucket Quota")}</ItemTitle>
              <ItemDescription className="text-xs text-muted-foreground">
                {quotaInfo?.quota ? t("Enabled") : t("Disabled")}
              </ItemDescription>
            </div>
            <ItemActions>
              <Button variant="outline" size="sm" className="shrink-0" onClick={openQuotaModal}>
                {t("Edit")}
              </Button>
            </ItemActions>
          </ItemHeader>
          {quotaInfo?.quota ? (
            <ItemContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t("Quota Size")}</p>
                  <p className="text-sm text-foreground">
                    {formatBytes(quotaInfo.quota)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("Usage")}</p>
                  <p className="text-sm text-foreground">
                    {formatBytes(quotaInfo.size)} (
                    {((quotaInfo.size / quotaInfo.quota) * 100).toFixed(1)}%)
                  </p>
                </div>
              </div>
            </ItemContent>
          ) : null}
        </Item>

        {/* Retention */}
        <Item variant="outline" className="flex-col items-stretch gap-4">
          <ItemHeader className="items-start">
            <div>
              <ItemTitle>{t("Retention")}</ItemTitle>
              <ItemDescription className="text-xs text-muted-foreground">
                {retentionMode ? t("Enabled") : t("Disabled")}
              </ItemDescription>
            </div>
            <ItemActions>
              <Button variant="outline" size="sm" className="shrink-0" onClick={openRetentionModal}>
                {t("Edit")}
              </Button>
            </ItemActions>
          </ItemHeader>
          <ItemContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">{t("Retention Mode")}</p>
                <p className="text-sm text-foreground">
                  {retentionMode ? t(retentionMode) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("Retention Unit")}</p>
                <p className="text-sm text-foreground">
                  {retentionUnit ? t(retentionUnit) : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("Retention Period")}</p>
                <p className="text-sm text-foreground">{retentionPeriod ?? "-"}</p>
              </div>
            </div>
          </ItemContent>
        </Item>
      </ItemGroup>

      {/* Policy Modal */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="sm:max-w-xl" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t("Set Policy")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel>{t("Policy")}</FieldLabel>
              <FieldContent>
                <Select
                  value={policyFormPolicy}
                  onValueChange={(v) => setPolicyFormPolicy(v as BucketPolicyType | "custom")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("Please select policy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{t("Public")}</SelectItem>
                    <SelectItem value="private">{t("Private")}</SelectItem>
                    <SelectItem value="custom">{t("Custom")}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            {policyFormPolicy === "custom" && (
              <Field>
                <FieldLabel>{t("Policy Content")}</FieldLabel>
                <FieldContent>
                  <div className="max-h-[60vh] overflow-y-auto rounded-md border p-2">
                    <Textarea
                      value={policyFormContent}
                      onChange={(e) => setPolicyFormContent(e.target.value)}
                      className="min-h-[200px] font-mono text-xs"
                    />
                  </div>
                </FieldContent>
              </Field>
            )}
          </div>
          <DialogFooter showCloseButton>
            <Button variant="outline" onClick={() => setShowPolicyModal(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitPolicy}>{t("Confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Encryption Modal */}
      <Dialog open={showEncryptModal} onOpenChange={setShowEncryptModal}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t("Enable Storage Encryption")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel>{t("Encryption Type")}</FieldLabel>
              <FieldContent>
                <Select value={encryptFormType} onValueChange={setEncryptFormType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("Please select encryption type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">{t("Disabled")}</SelectItem>
                    <SelectItem value="SSE-KMS">SSE-KMS</SelectItem>
                    <SelectItem value="SSE-S3">SSE-S3</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            {encryptFormType === "SSE-KMS" && (
              <Field>
                <FieldLabel>KMS Key ID</FieldLabel>
                <FieldContent>
                  <Select value={encryptFormKmsKeyId} onValueChange={setEncryptFormKmsKeyId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("Please select KMS key")} />
                    </SelectTrigger>
                    <SelectContent>
                      {kmsKeyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            )}
          </div>
          <DialogFooter showCloseButton>
            <Button variant="outline" onClick={() => setShowEncryptModal(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitEncrypt}>{t("Confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Modal */}
      <Dialog open={showTagModal} onOpenChange={setShowTagModal}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t("Set Tag")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel>{t("Tag Key")}</FieldLabel>
              <FieldContent>
                <Input
                  value={tagFormKey}
                  onChange={(e) => setTagFormKey(e.target.value)}
                  placeholder={t("Tag Key Placeholder")}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>{t("Tag Value")}</FieldLabel>
              <FieldContent>
                <Input
                  value={tagFormValue}
                  onChange={(e) => setTagFormValue(e.target.value)}
                  placeholder={t("Please enter tag value")}
                />
              </FieldContent>
            </Field>
          </div>
          <DialogFooter showCloseButton>
            <Button variant="outline" onClick={() => setShowTagModal(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitTag}>{t("Confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quota Modal */}
      <Dialog open={showQuotaModal} onOpenChange={setShowQuotaModal}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t("Set Bucket Quota")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field className="flex items-center justify-between">
              <FieldLabel>{t("Bucket Quota")}</FieldLabel>
              <FieldContent className="flex justify-end">
                <Switch checked={quotaFormEnabled} onCheckedChange={setQuotaFormEnabled} />
              </FieldContent>
            </Field>
            {quotaFormEnabled && (
              <div className="space-y-4 rounded-lg border p-4">
                <Field>
                  <FieldLabel>{t("Quota Size")}</FieldLabel>
                  <FieldContent>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="number"
                        value={quotaFormSize}
                        onChange={(e) => setQuotaFormSize(e.target.value)}
                        className="sm:w-32"
                      />
                      <RadioGroup
                        value={quotaFormUnit}
                        onValueChange={setQuotaFormUnit}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                      >
                        {["MiB", "GiB", "TiB", "PiB"].map((u) => (
                          <label
                            key={u}
                            className={cn(
                              "flex items-start gap-3 rounded-md border border-border/50 p-3 cursor-pointer"
                            )}
                          >
                            <RadioGroupItem value={u} className="mt-0.5" />
                            <span className="text-sm font-medium">{u}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </FieldContent>
                </Field>
              </div>
            )}
          </div>
          <DialogFooter showCloseButton>
            <Button variant="outline" onClick={() => setShowQuotaModal(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitQuota}>{t("Confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retention Modal */}
      <Dialog open={showRetentionModal} onOpenChange={setShowRetentionModal}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t("Set Retention")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel>{t("Retention Mode")}</FieldLabel>
              <FieldContent>
                <RadioGroup
                  value={retentionFormMode}
                  onValueChange={setRetentionFormMode}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {[
                    { value: "COMPLIANCE", label: t("COMPLIANCE") },
                    { value: "GOVERNANCE", label: t("GOVERNANCE") },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-start gap-3 rounded-md border border-border/50 p-3 cursor-pointer"
                    >
                      <RadioGroupItem value={opt.value} className="mt-0.5" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>{t("Retention Unit")}</FieldLabel>
              <FieldContent>
                <RadioGroup
                  value={retentionFormUnit}
                  onValueChange={setRetentionFormUnit}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  {[
                    { value: "Days", label: t("DAYS") },
                    { value: "Years", label: t("YEARS") },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-start gap-3 rounded-md border border-border/50 p-3 cursor-pointer"
                    >
                      <RadioGroupItem value={opt.value} className="mt-0.5" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>{t("Retention Period")}</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  value={retentionPeriodInput}
                  onChange={(e) => setRetentionPeriodInput(e.target.value)}
                />
              </FieldContent>
            </Field>
          </div>
          <DialogFooter showCloseButton>
            <Button variant="outline" onClick={() => setShowRetentionModal(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitRetention}>{t("Confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tag Confirm */}
      <AlertDialog open={deleteTagIndex !== null} onOpenChange={(open) => !open && setDeleteTagIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Warning")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Delete Tag Confirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault()
                await confirmDeleteTag()
              }}
            >
              {t("Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
