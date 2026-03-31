"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiArrowLeftSLine, RiArrowRightSLine, RiRefreshLine } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSSE } from "@/hooks/use-sse"
import { useMessage } from "@/lib/feedback/message"
import type { KmsConfigPayload, KmsKeyInfo, KmsKeyMetadata, KmsServiceStatusResponse } from "@/types/kms"
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

const KEY_LIST_LIMIT = 20
const DEFAULT_PENDING_DELETE_DAYS = 7

type ConfigFormState = {
  backendType: "local" | "vault"
  keyDir: string
  filePermissions: string
  defaultKeyId: string
  timeoutSeconds: string
  retryAttempts: string
  enableCache: boolean
  maxCachedKeys: string
  cacheTtlSeconds: string
  address: string
  vaultToken: string
  namespace: string
  mountPath: string
  kvMount: string
  keyPathPrefix: string
  skipTlsVerify: boolean
}

type KeyActionState = {
  type: "scheduleDelete" | "forceDelete" | "cancelDeletion"
  key: KmsKeyInfo
} | null

const INITIAL_FORM_STATE: ConfigFormState = {
  backendType: "local",
  keyDir: "",
  filePermissions: "384",
  defaultKeyId: "",
  timeoutSeconds: "30",
  retryAttempts: "3",
  enableCache: true,
  maxCachedKeys: "1000",
  cacheTtlSeconds: "3600",
  address: "",
  vaultToken: "",
  namespace: "",
  mountPath: "transit",
  kvMount: "secret",
  keyPathPrefix: "rustfs/kms/keys",
  skipTlsVerify: false,
}

function getStatusKind(status: KmsServiceStatusResponse | null): "NotConfigured" | "Configured" | "Running" | "Error" {
  if (!status?.status) return "NotConfigured"
  if (typeof status.status === "object" && status.status && "Error" in status.status) return "Error"
  if (status.status === "Running" || status.status === "Configured" || status.status === "NotConfigured") {
    return status.status
  }
  return "Error"
}

