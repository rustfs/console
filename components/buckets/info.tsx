"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiArrowRightSLine, RiCloseLine, RiEdit2Line } from "@remixicon/react"
import { useBucket } from "@/hooks/use-bucket"
import { usePermissions } from "@/hooks/use-permissions"
import { useSSE } from "@/hooks/use-sse"
import { BucketSettingRow, BucketSettingsSection } from "@/components/buckets/settings-layout"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { isMissingBucketConfiguration, type BucketConfigurationKind } from "@/lib/bucket-configuration"
import { stringifyBucketCorsConfig, validateBucketCorsJson, type BucketCorsConfiguration } from "@/lib/bucket-cors"
import { buildModuleBucketPath } from "@/lib/module-bucket-route"
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

type BucketSettingKey = "policy" | "encryption" | "cors" | "tagging" | "objectLock" | "versioning" | "quota"
type BucketMutation = "policy" | "encryption" | "cors" | "tagging" | "versioning" | "quota" | "retention"

const UNAVAILABLE = Symbol("unavailable")

function parseEncryptionLabel(
  enc?: {
    ServerSideEncryptionConfiguration?: {
      Rules?: Array<{ ApplyServerSideEncryptionByDefault?: { SSEAlgorithm?: string } }>
    }
  } | null,
): string {
  if (!enc?.ServerSideEncryptionConfiguration?.Rules?.length) return "-"
  const rule = enc.ServerSideEncryptionConfiguration.Rules[0]
  return rule?.ApplyServerSideEncryptionByDefault?.SSEAlgorithm ?? "-"
}