function formatTimestamp(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function getKeyDisplayName(key: KmsKeyInfo | KmsKeyMetadata | null) {
  if (!key) return "-"
  return key.tags?.name ?? key.description ?? key.key_id
}

function getStateBadgeVariant(value?: string | null) {
  const normalized = value?.toLowerCase() ?? ""
  if (normalized.includes("pending") || normalized.includes("error") || normalized.includes("unavailable")) {
    return "destructive" as const
  }
  if (normalized.includes("running") || normalized.includes("enabled")) {
    return "secondary" as const
  }
  return "outline" as const
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function isAbsolutePath(value: string) {
  return /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(value.trim())
}

function buildFormStateFromStatus(status: KmsServiceStatusResponse | null): ConfigFormState {
  if (!status) return INITIAL_FORM_STATE

  const summary = status.config_summary
  const backendSummary = summary?.backend_summary
  const cacheSummary = summary?.cache_summary

  return {
    backendType: status.backend_type === "Vault" ? "vault" : "local",
    keyDir: backendSummary?.key_dir ?? "",
    filePermissions: String(backendSummary?.file_permissions ?? 384),
    defaultKeyId: summary?.default_key_id ?? "",
    timeoutSeconds: String(backendSummary?.timeout_seconds ?? 30),
    retryAttempts: String(backendSummary?.retry_attempts ?? 3),
    enableCache: summary?.enable_cache ?? cacheSummary?.enabled ?? true,
    maxCachedKeys: String(summary?.max_cached_keys ?? cacheSummary?.max_cached_keys ?? 1000),
    cacheTtlSeconds: String(
      summary?.cache_ttl_seconds ?? cacheSummary?.cache_ttl_seconds ?? cacheSummary?.ttl_seconds ?? 3600,
    ),
    address: backendSummary?.address ?? "",
    vaultToken: "",
    namespace: backendSummary?.namespace ?? "",
    mountPath: backendSummary?.mount_path ?? "transit",
    kvMount: backendSummary?.kv_mount ?? "secret",
    keyPathPrefix: backendSummary?.key_path_prefix ?? "rustfs/kms/keys",
    skipTlsVerify: backendSummary?.skip_tls_verify ?? false,
  }
}

export default function SSEPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const {
    getKMSStatus,
    configureKMS,
    reconfigureKMS,
    clearCache,
    startKMS,
    stopKMS,
    createKey,
    getKeyDetails,
    getKeyList,
    deleteKey,
    forceDeleteKey,
    cancelKeyDeletion,
  } = useSSE()

  const [status, setStatus] = React.useState<KmsServiceStatusResponse | null>(null)
  const [formState, setFormState] = React.useState<ConfigFormState>(INITIAL_FORM_STATE)
  const [loadingStatus, setLoadingStatus] = React.useState(false)
  const [refreshingStatus, setRefreshingStatus] = React.useState(false)
  const [submittingConfig, setSubmittingConfig] = React.useState(false)
  const [clearingCache, setClearingCache] = React.useState(false)
  const [startingKMS, setStartingKMS] = React.useState(false)
  const [stoppingKMS, setStoppingKMS] = React.useState(false)

  const [keys, setKeys] = React.useState<KmsKeyInfo[]>([])
  const [loadingKeys, setLoadingKeys] = React.useState(false)
  const [currentMarker, setCurrentMarker] = React.useState("")
  const [previousMarkers, setPreviousMarkers] = React.useState<string[]>([])
  const [nextMarker, setNextMarker] = React.useState<string | null>(null)

  const [createKeyOpen, setCreateKeyOpen] = React.useState(false)
  const [creatingKey, setCreatingKey] = React.useState(false)
  const [createKeyName, setCreateKeyName] = React.useState("")
  const [createKeyDescription, setCreateKeyDescription] = React.useState("")
  const [createKeySetAsDefault, setCreateKeySetAsDefault] = React.useState(false)

  const [selectedKeyId, setSelectedKeyId] = React.useState<string | null>(null)
  const [loadingKeyDetails, setLoadingKeyDetails] = React.useState(false)
  const [keyDetails, setKeyDetails] = React.useState<KmsKeyMetadata | null>(null)

  const [pendingKeyAction, setPendingKeyAction] = React.useState<KeyActionState>(null)
  const [processingKeyAction, setProcessingKeyAction] = React.useState(false)

  const statusKind = React.useMemo(() => getStatusKind(status), [status])
  const isRunning = statusKind === "Running"
  const hasConfiguration = statusKind !== "NotConfigured"
  const statusBadgeValue =
    statusKind === "Error" ? "Error" : typeof status?.status === "string" ? status.status : statusKind

  const loadStatus = React.useCallback(
    async (syncForm = false) => {
      setLoadingStatus(true)
      try {
        const res = await getKMSStatus()
        setStatus(res)
        if (syncForm) {
          setFormState((current) => {
            const next = buildFormStateFromStatus(res)
            if (current.vaultToken && next.backendType === "vault") {
              next.vaultToken = current.vaultToken
            }
            return next
          })
        }
      } catch (error) {
        setStatus(null)
        throw error
      } finally {
        setLoadingStatus(false)
      }
    },
    [getKMSStatus],
  )

  const loadKeys = React.useCallback(
    async (marker = "", notifyOnError = true) => {
      setLoadingKeys(true)
      try {
        const response = await getKeyList({
          limit: KEY_LIST_LIMIT,
          marker: marker || undefined,
        })
        setKeys(response.keys ?? [])
        setCurrentMarker(marker)
        setNextMarker(response.truncated ? (response.next_marker ?? null) : null)
      } catch (error) {
        setKeys([])
        setNextMarker(null)
        if (notifyOnError) {
          message.error((error as Error).message || t("Failed to fetch KMS keys"))
        }
      } finally {
        setLoadingKeys(false)
      }
    },
    [getKeyList, message, t],
  )

  React.useEffect(() => {
    loadStatus(true).catch((error) => {
      message.error((error as Error).message || t("Failed to load KMS status"))
    })
  }, [loadStatus, message, t])

  React.useEffect(() => {
    if (!isRunning) {
      setKeys([])
      setCurrentMarker("")
      setPreviousMarkers([])
      setNextMarker(null)
      return
    }
    setPreviousMarkers([])
    loadKeys("", false).catch(() => undefined)
  }, [isRunning, loadKeys])

  React.useEffect(() => {
    if (!selectedKeyId) {
      setKeyDetails(null)
      return
    }

    setLoadingKeyDetails(true)
    getKeyDetails(selectedKeyId)
      .then((response) => {
        setKeyDetails(response.key_metadata ?? null)
      })
      .catch((error) => {
        setKeyDetails(null)
        message.error((error as Error).message || t("Failed to load key details"))
      })
      .finally(() => {
        setLoadingKeyDetails(false)
      })
  }, [getKeyDetails, message, selectedKeyId, t])

  const getKmsStatusText = React.useCallback(() => {
    if (statusKind === "Running") {
      return status?.healthy === false ? t("Running (Unhealthy)") : t("Running")
    }
    if (statusKind === "Configured") return t("Configured")
    if (statusKind === "Error") return t("Error")
    return t("Not Configured")
  }, [status?.healthy, statusKind, t])

  const getKmsStatusDescription = React.useCallback(() => {
    if (statusKind === "Running") {
      return status?.healthy ? t("KMS server is running and healthy") : t("KMS server is running but unhealthy")
    }
    if (statusKind === "Configured") return t("KMS server is configured but not running")
    if (statusKind === "Error") return t("KMS server has errors")
    return t("KMS server is not configured")
  }, [status?.healthy, statusKind, t])

  const updateFormState = <K extends keyof ConfigFormState>(key: K, value: ConfigFormState[K]) => {
    setFormState((current) => ({ ...current, [key]: value }))
  }

  const buildConfigPayload = React.useCallback(
    (overrideDefaultKeyId?: string): { payload?: KmsConfigPayload; error?: string } => {
      const defaultKeyId = (overrideDefaultKeyId ?? formState.defaultKeyId).trim()
      const timeoutSeconds = parseOptionalInteger(formState.timeoutSeconds)
      const retryAttempts = parseOptionalInteger(formState.retryAttempts)
      const maxCachedKeys = parseOptionalInteger(formState.maxCachedKeys)
      const cacheTtlSeconds = parseOptionalInteger(formState.cacheTtlSeconds)

      if (formState.backendType === "local") {
        if (!isAbsolutePath(formState.keyDir)) {
          return { error: t("Please enter an absolute local key directory path") }
        }

        return {
          payload: {
            backend_type: "local",
            key_dir: formState.keyDir.trim(),
            file_permissions: parseOptionalInteger(formState.filePermissions) ?? 384,
            default_key_id: defaultKeyId || undefined,
            timeout_seconds: timeoutSeconds ?? 30,
            retry_attempts: retryAttempts ?? 3,
            enable_cache: formState.enableCache,
            max_cached_keys: formState.enableCache ? (maxCachedKeys ?? 1000) : undefined,
            cache_ttl_seconds: formState.enableCache ? (cacheTtlSeconds ?? 3600) : undefined,
          },
        }
      }

      if (!formState.address.trim()) {
        return { error: t("Please enter Vault server address") }
      }
      if (!formState.vaultToken.trim()) {
        return { error: t("Please enter Vault token") }
      }
      if (!formState.mountPath.trim()) {
        return { error: t("Please enter Vault transit mount path") }
      }

      return {
        payload: {
          backend_type: "vault",
          address: formState.address.trim(),
          auth_method: {
            Token: {
              token: formState.vaultToken.trim(),
            },
          },
          namespace: formState.namespace.trim() || null,
          mount_path: formState.mountPath.trim(),
          kv_mount: formState.kvMount.trim() || null,
          key_path_prefix: formState.keyPathPrefix.trim() || null,
          skip_tls_verify: formState.skipTlsVerify,
          default_key_id: defaultKeyId || undefined,
          timeout_seconds: timeoutSeconds ?? 30,
          retry_attempts: retryAttempts ?? 3,
          enable_cache: formState.enableCache,
          max_cached_keys: formState.enableCache ? (maxCachedKeys ?? 1000) : undefined,
          cache_ttl_seconds: formState.enableCache ? (cacheTtlSeconds ?? 3600) : undefined,
        },
      }
    },
    [formState, t],
  )

  const submitConfiguration = React.useCallback(
    async (overrideDefaultKeyId?: string, source: "manual" | "defaultKey" = "manual") => {
      const { payload, error } = buildConfigPayload(overrideDefaultKeyId)
      if (!payload) {
        if (source === "manual") {
          message.error(error || t("Failed to save KMS configuration"))
        }
        return false
      }

      setSubmittingConfig(true)
      try {
        const response = statusKind === "NotConfigured" ? await configureKMS(payload) : await reconfigureKMS(payload)

        if (response.success) {
          if (source === "manual") {
            message.success(
              statusKind === "NotConfigured"
                ? t("KMS configuration saved successfully")
                : t("KMS configuration updated successfully"),
            )
          } else {
            message.success(t("Default SSE key updated successfully"))
          }
          await loadStatus(true)
          return true
        }

        message.error(response.message || t("Failed to save KMS configuration"))
        return false
      } catch (error) {
        message.error((error as Error).message || t("Failed to save KMS configuration"))
        return false
      } finally {
        setSubmittingConfig(false)
      }
    },
    [buildConfigPayload, configureKMS, loadStatus, message, reconfigureKMS, statusKind, t],
  )

  const handleRefresh = async () => {
    setRefreshingStatus(true)
    try {
      await loadStatus(false)
      message.success(t("Status refreshed successfully"))
    } catch (error) {
      message.error((error as Error).message || t("Failed to refresh status"))
    } finally {
      setRefreshingStatus(false)
    }
  }

  const handleClearCache = async () => {
    setClearingCache(true)
    try {
      const result = await clearCache()
      if (result?.success || result?.status === "success") {
        message.success(t("Cache cleared successfully"))
      } else {
        message.warning(result?.message || t("Cache clear completed with warnings"))
      }
    } catch (error) {
      message.error((error as Error).message || t("Failed to clear cache"))
    } finally {
      setClearingCache(false)
    }
  }

  const handleStartKMS = async () => {
    setStartingKMS(true)
    try {
      const force = isRunning
      const res = await startKMS(force ? { force: true } : {})
      if (res?.success) {
        message.success(force ? t("KMS service restarted successfully") : t("KMS service started successfully"))
        await loadStatus(false)
      } else {
        message.error(
          (force ? t("Failed to restart KMS service") : t("Failed to start KMS service")) +
            ": " +
            (res?.message || t("Unknown")),
        )
      }
    } catch (error) {
      message.error((error as Error).message || t("Failed to start KMS service"))
    } finally {
      setStartingKMS(false)
    }
  }

  const handleStopKMS = async () => {
    setStoppingKMS(true)
    try {
      const res = await stopKMS()
      if (res?.success) {
        message.success(t("KMS service stopped successfully"))
        await loadStatus(false)
      } else {
        message.error(t("Failed to stop KMS service") + ": " + (res?.message || t("Unknown")))
      }
    } catch (error) {
      message.error((error as Error).message || t("Failed to stop KMS service"))
    } finally {
      setStoppingKMS(false)
    }
  }

  const handleCreateKey = async () => {
    setCreatingKey(true)
    try {
      const tags: Record<string, string> = { created_by: "console" }
      if (createKeyName.trim()) {
        tags.name = createKeyName.trim()
      }
      const response = await createKey({
        key_usage: "EncryptDecrypt",
        description: createKeyDescription.trim() || undefined,
        tags,
      })
      const createdKeyId = response.key_id ?? response.key_metadata?.key_id

      if (response.success === false) {
        message.error(response.message || t("Failed to create KMS key"))
        return
      }

      message.success(t("KMS key created successfully"))
      setCreateKeyOpen(false)
      setCreateKeyName("")
      setCreateKeyDescription("")
      setCreateKeySetAsDefault(false)

      if (createKeySetAsDefault && createdKeyId) {
        const updated = await submitConfiguration(createdKeyId, "defaultKey")
        if (!updated) {
          message.warning(
            t("Key created but could not update the default SSE key. Save the configuration form and try again."),
          )
        }
      }

      if (isRunning) {
        await loadKeys(currentMarker, false)
      }
    } catch (error) {
      message.error((error as Error).message || t("Failed to create KMS key"))
    } finally {
      setCreatingKey(false)
    }
  }

  const handleConfirmKeyAction = async () => {
    if (!pendingKeyAction) return

    setProcessingKeyAction(true)
    try {
      if (pendingKeyAction.type === "scheduleDelete") {
        const response = await deleteKey(pendingKeyAction.key.key_id, {
          pending_window_in_days: DEFAULT_PENDING_DELETE_DAYS,
        })
        if (response.success === false) {
          message.error(response.message || t("Failed to schedule key deletion"))
          return
        }
        message.success(t("Key deletion scheduled successfully"))
      }

      if (pendingKeyAction.type === "forceDelete") {
        const response = await forceDeleteKey(pendingKeyAction.key.key_id)
        if (response.success === false) {
          message.error(response.message || t("Failed to force delete key"))
          return
        }
        message.success(t("Key deleted immediately"))
      }

      if (pendingKeyAction.type === "cancelDeletion") {
        const response = await cancelKeyDeletion(pendingKeyAction.key.key_id)
        if (response.success === false) {
          message.error(response.message || t("Failed to cancel key deletion"))
          return
        }
        message.success(t("Key deletion canceled successfully"))
      }

      setPendingKeyAction(null)
      await loadKeys(currentMarker, false)
    } catch (error) {
      message.error((error as Error).message || t("Failed to update key status"))
    } finally {
      setProcessingKeyAction(false)
    }
  }

  const keyActionTitle =
    pendingKeyAction?.type === "forceDelete"
      ? t("Delete Key Immediately")
      : pendingKeyAction?.type === "cancelDeletion"
        ? t("Cancel Key Deletion")
        : t("Schedule Key Deletion")

  const keyActionDescription =
    pendingKeyAction?.type === "forceDelete"
      ? t("This permanently deletes the key immediately and cannot be undone.")
      : pendingKeyAction?.type === "cancelDeletion"
        ? t("This restores the key from the pending deletion state.")
        : t("This schedules the key for deletion using the default pending window.")

  return (
    <>
      <Page>
        <PageHeader
          description={
            <p className="text-gray-600 dark:text-gray-400">
              {t("Configure server-side encryption for your objects using external key management services.")}
            </p>
          }
        >
          <h1 className="text-2xl font-bold">{t("Server-Side Encryption (SSE) Configuration")}</h1>
        </PageHeader>

        <div className="space-y-8">
          <Card className="shadow-none">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base sm:text-lg">{t("KMS Status Overview")}</CardTitle>
                <Badge variant={getStateBadgeVariant(statusBadgeValue)} className="text-sm uppercase">
                  {loadingStatus ? t("Loading...") : getKmsStatusText()}
                </Badge>
              </div>
              <CardDescription>{getKmsStatusDescription()}</CardDescription>
              {status?.backend_type && (
                <CardDescription>
                  {t("Backend")}: {status.backend_type}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{t("Backend Type")}</p>
                  <p className="text-sm font-medium text-foreground">{status?.backend_type ?? t("Not configured")}</p>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{t("Status")}</p>
                  <p className="text-sm font-medium text-foreground">
                    {loadingStatus ? t("Loading...") : getKmsStatusText()}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{t("Health")}</p>
                  <p className="text-sm font-medium text-foreground">
                    {status?.healthy == null ? t("Unknown") : status.healthy ? t("Healthy") : t("Unhealthy")}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">{t("Default SSE Key")}</p>
                  <p className="text-sm font-medium text-foreground">
                    {status?.config_summary?.default_key_id || t("Not set")}
                  </p>
                </div>
              </div>

              {statusKind === "Error" && (
                <Alert variant="destructive">
                  <AlertTitle>{t("KMS service has errors")}</AlertTitle>
                  <AlertDescription>
                    {typeof status?.status === "object" && status?.status && "Error" in status.status
                      ? status.status.Error
                      : t("KMS server status unknown")}
                  </AlertDescription>
                </Alert>
              )}

              {statusKind === "Configured" && (
                <Alert>
                  <AlertTitle>{t("KMS configured but not started")}</AlertTitle>
                  <AlertDescription>{t("Start KMS to make SSE and key management available.")}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="outline" disabled={refreshingStatus} onClick={handleRefresh}>
                  {refreshingStatus ? <Spinner className="size-4" /> : <RiRefreshLine className="size-4" />}
                  {t("Refresh")}
                </Button>

                {hasConfiguration && (
                  <Button size="sm" variant="default" onClick={handleStartKMS} disabled={startingKMS}>
                    {startingKMS ? <Spinner className="size-4" /> : null}
                    {isRunning ? t("Restart KMS") : t("Start KMS")}
                  </Button>
                )}

                {hasConfiguration && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        {t("Advanced Actions")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={!isRunning || clearingCache} onClick={handleClearCache}>
                        {clearingCache ? t("Clearing cache...") : t("Clear Cache")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!isRunning || stoppingKMS}
                        onClick={handleStopKMS}
                        className="text-destructive focus:text-destructive"
                      >
                        {stoppingKMS ? t("Stopping KMS...") : t("Stop KMS")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>{t("KMS Configuration")}</CardTitle>
              <CardDescription>{t("Configure the KMS backend, cache policy, and default SSE key.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                className="space-y-6"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitConfiguration()
                }}
              >
                <FieldGroup className="grid gap-4 lg:grid-cols-2">
                  <Field>
                    <FieldLabel>{t("KMS Backend")}</FieldLabel>
                    <FieldContent>
                      <Select
                        value={formState.backendType}
                        onValueChange={(value) =>
                          updateFormState("backendType", value as ConfigFormState["backendType"])
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("Select backend type")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">{t("Local filesystem")}</SelectItem>
                          <SelectItem value="vault">{t("HashiCorp Vault Transit Engine")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldContent>
                    <FieldDescription>{t("Choose the backend used by SSE/KMS.")}</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel>{t("Default SSE Key")}</FieldLabel>
                    <FieldContent>
                      <Input
                        value={formState.defaultKeyId}
                        onChange={(event) => updateFormState("defaultKeyId", event.target.value)}
                        placeholder={t("Enter the default SSE key ID")}
                      />
                    </FieldContent>
                    <FieldDescription>
                      {t("This key is used as the platform default for SSE-KMS and SSE-S3.")}
                    </FieldDescription>
                  </Field>
                </FieldGroup>

                {formState.backendType === "local" ? (
                  <FieldGroup className="grid gap-4 lg:grid-cols-2">
                    <Field>
                      <FieldLabel>{t("Local Key Directory")}</FieldLabel>
                      <FieldContent>
                        <Input
                          value={formState.keyDir}
                          onChange={(event) => updateFormState("keyDir", event.target.value)}
                          placeholder={t("Enter an absolute path such as D:/data/kms-keys")}
                        />
                      </FieldContent>
                      <FieldDescription>{t("The directory must be an absolute path on the server.")}</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel>{t("File Permissions")}</FieldLabel>
                      <FieldContent>
                        <Input
                          type="number"
                          min={0}
                          value={formState.filePermissions}
                          onChange={(event) => updateFormState("filePermissions", event.target.value)}
                          placeholder="384"
                        />
                      </FieldContent>
                      <FieldDescription>{t("Use decimal values such as 384 for 0o600.")}</FieldDescription>
                    </Field>
                  </FieldGroup>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <AlertTitle>{t("Vault token authentication only")}</AlertTitle>
                      <AlertDescription>
                        {t("Vault AppRole is not supported in the first version of this console.")}
                      </AlertDescription>
                    </Alert>

                    <FieldGroup className="grid gap-4 lg:grid-cols-2">
                      <Field>
                        <FieldLabel>{t("Vault Server Address")}</FieldLabel>
                        <FieldContent>
                          <Input
                            value={formState.address}
                            onChange={(event) => updateFormState("address", event.target.value)}
                            placeholder="http://127.0.0.1:8200"
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel>{t("Vault Token")}</FieldLabel>
                        <FieldContent>
                          <Input
                            type="password"
                            value={formState.vaultToken}
                            onChange={(event) => updateFormState("vaultToken", event.target.value)}
                            placeholder={t("Enter your Vault authentication token")}
                            autoComplete="off"
                          />
                        </FieldContent>
                        <FieldDescription>{t("Required: Vault authentication token")}</FieldDescription>
                      </Field>
                    </FieldGroup>

                    <FieldGroup className="grid gap-4 lg:grid-cols-2">
                      <Field>
                        <FieldLabel>{t("Vault Namespace")}</FieldLabel>
                        <FieldContent>
                          <Input
                            value={formState.namespace}
                            onChange={(event) => updateFormState("namespace", event.target.value)}
                            placeholder={t("Optional Vault namespace")}
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel>{t("Transit Mount Path")}</FieldLabel>
                        <FieldContent>
                          <Input
                            value={formState.mountPath}
                            onChange={(event) => updateFormState("mountPath", event.target.value)}
                            placeholder="transit"
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel>{t("KV Mount")}</FieldLabel>
                        <FieldContent>
                          <Input
                            value={formState.kvMount}
                            onChange={(event) => updateFormState("kvMount", event.target.value)}
                            placeholder="secret"
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel>{t("Key Path Prefix")}</FieldLabel>
                        <FieldContent>
                          <Input
                            value={formState.keyPathPrefix}
                            onChange={(event) => updateFormState("keyPathPrefix", event.target.value)}
                            placeholder="rustfs/kms/keys"
                          />
                        </FieldContent>
                      </Field>
                    </FieldGroup>

                    <div className="flex items-center gap-3 rounded-md border p-3">
                      <Checkbox
                        checked={formState.skipTlsVerify}
                        onCheckedChange={(checked) => updateFormState("skipTlsVerify", checked === true)}
                        id="skipTlsVerify"
                      />
                      <label htmlFor="skipTlsVerify" className="text-sm">
                        {t("Skip TLS verification")}
                      </label>
                    </div>
                  </div>
                )}

                <FieldGroup className="grid gap-4 lg:grid-cols-3">
                  <Field>
                    <FieldLabel>{t("Timeout (seconds)")}</FieldLabel>
                    <FieldContent>
                      <Input
                        type="number"
                        min={1}
                        value={formState.timeoutSeconds}
                        onChange={(event) => updateFormState("timeoutSeconds", event.target.value)}
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel>{t("Retry Attempts")}</FieldLabel>
                    <FieldContent>
                      <Input
                        type="number"
                        min={0}
                        value={formState.retryAttempts}
                        onChange={(event) => updateFormState("retryAttempts", event.target.value)}
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>

                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={formState.enableCache}
                      onCheckedChange={(checked) => updateFormState("enableCache", checked === true)}
                      id="enableCache"
                    />
                    <label htmlFor="enableCache" className="text-sm font-medium">
                      {t("Enable KMS Cache")}
                    </label>
                  </div>

                  {formState.enableCache && (
                    <FieldGroup className="grid gap-4 lg:grid-cols-2">
                      <Field>
                        <FieldLabel>{t("Max Cached Keys")}</FieldLabel>
                        <FieldContent>
                          <Input
                            type="number"
                            min={1}
                            value={formState.maxCachedKeys}
                            onChange={(event) => updateFormState("maxCachedKeys", event.target.value)}
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel>{t("Cache TTL (seconds)")}</FieldLabel>
                        <FieldContent>
                          <Input
                            type="number"
                            min={1}
                            value={formState.cacheTtlSeconds}
                            onChange={(event) => updateFormState("cacheTtlSeconds", event.target.value)}
                          />
                        </FieldContent>
                      </Field>
                    </FieldGroup>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormState(buildFormStateFromStatus(status))}
                    disabled={submittingConfig}
                  >
                    {t("Reset to Current Status")}
                  </Button>
                  <Button type="submit" disabled={submittingConfig}>
                    {submittingConfig ? <Spinner className="size-4" /> : null}
                    {statusKind === "NotConfigured" ? t("Save Configuration") : t("Reconfigure KMS")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {isRunning && (
            <Card className="shadow-none">
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>{t("KMS Keys Management")}</CardTitle>
                    <CardDescription>
                      {t("Create, rotate, and inspect the keys managed by your KMS backend.")}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingKeys}
                      onClick={() => void loadKeys(currentMarker)}
                    >
                      {loadingKeys ? <Spinner className="size-4" /> : <RiRefreshLine className="size-4" />}
                      {t("Refresh")}
                    </Button>
                    <Button size="sm" onClick={() => setCreateKeyOpen(true)}>
                      <RiAddLine className="size-4" />
                      {t("Create Key")}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTitle>{t("Two-stage key deletion")}</AlertTitle>
                  <AlertDescription>
                    {t("Keys in PendingDeletion can still be restored or deleted immediately.")}
                  </AlertDescription>
                </Alert>

                {loadingKeys ? (
                  <div className="flex items-center justify-center rounded-md border py-10">
                    <Spinner className="size-5" />
                  </div>
                ) : keys.length === 0 ? (
                  <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                    {t("No KMS keys found")}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Name")}</TableHead>
                        <TableHead>{t("KMS Key ID")}</TableHead>
                        <TableHead>{t("Status")}</TableHead>
                        <TableHead>{t("Algorithm")}</TableHead>
                        <TableHead>{t("Usage")}</TableHead>
                        <TableHead>{t("Created")}</TableHead>
                        <TableHead className="text-right">{t("Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map((key) => {
                        const isPendingDeletion = (key.status ?? "").toLowerCase().includes("pendingdeletion")
                        return (
                          <TableRow key={key.key_id}>
                            <TableCell className="font-medium">{getKeyDisplayName(key)}</TableCell>
                            <TableCell className="max-w-[220px] truncate" title={key.key_id}>
                              {key.key_id}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStateBadgeVariant(key.status)}>{key.status || "-"}</Badge>
                            </TableCell>
                            <TableCell>{key.algorithm || "-"}</TableCell>
                            <TableCell>{key.usage || "-"}</TableCell>
                            <TableCell>{formatTimestamp(key.created_at)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      {t("Actions")}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setSelectedKeyId(key.key_id)}>
                                      {t("View Details")}
                                    </DropdownMenuItem>
                                    {!isPendingDeletion && (
                                      <DropdownMenuItem
                                        onClick={() => setPendingKeyAction({ type: "scheduleDelete", key })}
                                      >
                                        {t("Schedule Deletion")}
                                      </DropdownMenuItem>
                                    )}
                                    {isPendingDeletion && (
                                      <DropdownMenuItem
                                        onClick={() => setPendingKeyAction({ type: "cancelDeletion", key })}
                                      >
                                        {t("Cancel Deletion")}
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setPendingKeyAction({ type: "forceDelete", key })}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      {t("Delete Immediately")}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {t("Showing up to {count} keys per page", { count: KEY_LIST_LIMIT })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={previousMarkers.length === 0 || loadingKeys}
                      onClick={() => {
                        const previousMarker = previousMarkers[previousMarkers.length - 1] ?? ""
                        setPreviousMarkers((current) => current.slice(0, -1))
                        void loadKeys(previousMarker)
                      }}
                    >
                      <RiArrowLeftSLine className="size-4" />
                      {t("Previous")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!nextMarker || loadingKeys}
                      onClick={() => {
                        if (!nextMarker) return
                        setPreviousMarkers((current) => [...current, currentMarker])
                        void loadKeys(nextMarker)
                      }}
                    >
                      {t("Next")}
                      <RiArrowRightSLine className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Page>

      <Dialog
        open={createKeyOpen}
        onOpenChange={(open) => {
          setCreateKeyOpen(open)
          if (!open) {
            setCreateKeyName("")
            setCreateKeyDescription("")
            setCreateKeySetAsDefault(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Create New Key")}</DialogTitle>
            <DialogDescription>
              {t("Create a new KMS key and optionally make it the default SSE key.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Field>
              <FieldLabel>{t("Key Name")}</FieldLabel>
              <FieldContent>
                <Input
                  value={createKeyName}
                  onChange={(event) => setCreateKeyName(event.target.value)}
                  placeholder={t("Optional display name for the key")}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("Description")}</FieldLabel>
              <FieldContent>
                <Input
                  value={createKeyDescription}
                  onChange={(event) => setCreateKeyDescription(event.target.value)}
                  placeholder={t("Describe the purpose of this key")}
                />
              </FieldContent>
            </Field>

            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                checked={createKeySetAsDefault}
                onCheckedChange={(checked) => setCreateKeySetAsDefault(checked === true)}
                id="setAsDefaultKey"
              />
              <label htmlFor="setAsDefaultKey" className="space-y-1 text-sm">
                <span className="block font-medium">{t("Set as default SSE key")}</span>
                <span className="block text-xs text-muted-foreground">
                  {t("This will update the current KMS configuration after key creation.")}
                </span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateKeyOpen(false)} disabled={creatingKey}>
              {t("Cancel")}
            </Button>
            <Button type="button" onClick={handleCreateKey} disabled={creatingKey}>
              {creatingKey ? <Spinner className="size-4" /> : null}
              {t("Create Key")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={!!selectedKeyId} onOpenChange={(open) => !open && setSelectedKeyId(null)} direction="right">
        <DrawerContent className="max-h-[95vh] overflow-y-auto overflow-x-hidden data-[vaul-drawer-direction=right]:w-[92vw] data-[vaul-drawer-direction=right]:sm:max-w-xl">
          <DrawerHeader>
            <DrawerTitle>{t("KMS Key Details")}</DrawerTitle>
            <DrawerDescription>{selectedKeyId || ""}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 p-4">
            {loadingKeyDetails ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="size-5" />
              </div>
            ) : !keyDetails ? (
              <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                {t("No key details available")}
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("Name")}</p>
                    <p className="text-sm font-medium">{getKeyDisplayName(keyDetails)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("State")}</p>
                    <div className="pt-1">
                      <Badge variant={getStateBadgeVariant(keyDetails.key_state)}>{keyDetails.key_state || "-"}</Badge>
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("KMS Key ID")}</p>
                    <p className="text-sm font-medium break-all">{keyDetails.key_id}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("Usage")}</p>
                    <p className="text-sm font-medium">{keyDetails.key_usage || "-"}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("Creation Date")}</p>
                    <p className="text-sm font-medium">{formatTimestamp(keyDetails.creation_date)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("Deletion Date")}</p>
                    <p className="text-sm font-medium">{formatTimestamp(keyDetails.deletion_date)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("Origin")}</p>
                    <p className="text-sm font-medium">{keyDetails.origin || "-"}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("Key Manager")}</p>
                    <p className="text-sm font-medium">{keyDetails.key_manager || "-"}</p>
                  </div>
                </div>

                {keyDetails.description && (
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{t("Description")}</p>
                    <p className="text-sm">{keyDetails.description}</p>
                  </div>
                )}

                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{t("Tags")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(keyDetails.tags ?? {}).length > 0 ? (
                      Object.entries(keyDetails.tags ?? {}).map(([key, value]) => (
                        <Badge key={key} variant="outline">
                          {key}: {value}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">{t("No tags")}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={!!pendingKeyAction} onOpenChange={(open) => !open && setPendingKeyAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{keyActionTitle}</AlertDialogTitle>
            <AlertDialogDescription>{keyActionDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingKeyAction}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmKeyAction} disabled={processingKeyAction}>
              {processingKeyAction ? <Spinner className="size-4" /> : null}
              {pendingKeyAction?.type === "cancelDeletion" ? t("Restore Key") : t("Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