export function BucketInfo({ bucketName }: BucketInfoProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const bucketApi = useBucket()
  const {
    getBucketPolicy,
    getBucketEncryption,
    getBucketCors,
    getBucketTagging,
    getObjectLockConfiguration,
    getBucketVersioning,
    getBucketQuota,
  } = bucketApi
  const { canCapability } = usePermissions()
  const { getKeyList } = useSSE()
  const bucketContext = React.useMemo(() => ({ bucket: bucketName }), [bucketName])
  const canPutBucketPolicy = canCapability("bucket.policy.put", bucketContext)
  const canDeleteBucketPolicy = canCapability("bucket.policy.delete", bucketContext)
  const canEditBucketPolicy = canPutBucketPolicy || canDeleteBucketPolicy
  const canEditEncryption = canCapability("bucket.encryption.edit", bucketContext)
  const canEditCors = canCapability("bucket.cors.edit", bucketContext)
  const canEditTags = canCapability("bucket.tag.edit", bucketContext)
  const canEditVersioning = canCapability("bucket.versioning.edit", bucketContext)
  const canEditQuota = canCapability("bucket.quota.edit", bucketContext)
  const canEditObjectLock = canCapability("bucket.objectLock.edit", bucketContext)

  const [policy, setPolicy] = React.useState<string | null>(null)
  const [policyType, setPolicyType] = React.useState<BucketPolicyType | "custom">("private")
  const [encryption, setEncryption] = React.useState<Record<string, unknown> | null>(null)
  const [corsConfig, setCorsConfig] = React.useState<BucketCorsConfiguration | null>(null)
  const [tags, setTags] = React.useState<Tag[]>([])
  const [objectLock, setObjectLock] = React.useState<boolean | null>(null)
  const [versioning, setVersioning] = React.useState<string | null>(null)
  const [quotaInfo, setQuotaInfo] = React.useState<QuotaInfo | null>(null)
  const [retentionMode, setRetentionMode] = React.useState<string | null>(null)
  const [retentionPeriod, setRetentionPeriod] = React.useState<number | null>(null)
  const [retentionUnit, setRetentionUnit] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadedBucket, setLoadedBucket] = React.useState<string | null>(null)
  const [readErrors, setReadErrors] = React.useState<Partial<Record<BucketSettingKey, string>>>({})
  const [versionLoading, setVersionLoading] = React.useState(false)
  const [mutation, setMutation] = React.useState<BucketMutation | null>(null)
  const requestVersionRef = React.useRef(0)
  const mutationRef = React.useRef<BucketMutation | null>(null)

  const beginMutation = React.useCallback((next: BucketMutation) => {
    if (mutationRef.current) return false
    mutationRef.current = next
    setMutation(next)
    return true
  }, [])

  const finishMutation = React.useCallback(() => {
    mutationRef.current = null
    setMutation(null)
  }, [])

  const [showPolicyModal, setShowPolicyModal] = React.useState(false)
  const [policyFormPolicy, setPolicyFormPolicy] = React.useState<BucketPolicyType | "custom">("private")
  const [policyFormContent, setPolicyFormContent] = React.useState("{}")
  const [policyFormError, setPolicyFormError] = React.useState("")

  const [showEncryptModal, setShowEncryptModal] = React.useState(false)
  const [encryptFormType, setEncryptFormType] = React.useState("disabled")
  const [encryptFormKmsKeyId, setEncryptFormKmsKeyId] = React.useState("")
  const [kmsKeyOptions, setKmsKeyOptions] = React.useState<{ label: string; value: string }[]>([])
  const [kmsKeyLoading, setKmsKeyLoading] = React.useState(false)
  const [kmsKeyError, setKmsKeyError] = React.useState("")
  const [kmsReloadVersion, setKmsReloadVersion] = React.useState(0)

  const [showCorsModal, setShowCorsModal] = React.useState(false)
  const [corsFormEnabled, setCorsFormEnabled] = React.useState(false)
  const [corsFormContent, setCorsFormContent] = React.useState(stringifyBucketCorsConfig())

  const [showTagModal, setShowTagModal] = React.useState(false)
  const [tagFormKey, setTagFormKey] = React.useState("")
  const [tagFormValue, setTagFormValue] = React.useState("")
  const [editingTagIndex, setEditingTagIndex] = React.useState(-1)

  const [showQuotaModal, setShowQuotaModal] = React.useState(false)
  const [quotaFormEnabled, setQuotaFormEnabled] = React.useState(false)
  const [quotaFormSize, setQuotaFormSize] = React.useState("1")
  const [quotaFormUnit, setQuotaFormUnit] = React.useState("GiB")
  const [quotaFormError, setQuotaFormError] = React.useState("")

  const [showRetentionModal, setShowRetentionModal] = React.useState(false)
  const [retentionFormMode, setRetentionFormMode] = React.useState("GOVERNANCE")
  const [retentionFormUnit, setRetentionFormUnit] = React.useState("Days")
  const [retentionPeriodInput, setRetentionPeriodInput] = React.useState("")
  const [retentionFormError, setRetentionFormError] = React.useState("")
  const [deleteTagIndex, setDeleteTagIndex] = React.useState<number | null>(null)

  const corsValidation = React.useMemo(
    () => (corsFormEnabled ? validateBucketCorsJson(corsFormContent) : { config: null, error: null }),
    [corsFormContent, corsFormEnabled],
  )

  const fetchData = React.useCallback(async () => {
    if (!bucketName) return
    const requestVersion = ++requestVersionRef.current
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        getBucketPolicy(bucketName),
        getBucketEncryption(bucketName),
        getBucketCors(bucketName),
        getBucketTagging(bucketName),
        getObjectLockConfiguration(bucketName),
        getBucketVersioning(bucketName),
        getBucketQuota(bucketName),
      ])
      if (requestVersion !== requestVersionRef.current) return

      const nextErrors: Partial<Record<BucketSettingKey, string>> = {}
      const readSetting = <T,>(
        result: PromiseSettledResult<unknown>,
        key: BucketSettingKey,
        kind: BucketConfigurationKind | null,
        missingValue: T,
      ): T | typeof UNAVAILABLE => {
        if (result.status === "fulfilled" && result.value !== undefined) return result.value as T
        if (result.status === "rejected" && kind && isMissingBucketConfiguration(result.reason, kind)) {
          return missingValue
        }
        nextErrors[key] = t("Unable to load this setting. Refresh before making changes.")
        return UNAVAILABLE
      }

      const p = readSetting<Record<string, unknown> | null>(results[0], "policy", "policy", null)
      const e = readSetting<Record<string, unknown> | null>(results[1], "encryption", "encryption", null)
      const corsResp = readSetting<BucketCorsConfiguration | null>(results[2], "cors", "cors", null)
      const tagResp = readSetting<{ TagSet?: Array<{ Key?: string; Value?: string }> } | null>(
        results[3],
        "tagging",
        "tagging",
        null,
      )
      const lockResp = readSetting<Record<string, unknown> | null>(results[4], "objectLock", "objectLock", null)
      const verResp = readSetting<{ Status?: string } | null>(results[5], "versioning", null, null)
      const quotaResp = readSetting<QuotaInfo | null>(results[6], "quota", "quota", null)

      if (p !== UNAVAILABLE) {
        const policyStr = (p as { Policy?: string } | null)?.Policy ?? null
        setPolicy(policyStr)

        if (policyStr) {
          try {
            const parsed = JSON.parse(policyStr) as { Statement?: unknown[] }
            const detected = detectBucketPolicy(
              (parsed.Statement ?? []) as Parameters<typeof detectBucketPolicy>[0],
              bucketName,
              "",
            )
            setPolicyType(detected === "none" ? "custom" : detected)
          } catch {
            setPolicyType("custom")
          }
        } else {
          setPolicyType("private")
        }
      }

      if (e !== UNAVAILABLE) setEncryption(e)
      if (corsResp !== UNAVAILABLE) {
        setCorsConfig((corsResp?.CORSRules?.length ?? 0) > 0 ? corsResp : null)
      }
      if (tagResp !== UNAVAILABLE) {
        setTags(
          tagResp?.TagSet?.map((x) => ({
            Key: x.Key ?? "",
            Value: x.Value ?? "",
          })) ?? [],
        )
      }

      if (lockResp !== UNAVAILABLE) {
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
      }

      if (verResp !== UNAVAILABLE) setVersioning(verResp?.Status ?? null)
      if (quotaResp !== UNAVAILABLE) setQuotaInfo(quotaResp)
      setReadErrors(nextErrors)
      setLoadedBucket(bucketName)
    } finally {
      if (requestVersion === requestVersionRef.current) setLoading(false)
    }
  }, [
    bucketName,
    getBucketCors,
    getBucketEncryption,
    getBucketPolicy,
    getBucketQuota,
    getBucketTagging,
    getBucketVersioning,
    getObjectLockConfiguration,
    t,
  ])

  React.useEffect(() => {
    setShowPolicyModal(false)
    setShowEncryptModal(false)
    setShowCorsModal(false)
    setShowTagModal(false)
    setShowQuotaModal(false)
    setShowRetentionModal(false)
    setDeleteTagIndex(null)
    mutationRef.current = null
    setMutation(null)
    fetchData()
    return () => {
      requestVersionRef.current += 1
    }
  }, [fetchData])

  const openPolicyModal = () => {
    if (!canEditBucketPolicy || readErrors.policy || loading || mutation) return
    setPolicyFormPolicy(policyType)
    setPolicyFormContent(policy ?? "{}")
    setPolicyFormError("")
    setShowPolicyModal(true)
  }

  const submitPolicy = async () => {
    if (policyFormPolicy === "custom") {
      try {
        const parsed = JSON.parse(policyFormContent) as unknown
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error()
      } catch {
        setPolicyFormError(t("Policy format is invalid. Please check the JSON syntax."))
        document.getElementById("bucket-policy-content")?.focus()
        return
      }
    }
    setPolicyFormError("")
    if (!beginMutation("policy")) return
    try {
      if (policyFormPolicy === "private" && !canDeleteBucketPolicy) {
        message.error(t("Edit Failed"))
        return
      }
      if (policyFormPolicy !== "private" && !canPutBucketPolicy) {
        message.error(t("Edit Failed"))
        return
      }

      if (policyFormPolicy === "private") {
        await bucketApi.deleteBucketPolicy(bucketName)
      } else if (policyFormPolicy === "custom") {
        JSON.parse(policyFormContent)
        await bucketApi.putBucketPolicy(bucketName, policyFormContent)
      } else {
        const statements = setBucketPolicy([], policyFormPolicy as BucketPolicyType, bucketName, "")
        await bucketApi.putBucketPolicy(bucketName, JSON.stringify({ Version: "2012-10-17", Statement: statements }))
      }
      message.success(t("Edit Success"))
      setShowPolicyModal(false)
      await fetchData()
    } catch (err) {
      message.error(`${t("Edit Failed")}: ${(err as Error).message}`)
    } finally {
      finishMutation()
    }
  }

  const openEncryptModal = () => {
    if (!canEditEncryption || readErrors.encryption || loading || mutation) return
    setKmsKeyError("")
    setKmsKeyOptions([])
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
    if (!showEncryptModal || encryptFormType !== "SSE-KMS") return

    let cancelled = false
    setKmsKeyLoading(true)
    setKmsKeyError("")
    getKeyList()
      .then((keys) => {
        if (cancelled) return
        const list =
          (keys as { keys?: Array<{ key_id?: string; tags?: { name?: string }; description?: string }> })?.keys ?? []
        setKmsKeyOptions(
          list.map((k) => ({
            label: k.tags?.name ?? k.description ?? `Key-${(k.key_id ?? "").slice(0, 24)}`,
            value: k.key_id ?? "",
          })),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setKmsKeyOptions([])
          setKmsKeyError(t("Failed to load key list"))
        }
      })
      .finally(() => {
        if (!cancelled) setKmsKeyLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [showEncryptModal, encryptFormType, getKeyList, kmsReloadVersion, t])

  const submitEncrypt = async () => {
    if (encryptFormType === "SSE-KMS" && (kmsKeyLoading || kmsKeyError)) return
    if (!beginMutation("encryption")) return
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
    } finally {
      finishMutation()
    }
  }

  const openCorsModal = () => {
    if (!canEditCors || readErrors.cors || loading || mutation) return
    setCorsFormEnabled(Boolean(corsConfig?.CORSRules?.length))
    setCorsFormContent(stringifyBucketCorsConfig(corsConfig))
    setShowCorsModal(true)
  }

  const submitCors = async () => {
    if (!canEditCors) return
    if (!beginMutation("cors")) return

    try {
      if (!corsFormEnabled) {
        if (corsConfig?.CORSRules?.length) {
          await bucketApi.deleteBucketCors(bucketName)
        }
      } else {
        if (corsValidation.error || !corsValidation.config) {
          message.error(corsValidation.error ?? t("Invalid CORS configuration"))
          return
        }

        await bucketApi.putBucketCors(bucketName, corsValidation.config)
      }

      message.success(t("Edit Success"))
      setShowCorsModal(false)
      await fetchData()
    } catch (err) {
      message.error(`${t("Edit Failed")}: ${(err as Error).message}`)
    } finally {
      finishMutation()
    }
  }

  const openTagModal = (index = -1) => {
    if (!canEditTags || readErrors.tagging || loading || mutation) return
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
    if (!canEditTags) return
    if (!tagFormKey.trim() || !tagFormValue.trim()) {
      message.error(t("Please fill in complete tag information"))
      return
    }
    if (!beginMutation("tagging")) return
    try {
      const latestResponse = await getBucketTagging(bucketName).catch((error: unknown) => {
        if (isMissingBucketConfiguration(error, "tagging")) return null
        throw error
      })
      const latest = latestResponse?.TagSet?.map((item) => ({ Key: item.Key ?? "", Value: item.Value ?? "" })) ?? []
      const nextKey = tagFormKey.trim()
      const nextValue = tagFormValue.trim()
      const editingTag = editingTagIndex >= 0 ? tags[editingTagIndex] : null

      if (editingTag) {
        const matches = latest.filter((item) => item.Key === editingTag.Key)
        if (matches.length !== 1) throw new Error(t("Configuration changed. Refresh and try again."))
        if (nextKey !== editingTag.Key && latest.some((item) => item.Key === nextKey)) {
          throw new Error(t("Tag key already exists"))
        }
      } else if (latest.some((item) => item.Key === nextKey)) {
        throw new Error(t("Tag key already exists"))
      }

      const next = editingTag
        ? latest.map((item) => (item.Key === editingTag.Key ? { Key: nextKey, Value: nextValue } : item))
        : [...latest, { Key: nextKey, Value: nextValue }]
      await bucketApi.putBucketTagging(bucketName, { TagSet: next })
      message.success(t("Tag Update Success"))
      setShowTagModal(false)
      await fetchData()
    } catch (err) {
      message.error(`${t("Tag Update Failed")}: ${(err as Error).message}`)
    } finally {
      finishMutation()
    }
  }

  const confirmDeleteTag = async () => {
    if (!canEditTags) return
    if (deleteTagIndex === null) return
    if (!beginMutation("tagging")) return
    try {
      const target = tags[deleteTagIndex]
      if (!target) throw new Error(t("Configuration changed. Refresh and try again."))
      const latestResponse = await getBucketTagging(bucketName)
      const latest = latestResponse?.TagSet?.map((item) => ({ Key: item.Key ?? "", Value: item.Value ?? "" })) ?? []
      const matches = latest.filter((item) => item.Key === target.Key)
      if (matches.length !== 1) throw new Error(t("Configuration changed. Refresh and try again."))
      const next = latest.filter((item) => item.Key !== target.Key)
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
    } finally {
      finishMutation()
    }
  }

  const handleVersionToggle = async (enabled: boolean) => {
    if (!canEditVersioning || readErrors.versioning || readErrors.objectLock || loading) return
    if (!beginMutation("versioning")) return
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
      finishMutation()
    }
  }

  const openQuotaModal = () => {
    if (!canEditQuota || readErrors.quota || loading || mutation) return
    setQuotaFormError("")
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
    if (!canEditQuota) return
    const parsedQuota = Number(getBytes(quotaFormSize, quotaFormUnit))
    if (quotaFormEnabled && (!Number.isSafeInteger(parsedQuota) || parsedQuota <= 0)) {
      setQuotaFormError(t("Enter a valid positive quota."))
      document.getElementById("bucket-quota-size")?.focus()
      return
    }
    setQuotaFormError("")
    if (!beginMutation("quota")) return
    try {
      if (!quotaFormEnabled) {
        await bucketApi.deleteBucketQuota(bucketName)
      } else {
        await bucketApi.putBucketQuota(bucketName, {
          quota: parsedQuota,
          quota_type: "HARD",
        })
      }
      message.success(t("Edit Success"))
      setShowQuotaModal(false)
      await fetchData()
    } catch (err) {
      message.error(`${t("Edit Failed")}: ${(err as Error).message}`)
    } finally {
      finishMutation()
    }
  }

  const openRetentionModal = () => {
    if (!canEditObjectLock || readErrors.objectLock || loading || mutation) return
    if (!objectLock) {
      message.error(t("Object lock is not enabled, cannot set retention"))
      return
    }
    setRetentionFormMode(retentionMode ?? "GOVERNANCE")
    setRetentionFormUnit(retentionUnit ?? "Days")
    setRetentionPeriodInput(retentionPeriod != null ? String(retentionPeriod) : "")
    setRetentionFormError("")
    setShowRetentionModal(true)
  }

  const submitRetention = async () => {
    if (!canEditObjectLock) return
    const mode = retentionFormMode
    const unit = retentionFormUnit
    const period = Number(retentionPeriodInput)
    if (!Number.isSafeInteger(period) || period <= 0) {
      setRetentionFormError(t("Please fill in complete retention information"))
      document.getElementById("bucket-retention-period")?.focus()
      return
    }
    setRetentionFormError("")
    if (!beginMutation("retention")) return
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
    } finally {
      finishMutation()
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

  const encryptionLabel = parseEncryptionLabel(encryption as Parameters<typeof parseEncryptionLabel>[0])
  const corsRules = corsConfig?.CORSRules ?? []
  const corsMethods = Array.from(new Set(corsRules.flatMap((rule) => rule.AllowedMethods ?? [])))
  const corsOrigins = Array.from(new Set(corsRules.flatMap((rule) => rule.AllowedOrigins ?? [])))
  const initialLoading = loading && loadedBucket !== bucketName
  const readErrorProps = (key: BucketSettingKey) =>
    readErrors[key]
      ? {
          error: readErrors[key],
          errorTitle: t("Configuration unavailable"),
          retryLabel: t("Refresh"),
          onRetry: loading ? undefined : fetchData,
        }
      : {}
  const settingsNav = [
    { href: "#access-sharing", label: t("Access & Sharing") },
    { href: "#data-protection", label: t("Data Protection") },
    { href: "#capacity-metadata", label: t("Capacity & Metadata") },
    { href: "#automation", label: t("Automation") },
  ]

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
        <Spinner className="size-8 text-muted-foreground" aria-label={t("Loading")} />
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
      <nav aria-label={t("Jump to section")} className="lg:sticky lg:top-24 lg:self-start">
        <div className="flex gap-1 overflow-x-auto border bg-muted/20 p-1 lg:flex-col lg:overflow-visible">
          {settingsNav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="min-w-0 max-w-5xl space-y-8" aria-busy={loading || mutation !== null}>
        <BucketSettingsSection
          id="access-sharing"
          title={t("Access & Sharing")}
          description={t("Control who can access this bucket and which browser origins are allowed.")}
        >
          <BucketSettingRow
            title={t("Access Policy")}
            description={t("Controls anonymous and authenticated access to objects in this bucket.")}
            status={readErrors.policy ? t("Unavailable") : policyLabel}
            statusVariant={readErrors.policy ? "destructive" : policyType === "public" ? "destructive" : "outline"}
            action={
              canEditBucketPolicy ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPolicyModal}
                  disabled={Boolean(readErrors.policy) || loading || mutation !== null}
                  aria-label={`${t("Edit")} ${t("Access Policy")}`}
                >
                  <RiEdit2Line className="size-4" aria-hidden />
                  {t("Edit")}
                </Button>
              ) : null
            }
            {...readErrorProps("policy")}
          />
          <BucketSettingRow
            title={t("Bucket CORS")}
            description={t("Controls which web origins can send cross-origin requests to this bucket.")}
            status={readErrors.cors ? t("Unavailable") : corsRules.length > 0 ? t("Configured") : t("Not configured")}
            statusVariant={readErrors.cors ? "destructive" : corsRules.length > 0 ? "secondary" : "outline"}
            action={
              canEditCors ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCorsModal}
                  disabled={Boolean(readErrors.cors) || loading || mutation !== null}
                  aria-label={`${t("Edit")} ${t("Bucket CORS")}`}
                >
                  <RiEdit2Line className="size-4" aria-hidden />
                  {t("Edit")}
                </Button>
              ) : null
            }
            {...readErrorProps("cors")}
          >
            {!readErrors.cors && corsRules.length > 0 ? (
              <dl className="grid gap-x-6 gap-y-2 pt-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">{t("CORS Rules")}</dt>
                  <dd className="tabular-nums">{corsRules.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Allowed Methods")}</dt>
                  <dd>{corsMethods.join(", ") || "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">{t("Allowed Origins")}</dt>
                  <dd className="break-all">{corsOrigins.slice(0, 2).join(", ") || "-"}</dd>
                </div>
              </dl>
            ) : null}
          </BucketSettingRow>
        </BucketSettingsSection>

        <BucketSettingsSection
          id="data-protection"
          title={t("Data Protection")}
          description={t("Manage encryption, versioning, object lock, and default retention.")}
        >
          <BucketSettingRow
            title={t("Encryption")}
            description={t("Encrypts new objects at rest by default.")}
            status={
              readErrors.encryption ? t("Unavailable") : encryptionLabel === "-" ? t("Not configured") : encryptionLabel
            }
            statusVariant={readErrors.encryption ? "destructive" : encryptionLabel === "-" ? "outline" : "secondary"}
            action={
              canEditEncryption ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openEncryptModal}
                  disabled={Boolean(readErrors.encryption) || loading || mutation !== null}
                  aria-label={`${t("Edit")} ${t("Encryption")}`}
                >
                  <RiEdit2Line className="size-4" aria-hidden />
                  {t("Edit")}
                </Button>
              ) : null
            }
            {...readErrorProps("encryption")}
          />
          <BucketSettingRow
            title={t("Versioning")}
            description={
              (objectLock ?? false)
                ? t("Versioning stays enabled while Object Lock is active.")
                : t("Keep previous object versions and recover from overwrites or deletes.")
            }
            status={readErrors.versioning ? t("Unavailable") : versioning === "Enabled" ? t("Enabled") : t("Disabled")}
            statusVariant={readErrors.versioning ? "destructive" : versioning === "Enabled" ? "secondary" : "outline"}
            action={
              canEditVersioning ? (
                <div className="flex min-h-9 items-center gap-2">
                  <Switch
                    id="bucket-info-versioning"
                    checked={versioning === "Enabled"}
                    disabled={
                      Boolean(readErrors.versioning || readErrors.objectLock) ||
                      (objectLock ?? false) ||
                      versionLoading ||
                      loading ||
                      mutation !== null
                    }
                    onCheckedChange={handleVersionToggle}
                    aria-label={t("Versioning")}
                    aria-describedby="bucket-info-versioning-description"
                  />
                  {versionLoading ? (
                    <Spinner className="size-4 text-muted-foreground" aria-label={t("Loading")} />
                  ) : null}
                </div>
              ) : null
            }
            {...readErrorProps("versioning")}
          >
            <span id="bucket-info-versioning-description" className="sr-only">
              {(objectLock ?? false)
                ? t("Versioning stays enabled while Object Lock is active.")
                : t("Versioning can be suspended but existing versions are preserved.")}
            </span>
          </BucketSettingRow>
          <BucketSettingRow
            title={t("Object Lock")}
            description={t("Protects object versions from deletion during a retention period.")}
            status={readErrors.objectLock ? t("Unavailable") : objectLock ? t("Enabled") : t("Disabled")}
            statusVariant={readErrors.objectLock ? "destructive" : objectLock ? "secondary" : "outline"}
            {...readErrorProps("objectLock")}
          />
          <BucketSettingRow
            title={t("Retention")}
            description={
              !objectLock && !readErrors.objectLock
                ? t("Requires Object Lock")
                : t("Sets the default retention mode and period for new object versions.")
            }
            status={readErrors.objectLock ? t("Unavailable") : retentionMode ? t("Enabled") : t("Not configured")}
            statusVariant={readErrors.objectLock ? "destructive" : retentionMode ? "secondary" : "outline"}
            action={
              canEditObjectLock ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openRetentionModal}
                  disabled={Boolean(readErrors.objectLock) || !objectLock || loading || mutation !== null}
                  aria-label={`${t("Edit")} ${t("Retention")}`}
                >
                  <RiEdit2Line className="size-4" aria-hidden />
                  {t("Edit")}
                </Button>
              ) : null
            }
          >
            {!readErrors.objectLock && retentionMode ? (
              <dl className="grid gap-x-6 gap-y-2 pt-1 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">{t("Retention Mode")}</dt>
                  <dd>{t(retentionMode)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Retention Period")}</dt>
                  <dd className="tabular-nums">{retentionPeriod ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Retention Unit")}</dt>
                  <dd>{retentionUnit ? t(retentionUnit) : "-"}</dd>
                </div>
              </dl>
            ) : null}
          </BucketSettingRow>
        </BucketSettingsSection>

        <BucketSettingsSection
          id="capacity-metadata"
          title={t("Capacity & Metadata")}
          description={t("Set a storage limit and organize this bucket with tags.")}
        >
          <BucketSettingRow
            title={t("Bucket Quota")}
            description={t("Limits the total data stored in this bucket.")}
            status={readErrors.quota ? t("Unavailable") : quotaInfo?.quota ? t("Enabled") : t("Disabled")}
            statusVariant={readErrors.quota ? "destructive" : quotaInfo?.quota ? "secondary" : "outline"}
            action={
              canEditQuota ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openQuotaModal}
                  disabled={Boolean(readErrors.quota) || loading || mutation !== null}
                  aria-label={`${t("Edit")} ${t("Bucket Quota")}`}
                >
                  <RiEdit2Line className="size-4" aria-hidden />
                  {t("Edit")}
                </Button>
              ) : null
            }
            {...readErrorProps("quota")}
          >
            {!readErrors.quota && quotaInfo?.quota ? (
              <dl className="grid gap-x-6 gap-y-2 pt-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">{t("Quota Size")}</dt>
                  <dd className="tabular-nums">{formatBytes(quotaInfo.quota)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("Usage")}</dt>
                  <dd className="tabular-nums">
                    {formatBytes(quotaInfo.size)} ({((quotaInfo.size / quotaInfo.quota) * 100).toFixed(1)}%)
                  </dd>
                </div>
              </dl>
            ) : null}
          </BucketSettingRow>
          <BucketSettingRow
            title={t("Tags")}
            description={t("Add key-value metadata for organization and automation.")}
            status={readErrors.tagging ? t("Unavailable") : tags.length > 0 ? t("Configured") : t("Not configured")}
            statusVariant={readErrors.tagging ? "destructive" : tags.length > 0 ? "secondary" : "outline"}
            action={
              canEditTags ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openTagModal()}
                  disabled={Boolean(readErrors.tagging) || loading || mutation !== null}
                >
                  <RiAddLine className="size-4" aria-hidden />
                  {t("Add Tag")}
                </Button>
              ) : null
            }
            {...readErrorProps("tagging")}
          >
            {!readErrors.tagging && tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2 pt-1" aria-label={t("Tags")}>
                {tags.map((tag, index) => (
                  <li key={`${tag.Key}-${index}`} className="flex max-w-full items-center border bg-muted/40 text-xs">
                    <button
                      type="button"
                      className="min-h-10 min-w-0 break-all px-3 text-start hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:no-underline"
                      onClick={() => openTagModal(index)}
                      disabled={!canEditTags || mutation !== null}
                      aria-label={`${t("Edit")} ${t("Tag")}: ${tag.Key}:${tag.Value}`}
                    >
                      {tag.Key}:{tag.Value}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="min-h-10 min-w-10"
                      onClick={() => setDeleteTagIndex(index)}
                      disabled={!canEditTags || mutation !== null}
                      aria-label={`${t("Delete Tag")}: ${tag.Key}:${tag.Value}`}
                    >
                      <RiCloseLine className="size-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : !readErrors.tagging ? (
              <p className="text-sm text-muted-foreground">{t("No tags")}</p>
            ) : null}
          </BucketSettingRow>
        </BucketSettingsSection>

        <BucketSettingsSection
          id="automation"
          title={t("Automation")}
          description={t("Configure event delivery, object lifecycle, and replication rules.")}
        >
          {[
            {
              label: t("Events"),
              description: t("Send notifications when objects change."),
              href: buildModuleBucketPath("/events", bucketName),
            },
            {
              label: t("Lifecycle"),
              description: t("Transition or expire objects automatically."),
              href: buildModuleBucketPath("/lifecycle", bucketName),
            },
            {
              label: t("Bucket Replication"),
              description: t("Copy objects to another bucket or site."),
              href: buildModuleBucketPath("/replication", bucketName),
            },
          ].map((item) => (
            <BucketSettingRow
              key={item.href}
              title={item.label}
              description={item.description}
              action={
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href={item.href} />}>
                  <span>{`${t("Open")} ${item.label}`}</span>
                  <RiArrowRightSLine className="size-4" aria-hidden />
                </Button>
              }
            />
          ))}
        </BucketSettingsSection>
      </div>

      {/* Policy Modal */}
      <Dialog open={showPolicyModal} onOpenChange={(open) => !mutation && setShowPolicyModal(open)}>
        <DialogContent
          className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-xl"
          showCloseButton={!mutation}
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{t("Set Policy")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-1">
            <Field>
              <FieldLabel htmlFor="bucket-policy-type">{t("Policy")}</FieldLabel>
              <FieldContent>
                <Select
                  value={policyFormPolicy}
                  onValueChange={(v) => {
                    setPolicyFormPolicy(v as BucketPolicyType | "custom")
                    setPolicyFormError("")
                  }}
                >
                  <SelectTrigger id="bucket-policy-type" className="w-full" aria-label={t("Policy")}>
                    <SelectValue placeholder={t("Please select policy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{t("Public")}</SelectItem>
                    <SelectItem value="private">{t("Private")}</SelectItem>
                    <SelectItem value="custom">{t("Custom")}</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
              <FieldDescription>
                {policyFormPolicy === "public"
                  ? t("Public access can expose objects to anyone allowed by the policy. Review it before saving.")
                  : policyFormPolicy === "private"
                    ? t("Removes the bucket policy. IAM and credential-based access still apply.")
                    : t("Uses the JSON policy below. Invalid statements can block access.")}
              </FieldDescription>
            </Field>
            {policyFormPolicy === "public" ? (
              <Alert variant="destructive">
                <AlertTitle>{t("Public")}</AlertTitle>
                <AlertDescription>
                  {t("Public access can expose objects to anyone allowed by the policy. Review it before saving.")}
                </AlertDescription>
              </Alert>
            ) : null}
            {policyFormPolicy === "custom" && (
              <Field>
                <FieldLabel htmlFor="bucket-policy-content">{t("Policy Content")}</FieldLabel>
                <FieldContent>
                  <div className="max-h-[60vh] overflow-y-auto border p-2">
                    <Textarea
                      id="bucket-policy-content"
                      name="bucket-policy-content"
                      value={policyFormContent}
                      onChange={(e) => {
                        setPolicyFormContent(e.target.value)
                        setPolicyFormError("")
                      }}
                      className="min-h-[200px] font-mono text-xs"
                      spellCheck={false}
                      aria-invalid={Boolean(policyFormError)}
                      aria-describedby={policyFormError ? "bucket-policy-error" : undefined}
                    />
                  </div>
                </FieldContent>
                <FieldError id="bucket-policy-error">{policyFormError || undefined}</FieldError>
              </Field>
            )}
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setShowPolicyModal(false)} disabled={mutation === "policy"}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitPolicy} disabled={mutation !== null}>
              {mutation === "policy" ? <Spinner className="size-4" aria-label={t("Loading")} /> : null}
              {t("Save Policy")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Encryption Modal */}
      <Dialog open={showEncryptModal} onOpenChange={(open) => !mutation && setShowEncryptModal(open)}>
        <DialogContent
          className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-md"
          showCloseButton={!mutation}
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{t("Enable Storage Encryption")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-1">
            <Field>
              <FieldLabel htmlFor="bucket-encryption-type">{t("Encryption Type")}</FieldLabel>
              <FieldContent>
                <Select value={encryptFormType} onValueChange={(value) => setEncryptFormType(value ?? "")}>
                  <SelectTrigger id="bucket-encryption-type" className="w-full" aria-label={t("Encryption Type")}>
                    <SelectValue placeholder={t("Please select encryption type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">{t("Disabled")}</SelectItem>
                    <SelectItem value="SSE-KMS">SSE-KMS</SelectItem>
                    <SelectItem value="SSE-S3">SSE-S3</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
              <FieldDescription>
                {encryptFormType === "disabled"
                  ? t("Future uploads to this bucket will not be encrypted by default.")
                  : encryptFormType === "SSE-KMS"
                    ? t("Uses the selected KMS key to encrypt new objects.")
                    : t("Uses server-managed keys to encrypt new objects.")}
              </FieldDescription>
            </Field>
            {encryptFormType === "disabled" ? (
              <Alert variant="destructive">
                <AlertTitle>{t("Disabled")}</AlertTitle>
                <AlertDescription>
                  {t("Future uploads to this bucket will not be encrypted by default.")}
                </AlertDescription>
              </Alert>
            ) : null}
            {encryptFormType === "SSE-KMS" && (
              <Field>
                <FieldLabel htmlFor="bucket-encryption-kms-key">KMS Key ID</FieldLabel>
                <FieldContent>
                  <Select value={encryptFormKmsKeyId} onValueChange={(value) => setEncryptFormKmsKeyId(value ?? "")}>
                    <SelectTrigger
                      id="bucket-encryption-kms-key"
                      className="w-full"
                      aria-label="KMS Key ID"
                      disabled={kmsKeyLoading || Boolean(kmsKeyError)}
                    >
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
                {kmsKeyLoading ? <FieldDescription>{t("Loading")}</FieldDescription> : null}
                {!kmsKeyLoading && !kmsKeyError && kmsKeyOptions.length === 0 ? (
                  <FieldDescription>{t("No Data")}</FieldDescription>
                ) : null}
                {kmsKeyError ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t("Failed to load key list")}</AlertTitle>
                    <AlertDescription>{t("Refresh to try again.")}</AlertDescription>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setKmsReloadVersion((value) => value + 1)}
                    >
                      {t("Refresh")}
                    </Button>
                  </Alert>
                ) : null}
              </Field>
            )}
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setShowEncryptModal(false)} disabled={mutation === "encryption"}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={submitEncrypt}
              disabled={
                mutation !== null ||
                (encryptFormType === "SSE-KMS" && (kmsKeyLoading || Boolean(kmsKeyError) || !encryptFormKmsKeyId))
              }
            >
              {mutation === "encryption" ? <Spinner className="size-4" aria-label={t("Loading")} /> : null}
              {t("Save Encryption")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CORS Modal */}
      <Dialog open={showCorsModal} onOpenChange={(open) => !mutation && setShowCorsModal(open)}>
        <DialogContent
          className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-2xl"
          showCloseButton={!mutation}
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{t("Set Bucket CORS")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-1">
            <Field className="flex items-center justify-between">
              <FieldLabel htmlFor="bucket-info-cors-enabled">{t("Bucket CORS")}</FieldLabel>
              <FieldContent className="flex justify-end">
                <Switch id="bucket-info-cors-enabled" checked={corsFormEnabled} onCheckedChange={setCorsFormEnabled} />
              </FieldContent>
            </Field>
            {corsFormEnabled ? (
              <Field>
                <FieldLabel htmlFor="bucket-cors-content">{t("CORS Configuration")}</FieldLabel>
                <FieldContent>
                  <div className="max-h-[60vh] overflow-y-auto border p-2">
                    <Textarea
                      id="bucket-cors-content"
                      name="bucket-cors-content"
                      value={corsFormContent}
                      onChange={(e) => setCorsFormContent(e.target.value)}
                      className="min-h-[260px] font-mono text-xs"
                      spellCheck={false}
                      aria-invalid={Boolean(corsValidation.error)}
                      aria-describedby="bucket-cors-validation"
                    />
                  </div>
                </FieldContent>
                <FieldDescription>
                  {t('CORS JSON must be an array of rules or an object with a "CORSRules" array.')}
                </FieldDescription>
                {corsValidation.error ? (
                  <FieldDescription id="bucket-cors-validation" role="alert" className="text-destructive">
                    {corsValidation.error}
                  </FieldDescription>
                ) : (
                  <FieldDescription id="bucket-cors-validation">{t("CORS JSON validation passed")}</FieldDescription>
                )}
              </Field>
            ) : (
              <FieldDescription>
                {t("Disable Bucket CORS to remove the current cross-origin configuration.")}
              </FieldDescription>
            )}
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setShowCorsModal(false)} disabled={mutation === "cors"}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={submitCors}
              disabled={mutation !== null || (corsFormEnabled && Boolean(corsValidation.error))}
            >
              {mutation === "cors" ? <Spinner className="size-4" aria-label={t("Loading")} /> : null}
              {t("Save CORS")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Modal */}
      <Dialog open={showTagModal} onOpenChange={(open) => !mutation && setShowTagModal(open)}>
        <DialogContent
          className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-md"
          showCloseButton={!mutation}
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{t("Set Tag")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-1">
            <Field>
              <FieldLabel htmlFor="bucket-tag-key">{t("Tag Key")}</FieldLabel>
              <FieldContent>
                <Input
                  id="bucket-tag-key"
                  name="bucket-tag-key"
                  value={tagFormKey}
                  onChange={(e) => setTagFormKey(e.target.value)}
                  autoComplete="off"
                  placeholder={t("Tag Key Placeholder")}
                  spellCheck={false}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="bucket-tag-value">{t("Tag Value")}</FieldLabel>
              <FieldContent>
                <Input
                  id="bucket-tag-value"
                  name="bucket-tag-value"
                  value={tagFormValue}
                  onChange={(e) => setTagFormValue(e.target.value)}
                  autoComplete="off"
                  placeholder={t("Please enter tag value")}
                  spellCheck={false}
                />
              </FieldContent>
            </Field>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setShowTagModal(false)} disabled={mutation === "tagging"}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitTag} disabled={mutation !== null || !tagFormKey.trim() || !tagFormValue.trim()}>
              {mutation === "tagging" ? <Spinner className="size-4" aria-label={t("Loading")} /> : null}
              {editingTagIndex >= 0 ? t("Save Tag") : t("Add Tag")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quota Modal */}
      <Dialog open={showQuotaModal} onOpenChange={(open) => !mutation && setShowQuotaModal(open)}>
        <DialogContent
          className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-md"
          showCloseButton={!mutation}
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{t("Set Bucket Quota")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-1">
            <Field className="flex items-center justify-between">
              <FieldLabel htmlFor="bucket-info-quota-enabled">{t("Bucket Quota")}</FieldLabel>
              <FieldContent className="flex justify-end">
                <Switch
                  id="bucket-info-quota-enabled"
                  checked={quotaFormEnabled}
                  onCheckedChange={setQuotaFormEnabled}
                />
              </FieldContent>
            </Field>
            {quotaFormEnabled && (
              <div className="space-y-4 border-t pt-4">
                <Field>
                  <FieldLabel htmlFor="bucket-quota-size">{t("Quota Size")}</FieldLabel>
                  <FieldContent>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="bucket-quota-size"
                        name="bucket-quota-size"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        aria-invalid={Boolean(quotaFormError)}
                        aria-describedby={quotaFormError ? "bucket-quota-error" : undefined}
                        value={quotaFormSize}
                        onChange={(e) => {
                          setQuotaFormSize(e.target.value)
                          setQuotaFormError("")
                        }}
                        className="sm:w-32"
                      />
                      <RadioGroup
                        value={quotaFormUnit}
                        onValueChange={setQuotaFormUnit}
                        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                        aria-label={t("Quota Unit")}
                      >
                        {["MiB", "GiB", "TiB", "PiB"].map((u) => (
                          <label
                            key={u}
                            htmlFor={`bucket-info-quota-unit-${u.toLowerCase()}`}
                            className={cn("flex items-start gap-3 border border-border/50 p-3 cursor-pointer")}
                          >
                            <RadioGroupItem
                              id={`bucket-info-quota-unit-${u.toLowerCase()}`}
                              value={u}
                              className="mt-0.5"
                            />
                            <span className="text-sm font-medium">{u}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </FieldContent>
                  <FieldError id="bucket-quota-error">{quotaFormError || undefined}</FieldError>
                </Field>
              </div>
            )}
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setShowQuotaModal(false)} disabled={mutation === "quota"}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitQuota} disabled={mutation !== null}>
              {mutation === "quota" ? <Spinner className="size-4" aria-label={t("Loading")} /> : null}
              {t("Save Quota")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retention Modal */}
      <Dialog open={showRetentionModal} onOpenChange={(open) => !mutation && setShowRetentionModal(open)}>
        <DialogContent
          className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-0 sm:max-w-md"
          showCloseButton={!mutation}
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{t("Set Retention")}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-1">
            <Field>
              <FieldLabel>{t("Retention Mode")}</FieldLabel>
              <FieldContent>
                <RadioGroup
                  value={retentionFormMode}
                  onValueChange={setRetentionFormMode}
                  className="grid gap-2 sm:grid-cols-2"
                  aria-label={t("Retention Mode")}
                >
                  {[
                    {
                      value: "COMPLIANCE",
                      label: t("COMPLIANCE"),
                      description: t("Retention cannot be shortened or bypassed until it expires."),
                    },
                    {
                      value: "GOVERNANCE",
                      label: t("GOVERNANCE"),
                      description: t("Authorized users can bypass or shorten retention when necessary."),
                    },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`bucket-info-retention-mode-${opt.value.toLowerCase()}`}
                      className="flex items-start gap-3 border border-border/50 p-3 cursor-pointer"
                    >
                      <RadioGroupItem
                        id={`bucket-info-retention-mode-${opt.value.toLowerCase()}`}
                        value={opt.value}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{opt.label}</span>
                        <span className="mt-1 block text-xs leading-4 text-muted-foreground">{opt.description}</span>
                      </span>
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
                  aria-label={t("Retention Unit")}
                >
                  {[
                    { value: "Days", label: t("DAYS") },
                    { value: "Years", label: t("YEARS") },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`bucket-info-retention-unit-${opt.value.toLowerCase()}`}
                      className="flex items-start gap-3 border border-border/50 p-3 cursor-pointer"
                    >
                      <RadioGroupItem
                        id={`bucket-info-retention-unit-${opt.value.toLowerCase()}`}
                        value={opt.value}
                        className="mt-0.5"
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="bucket-retention-period">{t("Retention Period")}</FieldLabel>
              <FieldContent>
                <Input
                  id="bucket-retention-period"
                  name="bucket-retention-period"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  aria-invalid={Boolean(retentionFormError)}
                  aria-describedby={retentionFormError ? "bucket-retention-error" : undefined}
                  value={retentionPeriodInput}
                  onChange={(e) => {
                    setRetentionPeriodInput(e.target.value)
                    setRetentionFormError("")
                  }}
                />
              </FieldContent>
              <FieldError id="bucket-retention-error">{retentionFormError || undefined}</FieldError>
            </Field>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setShowRetentionModal(false)} disabled={mutation === "retention"}>
              {t("Cancel")}
            </Button>
            <Button onClick={submitRetention} disabled={mutation !== null || !retentionPeriodInput}>
              {mutation === "retention" ? <Spinner className="size-4" aria-label={t("Loading")} /> : null}
              {t("Save Retention")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tag Confirm */}
      <AlertDialog
        open={deleteTagIndex !== null}
        onOpenChange={(open) => !open && !mutation && setDeleteTagIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Warning")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Delete Tag Confirm")}
              {deleteTagIndex !== null && tags[deleteTagIndex]
                ? ` ${tags[deleteTagIndex].Key}:${tags[deleteTagIndex].Value}`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation === "tagging"}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault()
                await confirmDeleteTag()
              }}
              disabled={mutation !== null}
            >
              {mutation === "tagging" ? <Spinner className="size-4" aria-label={t("Loading")} /> : null}
              {t("Delete Tag")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
