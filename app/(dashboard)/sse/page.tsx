"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine, RiRefreshLine } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
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
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSSE } from "@/hooks/use-sse"
import { useMessage } from "@/lib/feedback/message"
import { formatDateTime } from "@/lib/functions"
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
const ADVANCED_CONFIG_FIELDS = new Set([
  "timeoutSeconds",
  "retryAttempts",
  "enableCache",
  "maxCachedKeys",
  "cacheTtlSeconds",
])

type ConfigFormState = {
  backendType: "local" | "vault-kv2" | "vault-transit"
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

type PendingNavigation = {
  destination?: string
  historyDelta?: number
} | null

const INITIAL_FORM_STATE: ConfigFormState = {
  backendType: "vault-transit",
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
  return formatDateTime(value, "-")
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

function normalizeBackendType(value?: string | null): ConfigFormState["backendType"] {
  switch (value) {
    case "Vault":
    case "VaultKV2":
      return "vault-kv2"
    case "VaultTransit":
      return "vault-transit"
    default:
      return "local"
  }
}

function buildFormStateFromStatus(status: KmsServiceStatusResponse | null): ConfigFormState {
  if (!status) return INITIAL_FORM_STATE

  const summary = status.config_summary
  const backendSummary = summary?.backend_summary
  const cacheSummary = summary?.cache_summary
  const backendType = normalizeBackendType(status.backend_type ?? summary?.backend_type)

  return {
    backendType,
    keyDir: backendSummary?.key_dir ?? "",
    filePermissions: String(backendSummary?.file_permissions ?? 384),
    defaultKeyId: summary?.default_key_id ?? "",
    timeoutSeconds: String(summary?.timeout_seconds ?? 30),
    retryAttempts: String(summary?.retry_attempts ?? 3),
    enableCache: summary?.enable_cache ?? cacheSummary?.enabled ?? true,
    maxCachedKeys: String(summary?.max_cached_keys ?? cacheSummary?.max_keys ?? 1000),
    cacheTtlSeconds: String(summary?.cache_ttl_seconds ?? cacheSummary?.ttl_seconds ?? 3600),
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
  const [statusError, setStatusError] = React.useState<string | null>(null)
  const statusRequestRef = React.useRef(0)
  const [formState, setFormState] = React.useState<ConfigFormState>(INITIAL_FORM_STATE)
  const [baselineFormState, setBaselineFormState] = React.useState<ConfigFormState>(INITIAL_FORM_STATE)
  const [configFormError, setConfigFormError] = React.useState<string | null>(null)
  const [configFormErrorField, setConfigFormErrorField] = React.useState<string | null>(null)
  const advancedSettingsRef = React.useRef<HTMLDetailsElement>(null)
  const [loadingStatus, setLoadingStatus] = React.useState(false)
  const [refreshingStatus, setRefreshingStatus] = React.useState(false)
  const [submittingConfig, setSubmittingConfig] = React.useState(false)
  const [clearingCache, setClearingCache] = React.useState(false)
  const [startingKMS, setStartingKMS] = React.useState(false)
  const [stoppingKMS, setStoppingKMS] = React.useState(false)

  const [keys, setKeys] = React.useState<KmsKeyInfo[]>([])
  const [loadingKeys, setLoadingKeys] = React.useState(false)
  const [keysError, setKeysError] = React.useState<string | null>(null)
  const keysRequestRef = React.useRef(0)
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
  const [keyDetailsError, setKeyDetailsError] = React.useState<string | null>(null)
  const [keyDetailsReloadVersion, setKeyDetailsReloadVersion] = React.useState(0)
  const keyDetailsRequestRef = React.useRef(0)

  const [pendingKeyAction, setPendingKeyAction] = React.useState<KeyActionState>(null)
  const [processingKeyAction, setProcessingKeyAction] = React.useState(false)
  const [pendingServiceAction, setPendingServiceAction] = React.useState<"start" | "restart" | "stop" | null>(null)
  const [pendingNavigation, setPendingNavigation] = React.useState<PendingNavigation>(null)
  const allowNavigationRef = React.useRef(false)
  const mutationRef = React.useRef<string | null>(null)
  const [activeMutation, setActiveMutation] = React.useState<string | null>(null)

  const beginMutation = React.useCallback((name: string) => {
    if (mutationRef.current) return false
    mutationRef.current = name
    setActiveMutation(name)
    return true
  }, [])

  const endMutation = React.useCallback((name: string) => {
    if (mutationRef.current !== name) return
    mutationRef.current = null
    setActiveMutation(null)
  }, [])

  const statusKind = React.useMemo(() => (statusError ? "Error" : getStatusKind(status)), [status, statusError])
  const isRunning = statusKind === "Running"
  const hasConfiguration = !statusError && statusKind !== "NotConfigured"
  const hasStoredVaultCredentials = status?.config_summary?.backend_summary?.has_stored_credentials === true
  const statusBadgeValue =
    statusKind === "Error" ? "Error" : typeof status?.status === "string" ? status.status : statusKind

  const loadStatus = React.useCallback(
    async (syncForm = false) => {
      const requestId = ++statusRequestRef.current
      setLoadingStatus(true)
      setStatusError(null)
      try {
        const res = await getKMSStatus()
        if (requestId !== statusRequestRef.current) return res
        setStatus(res)
        setStatusError(null)
        if (syncForm) {
          const nextFormState = buildFormStateFromStatus(res)
          setFormState(nextFormState)
          setBaselineFormState(nextFormState)
        }
        return res
      } catch (error) {
        if (requestId !== statusRequestRef.current) throw error
        const description = (error as Error).message || t("Failed to load KMS status")
        setStatusError(description)
        throw error
      } finally {
        if (requestId === statusRequestRef.current) setLoadingStatus(false)
      }
    },
    [getKMSStatus, t],
  )

  const loadKeys = React.useCallback(
    async (marker = "", notifyOnError = true) => {
      const requestId = ++keysRequestRef.current
      setLoadingKeys(true)
      setKeysError(null)
      try {
        const response = await getKeyList({
          limit: KEY_LIST_LIMIT,
          marker: marker || undefined,
        })
        if (requestId !== keysRequestRef.current) return false
        setKeys(response.keys ?? [])
        setCurrentMarker(marker)
        setNextMarker(response.truncated ? (response.next_marker ?? null) : null)
        return true
      } catch (error) {
        if (requestId !== keysRequestRef.current) return false
        const description = (error as Error).message || t("Failed to fetch KMS keys")
        setKeysError(description)
        if (notifyOnError) {
          message.error(description)
        }
        return false
      } finally {
        if (requestId === keysRequestRef.current) setLoadingKeys(false)
      }
    },
    [getKeyList, message, t],
  )

  const reconcileMutationState = React.useCallback(
    async (showUncertainResult = false) => {
      try {
        const latestStatus = await loadStatus(false)
        if (getStatusKind(latestStatus) === "Running") {
          const keysSynced = await loadKeys(currentMarker, false)
          if (!keysSynced) {
            message.warning(t("Failed to fetch KMS keys"))
            return false
          }
        }
        if (showUncertainResult) {
          message.warning(t("The operation result is uncertain. Current status has been refreshed."))
        }
        return true
      } catch (refreshError) {
        message.warning((refreshError as Error).message || t("Failed to load KMS status"))
        return false
      }
    },
    [currentMarker, loadKeys, loadStatus, message, t],
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
    if (configFormErrorField && ADVANCED_CONFIG_FIELDS.has(configFormErrorField)) {
      advancedSettingsRef.current?.setAttribute("open", "")
    }
  }, [configFormErrorField])

  React.useEffect(() => {
    const requestId = ++keyDetailsRequestRef.current
    if (!selectedKeyId) {
      setLoadingKeyDetails(false)
      setKeyDetails(null)
      setKeyDetailsError(null)
      return
    }

    setLoadingKeyDetails(true)
    setKeyDetailsError(null)
    getKeyDetails(selectedKeyId)
      .then((response) => {
        if (requestId !== keyDetailsRequestRef.current) return
        setKeyDetails(response.key_metadata ?? null)
      })
      .catch((error) => {
        if (requestId !== keyDetailsRequestRef.current) return
        setKeyDetails(null)
        const description = (error as Error).message || t("Failed to load key details")
        setKeyDetailsError(description)
        message.error(description)
      })
      .finally(() => {
        if (requestId === keyDetailsRequestRef.current) setLoadingKeyDetails(false)
      })
  }, [getKeyDetails, keyDetailsReloadVersion, message, selectedKeyId, t])

  const getKmsStatusText = React.useCallback(() => {
    if (statusError) return t("Unavailable")
    if (statusKind === "Running") {
      return status?.healthy === false ? t("Running (Unhealthy)") : t("Running")
    }
    if (statusKind === "Configured") return t("Configured")
    if (statusKind === "Error") return t("Error")
    return t("Not Configured")
  }, [status?.healthy, statusError, statusKind, t])

  const getKmsStatusDescription = React.useCallback(() => {
    if (statusError) return t("Failed to load KMS status")
    if (statusKind === "Running") {
      return status?.healthy ? t("KMS server is running and healthy") : t("KMS server is running but unhealthy")
    }
    if (statusKind === "Configured") return t("KMS server is configured but not running")
    if (statusKind === "Error") return t("KMS server has errors")
    return t("KMS server is not configured")
  }, [status?.healthy, statusError, statusKind, t])

  const updateFormState = <K extends keyof ConfigFormState>(key: K, value: ConfigFormState[K]) => {
    setFormState((current) => ({ ...current, [key]: value }))
    setConfigFormError((current) => (current && configFormErrorField === key ? null : current))
    setConfigFormErrorField((current) => (current === key ? null : current))
  }

  const isConfigDirty = React.useMemo(
    () => JSON.stringify(formState) !== JSON.stringify(baselineFormState),
    [baselineFormState, formState],
  )

  const resetFormToCurrentStatus = () => {
    const nextFormState = buildFormStateFromStatus(status)
    setFormState(nextFormState)
    setBaselineFormState(nextFormState)
    setConfigFormError(null)
    setConfigFormErrorField(null)
  }

  const discardConfigChangesAndNavigate = () => {
    const navigation = pendingNavigation
    if (!navigation || mutationInFlight) {
      if (mutationInFlight)
        message.warning(t("An operation is still in progress. Wait for it to finish before leaving this page."))
      return
    }
    allowNavigationRef.current = true
    setPendingNavigation(null)
    if (navigation.historyDelta) {
      window.history.go(navigation.historyDelta)
    } else if (navigation.destination) {
      window.location.assign(navigation.destination)
    }
  }

  React.useEffect(() => {
    if (!isConfigDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowNavigationRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    const handleDocumentNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      const link = (event.target as Element | null)?.closest("a[href]")
      if (!(link instanceof HTMLAnchorElement) || link.target || link.hasAttribute("download")) return

      const destination = new URL(link.href)
      if (
        destination.origin !== window.location.origin ||
        (destination.pathname === window.location.pathname && destination.search === window.location.search)
      ) {
        return
      }

      event.preventDefault()
      event.stopImmediatePropagation()
      setPendingNavigation({ destination: destination.href })
    }
    const previousHistoryState = window.history.state
    const guardState = { ...(previousHistoryState ?? {}), __kmsDirtyGuard: true }
    window.history.pushState(guardState, "", window.location.href)
    const handlePopState = () => {
      if (allowNavigationRef.current) return
      window.history.go(1)
      setPendingNavigation({ historyDelta: -2 })
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("popstate", handlePopState)
    document.addEventListener("click", handleDocumentNavigation, true)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("popstate", handlePopState)
      document.removeEventListener("click", handleDocumentNavigation, true)
      if (window.history.state?.__kmsDirtyGuard) {
        window.history.replaceState(previousHistoryState, "", window.location.href)
      }
    }
  }, [isConfigDirty])

  const buildConfigPayload = React.useCallback(
    (
      overrideDefaultKeyId?: string,
      sourceFormState: ConfigFormState = formState,
      sourceHasStoredVaultCredentials = hasStoredVaultCredentials,
    ): { payload?: KmsConfigPayload; error?: string; field?: string } => {
      const values = sourceFormState
      const defaultKeyId = (overrideDefaultKeyId ?? values.defaultKeyId).trim()
      const timeoutSeconds = parseOptionalInteger(values.timeoutSeconds)
      const retryAttempts = parseOptionalInteger(values.retryAttempts)
      const maxCachedKeys = parseOptionalInteger(values.maxCachedKeys)
      const cacheTtlSeconds = parseOptionalInteger(values.cacheTtlSeconds)

      if (values.backendType === "local") {
        return {
          error: t(
            "Local filesystem KMS configuration is read-only in Console until safe master-key rotation is available.",
          ),
        }
      }

      if (!values.address.trim()) {
        return { error: t("Please enter Vault server address"), field: "vaultAddress" }
      }
      if (!values.vaultToken.trim() && !sourceHasStoredVaultCredentials) {
        return { error: t("Please enter Vault token"), field: "vaultToken" }
      }
      if (!values.mountPath.trim()) {
        return { error: t("Please enter Vault transit mount path"), field: "transitMountPath" }
      }

      return {
        payload: {
          backend_type: values.backendType === "vault-kv2" ? "VaultKV2" : "VaultTransit",
          address: values.address.trim(),
          auth_method: {
            Token: {
              token: values.vaultToken.trim(),
            },
          },
          namespace: values.namespace.trim() || null,
          mount_path: values.mountPath.trim(),
          ...(values.backendType === "vault-kv2"
            ? {
                kv_mount: values.kvMount.trim() || null,
                key_path_prefix: values.keyPathPrefix.trim() || null,
              }
            : {}),
          skip_tls_verify: values.skipTlsVerify,
          default_key_id: defaultKeyId || undefined,
          timeout_seconds: timeoutSeconds ?? 30,
          retry_attempts: retryAttempts ?? 3,
          enable_cache: values.enableCache,
          max_cached_keys: values.enableCache ? (maxCachedKeys ?? 1000) : undefined,
          cache_ttl_seconds: values.enableCache ? (cacheTtlSeconds ?? 3600) : undefined,
        },
      }
    },
    [formState, hasStoredVaultCredentials, t],
  )

  const submitConfiguration = React.useCallback(
    async (
      overrideDefaultKeyId?: string,
      source: "manual" | "defaultKey" = "manual",
      sourceFormState?: ConfigFormState,
    ) => {
      if (statusError || loadingStatus) {
        if (source === "manual") message.error(t("Failed to load KMS status"))
        return false
      }
      const nestedCreateMutation = source === "defaultKey" && mutationRef.current === "create-key"
      const ownsMutation = nestedCreateMutation || beginMutation("kms-config")
      if (!ownsMutation) return false

      const { payload, error, field } = buildConfigPayload(overrideDefaultKeyId, sourceFormState)
      if (!payload) {
        setConfigFormError(error || t("Failed to save KMS configuration"))
        setConfigFormErrorField(field ?? null)
        if (source === "manual") {
          message.error(error || t("Failed to save KMS configuration"))
        }
        if (source === "manual" && field) document.getElementById(field)?.focus()
        if (!nestedCreateMutation) endMutation("kms-config")
        return false
      }

      setSubmittingConfig(true)
      setConfigFormError(null)
      setConfigFormErrorField(null)
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
          try {
            await loadStatus(true)
          } catch (refreshError) {
            message.warning((refreshError as Error).message || t("Failed to load KMS status"))
          }
          return true
        }

        try {
          await loadStatus(false)
        } catch (refreshError) {
          message.warning((refreshError as Error).message || t("Failed to load KMS status"))
        }
        message.error(response.message || t("Failed to save KMS configuration"))
        return false
      } catch (error) {
        try {
          await loadStatus(false)
        } catch (refreshError) {
          message.warning((refreshError as Error).message || t("Failed to load KMS status"))
        }
        message.error((error as Error).message || t("Failed to save KMS configuration"))
        return false
      } finally {
        setFormState((current) => ({ ...current, vaultToken: "" }))
        setSubmittingConfig(false)
        if (!nestedCreateMutation) endMutation("kms-config")
      }
    },
    [
      beginMutation,
      buildConfigPayload,
      configureKMS,
      endMutation,
      loadStatus,
      loadingStatus,
      message,
      mutationRef,
      reconfigureKMS,
      statusError,
      statusKind,
      t,
    ],
  )

  const handleRefresh = async () => {
    if (activeMutation || loadingStatus) return
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
    if (statusError || loadingStatus || !beginMutation("clear-cache")) return
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
      endMutation("clear-cache")
    }
  }

  const handleStartKMS = async () => {
    if (statusError || loadingStatus || !beginMutation("start-kms")) return
    setStartingKMS(true)
    try {
      const force = isRunning
      const res = await startKMS(force ? { force: true } : {})
      if (res?.success) {
        message.success(force ? t("KMS service restarted successfully") : t("KMS service started successfully"))
        try {
          await loadStatus(false)
        } catch (refreshError) {
          message.warning((refreshError as Error).message || t("Failed to load KMS status"))
        }
      } else {
        message.error(
          (force ? t("Failed to restart KMS service") : t("Failed to start KMS service")) +
            ": " +
            (res?.message || t("Unknown")),
        )
        await reconcileMutationState()
      }
    } catch (error) {
      message.error((error as Error).message || t("Failed to start KMS service"))
      await reconcileMutationState(true)
    } finally {
      setStartingKMS(false)
      endMutation("start-kms")
    }
  }

  const handleStopKMS = async () => {
    if (statusError || loadingStatus || !beginMutation("stop-kms")) return
    setStoppingKMS(true)
    try {
      const res = await stopKMS()
      if (res?.success) {
        message.success(t("KMS service stopped successfully"))
        try {
          await loadStatus(false)
        } catch (refreshError) {
          message.warning((refreshError as Error).message || t("Failed to load KMS status"))
        }
      } else {
        message.error(t("Failed to stop KMS service") + ": " + (res?.message || t("Unknown")))
        await reconcileMutationState()
      }
    } catch (error) {
      message.error((error as Error).message || t("Failed to stop KMS service"))
      await reconcileMutationState(true)
    } finally {
      setStoppingKMS(false)
      endMutation("stop-kms")
    }
  }

  const requestStartKMS = () => {
    if (statusError || loadingStatus || mutationLocked) return
    setPendingServiceAction(isRunning ? "restart" : "start")
  }

  const requestStopKMS = () => {
    if (statusError || loadingStatus || mutationLocked) return
    setPendingServiceAction("stop")
  }

  const confirmServiceAction = async () => {
    const action = pendingServiceAction
    if (!action) return
    setPendingServiceAction(null)
    if (action === "stop") {
      await handleStopKMS()
    } else {
      await handleStartKMS()
    }
  }

  const handleCreateKey = async () => {
    if (statusError || keysError || loadingKeys || loadingStatus || !beginMutation("create-key")) return
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
        await reconcileMutationState()
        return
      }

      message.success(t("KMS key created successfully"))
      setCreateKeyOpen(false)
      setCreateKeyName("")
      setCreateKeyDescription("")
      setCreateKeySetAsDefault(false)

      if (createKeySetAsDefault && createdKeyId) {
        const updated = await submitConfiguration(createdKeyId, "defaultKey", buildFormStateFromStatus(status))
        if (!updated) {
          message.warning(
            t("Key created but could not update the default SSE key. Save the configuration form and try again."),
          )
        }
      }

      if (isRunning) {
        const keysSynced = await loadKeys(currentMarker, false)
        if (!keysSynced) message.warning(t("Failed to fetch KMS keys"))
      }
    } catch (error) {
      message.error((error as Error).message || t("Failed to create KMS key"))
      setCreateKeyOpen(false)
      setCreateKeyName("")
      setCreateKeyDescription("")
      setCreateKeySetAsDefault(false)
      await reconcileMutationState(true)
    } finally {
      setCreatingKey(false)
      endMutation("create-key")
    }
  }

  const handleConfirmKeyAction = async () => {
    if (!pendingKeyAction) return
    if (statusError || loadingStatus || !beginMutation("key-action")) return

    setProcessingKeyAction(true)
    try {
      if (pendingKeyAction.type !== "cancelDeletion") {
        const latestStatus = await loadStatus(false)
        if (
          !latestStatus?.config_summary ||
          latestStatus.config_summary.default_key_id === pendingKeyAction.key.key_id
        ) {
          message.error(t("Cannot delete the default SSE key. Choose another default key first."))
          return
        }
      }
      if (pendingKeyAction.type === "scheduleDelete") {
        const response = await deleteKey(pendingKeyAction.key.key_id, {
          pending_window_in_days: DEFAULT_PENDING_DELETE_DAYS,
        })
        if (response.success === false) {
          message.error(response.message || t("Failed to schedule key deletion"))
          setPendingKeyAction(null)
          await reconcileMutationState()
          return
        }
        message.success(t("Key deletion scheduled successfully"))
      }

      if (pendingKeyAction.type === "forceDelete") {
        const response = await forceDeleteKey(pendingKeyAction.key.key_id)
        if (response.success === false) {
          message.error(response.message || t("Failed to force delete key"))
          setPendingKeyAction(null)
          await reconcileMutationState()
          return
        }
        message.success(t("Key deleted immediately"))
      }

      if (pendingKeyAction.type === "cancelDeletion") {
        const response = await cancelKeyDeletion(pendingKeyAction.key.key_id)
        if (response.success === false) {
          message.error(response.message || t("Failed to cancel key deletion"))
          setPendingKeyAction(null)
          await reconcileMutationState()
          return
        }
        message.success(t("Key deletion canceled successfully"))
      }

      setPendingKeyAction(null)
      const keysSynced = await loadKeys(currentMarker, false)
      if (!keysSynced) message.warning(t("Failed to fetch KMS keys"))
    } catch (error) {
      message.error((error as Error).message || t("Failed to update key status"))
      setPendingKeyAction(null)
      await reconcileMutationState(true)
    } finally {
      setProcessingKeyAction(false)
      endMutation("key-action")
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
  const serviceActionDescription =
    pendingServiceAction === "stop"
      ? t("KMS will be stopped. SSE and key management will be unavailable until you start KMS again.")
      : t("Changing KMS service state may briefly interrupt SSE requests.")
  const isPendingDefaultKey = pendingKeyAction?.key.key_id === status?.config_summary?.default_key_id

  const mutationLocked = Boolean(activeMutation || statusError || loadingStatus)
  const localKmsReadOnly = formState.backendType === "local"
  const formDisabled = mutationLocked || loadingStatus || submittingConfig || localKmsReadOnly
  const mutationInFlight = Boolean(activeMutation || submittingConfig || creatingKey || processingKeyAction)
  const canSetCreatedKeyAsDefault = status?.backend_type !== "Local" && !isConfigDirty

  return (
    <>
      <Page>
        <PageHeader
          description={
            <p className="text-muted-foreground">
              {t("Configure server-side encryption for your objects using external key management services.")}
            </p>
          }
        >
          <h1 className="text-2xl font-bold">{t("Server-Side Encryption (SSE) Configuration")}</h1>
        </PageHeader>

        <div className="space-y-8">
          {statusError ? (
            <Alert variant="destructive">
              <AlertTitle>{t("Failed to load KMS status")}</AlertTitle>
              <AlertDescription>{statusError}</AlertDescription>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleRefresh}
                disabled={Boolean(activeMutation) || loadingStatus}
              >
                {t("Refresh")}
              </Button>
            </Alert>
          ) : null}
          <Card className="shadow-none">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-base font-semibold sm:text-lg">{t("KMS Status Overview")}</h2>
                <Badge variant={getStateBadgeVariant(statusBadgeValue)} className="text-sm uppercase">
                  {loadingStatus ? t("Loading…") : getKmsStatusText()}
                </Badge>
              </div>
              <CardDescription>{getKmsStatusDescription()}</CardDescription>
              {!statusError && status?.backend_type && (
                <CardDescription>
                  {t("Backend")}: {status.backend_type}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!statusError ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t("Backend Type")}</p>
                    <p className="text-sm font-medium text-foreground">{status?.backend_type ?? t("Not configured")}</p>
                  </div>
                  <div className="border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t("Status")}</p>
                    <p className="break-all text-sm font-medium text-foreground">
                      {loadingStatus ? t("Loading…") : getKmsStatusText()}
                    </p>
                  </div>
                  <div className="border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t("Health")}</p>
                    <p className="text-sm font-medium text-foreground">
                      {status?.healthy == null ? t("Unknown") : status.healthy ? t("Healthy") : t("Unhealthy")}
                    </p>
                  </div>
                  <div className="border bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">{t("Default SSE Key")}</p>
                    <p className="break-all text-sm font-medium text-foreground">
                      {status?.config_summary?.default_key_id || t("Not set")}
                    </p>
                  </div>
                </div>
              ) : null}

              {!statusError && statusKind === "Error" ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("KMS service has errors")}</AlertTitle>
                  <AlertDescription>
                    {typeof status?.status === "object" && status?.status && "Error" in status.status
                      ? status.status.Error
                      : t("KMS server status unknown")}
                  </AlertDescription>
                </Alert>
              ) : null}

              {statusKind === "Configured" && (
                <Alert>
                  <AlertTitle>{t("KMS configured but not started")}</AlertTitle>
                  <AlertDescription>{t("Start KMS to make SSE and key management available.")}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={refreshingStatus || Boolean(activeMutation) || loadingStatus}
                  onClick={handleRefresh}
                >
                  {refreshingStatus ? <Spinner className="size-4" /> : <RiRefreshLine className="size-4" aria-hidden />}
                  {t("Refresh")}
                </Button>

                {hasConfiguration && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={requestStartKMS}
                    disabled={startingKMS || mutationLocked || loadingStatus}
                  >
                    {startingKMS ? <Spinner className="size-4" /> : null}
                    {isRunning ? t("Restart KMS") : t("Start KMS")}
                  </Button>
                )}

                {hasConfiguration && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button size="sm" variant="outline">
                          {t("Advanced Actions")}
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={!isRunning || clearingCache || mutationLocked}
                        onClick={handleClearCache}
                      >
                        {clearingCache ? t("Clearing cache…") : t("Clear Cache")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!isRunning || stoppingKMS || mutationLocked}
                        onClick={requestStopKMS}
                        className="text-destructive focus:text-destructive"
                      >
                        {stoppingKMS ? t("Stopping KMS…") : t("Stop KMS")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <h2 className="text-base font-semibold sm:text-lg">{t("KMS Configuration")}</h2>
              <CardDescription>{t("Configure the KMS backend, cache policy, and default SSE key.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {configFormError ? (
                <Alert variant="destructive" role="alert">
                  <AlertTitle>{t("Please fix the form errors before saving")}</AlertTitle>
                  <AlertDescription id="kms-config-error">{configFormError}</AlertDescription>
                </Alert>
              ) : null}
              {localKmsReadOnly ? (
                <Alert>
                  <AlertTitle>{t("Local filesystem")}</AlertTitle>
                  <AlertDescription>
                    {t(
                      "Local filesystem KMS configuration is read-only in Console until safe master-key rotation is available.",
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}
              <form
                className="space-y-6"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitConfiguration()
                }}
              >
                <fieldset className="space-y-4 border-t pt-4">
                  <legend className="pe-2 text-sm font-semibold">{t("Backend and default key")}</legend>
                  <FieldGroup className="grid gap-4 lg:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="kmsBackend">{t("KMS Backend")}</FieldLabel>
                      <FieldContent>
                        <Select
                          value={formState.backendType}
                          onValueChange={(value) =>
                            updateFormState("backendType", value as ConfigFormState["backendType"])
                          }
                          disabled={formDisabled}
                        >
                          <SelectTrigger id="kmsBackend" className="w-full" aria-label={t("KMS Backend")}>
                            <SelectValue placeholder={t("Select backend type")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local" disabled>
                              {t("Local filesystem")}
                            </SelectItem>
                            <SelectItem value="vault-kv2">{t("HashiCorp Vault KV2")}</SelectItem>
                            <SelectItem value="vault-transit">{t("HashiCorp Vault Transit Engine")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldContent>
                      <FieldDescription>{t("Choose the backend used by SSE/KMS.")}</FieldDescription>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="defaultKeyId">{t("Default SSE Key")}</FieldLabel>
                      <FieldContent>
                        <Input
                          id="defaultKeyId"
                          name="defaultKeyId"
                          value={formState.defaultKeyId}
                          onChange={(event) => updateFormState("defaultKeyId", event.target.value)}
                          autoComplete="off"
                          placeholder={t("Enter the default SSE key ID")}
                          spellCheck={false}
                          disabled={formDisabled}
                        />
                      </FieldContent>
                      <FieldDescription>
                        {t("This key is used as the platform default SSE key for SSE-KMS and SSE-S3.")}
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                </fieldset>

                <fieldset className="space-y-4 border-t pt-4">
                  <legend className="pe-2 text-sm font-semibold">
                    {formState.backendType === "local" ? t("Local filesystem") : t("Vault connection")}
                  </legend>
                  {formState.backendType === "local" ? (
                    <FieldGroup className="grid gap-4 lg:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="keyDir">{t("Local Key Directory")}</FieldLabel>
                        <FieldContent>
                          <Input
                            id="keyDir"
                            name="keyDir"
                            value={formState.keyDir}
                            onChange={(event) => updateFormState("keyDir", event.target.value)}
                            autoComplete="off"
                            placeholder={t("Enter an absolute path such as D:/data/kms-keys")}
                            spellCheck={false}
                            disabled={formDisabled}
                            required
                            aria-required="true"
                            aria-invalid={configFormErrorField === "keyDir"}
                            aria-describedby={configFormErrorField === "keyDir" ? "kms-config-error" : undefined}
                          />
                        </FieldContent>
                        <FieldDescription>
                          {t("The directory must be an absolute path on the server.")}
                        </FieldDescription>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="filePermissions">{t("File Permissions")}</FieldLabel>
                        <FieldContent>
                          <Input
                            id="filePermissions"
                            name="filePermissions"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            autoComplete="off"
                            value={formState.filePermissions}
                            onChange={(event) => updateFormState("filePermissions", event.target.value)}
                            placeholder="384"
                            disabled={formDisabled}
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
                          <FieldLabel htmlFor="vaultAddress">{t("Vault Server Address")}</FieldLabel>
                          <FieldContent>
                            <Input
                              id="vaultAddress"
                              name="vaultAddress"
                              type="url"
                              value={formState.address}
                              onChange={(event) => updateFormState("address", event.target.value)}
                              autoComplete="off"
                              placeholder="http://127.0.0.1:8200"
                              spellCheck={false}
                              disabled={formDisabled}
                              required
                              aria-required="true"
                              aria-invalid={configFormErrorField === "vaultAddress"}
                              aria-describedby={
                                configFormErrorField === "vaultAddress" ? "kms-config-error" : undefined
                              }
                            />
                          </FieldContent>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="vaultToken">{t("Vault Token")}</FieldLabel>
                          <FieldContent>
                            <Input
                              id="vaultToken"
                              name="vaultToken"
                              type="password"
                              value={formState.vaultToken}
                              onChange={(event) => updateFormState("vaultToken", event.target.value)}
                              placeholder={
                                hasStoredVaultCredentials
                                  ? t("Stored token is hidden. Enter a new token only to replace it.")
                                  : t("Enter your Vault authentication token")
                              }
                              autoComplete="off"
                              spellCheck={false}
                              disabled={formDisabled}
                              required={!hasStoredVaultCredentials}
                              aria-required={!hasStoredVaultCredentials ? "true" : "false"}
                              aria-invalid={configFormErrorField === "vaultToken"}
                              aria-describedby={configFormErrorField === "vaultToken" ? "kms-config-error" : undefined}
                            />
                          </FieldContent>
                          <FieldDescription>
                            {hasStoredVaultCredentials
                              ? t("Leave blank to keep the stored Vault token.")
                              : t("Required: Vault authentication token")}
                          </FieldDescription>
                        </Field>
                      </FieldGroup>

                      <FieldGroup className="grid gap-4 lg:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor="vaultNamespace">{t("Vault Namespace")}</FieldLabel>
                          <FieldContent>
                            <Input
                              id="vaultNamespace"
                              name="vaultNamespace"
                              value={formState.namespace}
                              onChange={(event) => updateFormState("namespace", event.target.value)}
                              autoComplete="off"
                              placeholder={t("Optional Vault namespace")}
                              disabled={formDisabled}
                              spellCheck={false}
                            />
                          </FieldContent>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="transitMountPath">{t("Transit Mount Path")}</FieldLabel>
                          <FieldContent>
                            <Input
                              id="transitMountPath"
                              name="transitMountPath"
                              value={formState.mountPath}
                              onChange={(event) => updateFormState("mountPath", event.target.value)}
                              autoComplete="off"
                              placeholder="transit"
                              disabled={formDisabled}
                              required
                              aria-required="true"
                              aria-invalid={configFormErrorField === "transitMountPath"}
                              aria-describedby={
                                configFormErrorField === "transitMountPath" ? "kms-config-error" : undefined
                              }
                              spellCheck={false}
                            />
                          </FieldContent>
                        </Field>

                        {formState.backendType === "vault-kv2" && (
                          <>
                            <Field>
                              <FieldLabel htmlFor="kvMount">{t("KV Mount")}</FieldLabel>
                              <FieldContent>
                                <Input
                                  id="kvMount"
                                  name="kvMount"
                                  value={formState.kvMount}
                                  onChange={(event) => updateFormState("kvMount", event.target.value)}
                                  autoComplete="off"
                                  placeholder="secret"
                                  disabled={formDisabled}
                                  spellCheck={false}
                                />
                              </FieldContent>
                            </Field>

                            <Field>
                              <FieldLabel htmlFor="keyPathPrefix">{t("Key Path Prefix")}</FieldLabel>
                              <FieldContent>
                                <Input
                                  id="keyPathPrefix"
                                  name="keyPathPrefix"
                                  value={formState.keyPathPrefix}
                                  onChange={(event) => updateFormState("keyPathPrefix", event.target.value)}
                                  autoComplete="off"
                                  placeholder="rustfs/kms/keys"
                                  disabled={formDisabled}
                                  spellCheck={false}
                                />
                              </FieldContent>
                            </Field>
                          </>
                        )}
                      </FieldGroup>

                      <div className="flex items-center gap-3 py-2">
                        <Checkbox
                          name="skipTlsVerify"
                          checked={formState.skipTlsVerify}
                          onCheckedChange={(checked) => updateFormState("skipTlsVerify", checked === true)}
                          id="skipTlsVerify"
                          disabled={formDisabled}
                        />
                        <label htmlFor="skipTlsVerify" className="text-sm">
                          {t("Skip TLS verification")}
                        </label>
                      </div>
                    </div>
                  )}
                </fieldset>

                <details ref={advancedSettingsRef} className="space-y-4 border-t pt-4">
                  <summary className="cursor-pointer text-sm font-semibold">
                    {t("Advanced Settings")}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {t("Reliability")} · {t("KMS Cache")}
                    </span>
                  </summary>

                  <div className="space-y-4">
                    <fieldset className="space-y-4">
                      <legend className="text-sm font-semibold">{t("Reliability")}</legend>
                      <FieldGroup className="grid gap-4 lg:grid-cols-3">
                        <Field>
                          <FieldLabel htmlFor="timeoutSeconds">{t("Timeout (seconds)")}</FieldLabel>
                          <FieldContent>
                            <Input
                              id="timeoutSeconds"
                              name="timeoutSeconds"
                              type="number"
                              inputMode="numeric"
                              min={1}
                              autoComplete="off"
                              value={formState.timeoutSeconds}
                              onChange={(event) => updateFormState("timeoutSeconds", event.target.value)}
                              disabled={formDisabled}
                            />
                          </FieldContent>
                        </Field>

                        <Field>
                          <FieldLabel htmlFor="retryAttempts">{t("Retry Attempts")}</FieldLabel>
                          <FieldContent>
                            <Input
                              id="retryAttempts"
                              name="retryAttempts"
                              type="number"
                              inputMode="numeric"
                              min={0}
                              autoComplete="off"
                              value={formState.retryAttempts}
                              onChange={(event) => updateFormState("retryAttempts", event.target.value)}
                              disabled={formDisabled}
                            />
                          </FieldContent>
                        </Field>
                      </FieldGroup>
                    </fieldset>

                    <fieldset className="space-y-4 border-t pt-4">
                      <legend className="pe-2 text-sm font-semibold">{t("KMS Cache")}</legend>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          name="enableCache"
                          checked={formState.enableCache}
                          onCheckedChange={(checked) => updateFormState("enableCache", checked === true)}
                          id="enableCache"
                          disabled={formDisabled}
                        />
                        <label htmlFor="enableCache" className="text-sm font-medium">
                          {t("Enable KMS Cache")}
                        </label>
                      </div>

                      {formState.enableCache && (
                        <FieldGroup className="grid gap-4 lg:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor="maxCachedKeys">{t("Max Cached Keys")}</FieldLabel>
                            <FieldContent>
                              <Input
                                id="maxCachedKeys"
                                name="maxCachedKeys"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                autoComplete="off"
                                value={formState.maxCachedKeys}
                                onChange={(event) => updateFormState("maxCachedKeys", event.target.value)}
                                disabled={formDisabled}
                              />
                            </FieldContent>
                          </Field>

                          <Field>
                            <FieldLabel htmlFor="cacheTtlSeconds">{t("Cache TTL (seconds)")}</FieldLabel>
                            <FieldContent>
                              <Input
                                id="cacheTtlSeconds"
                                name="cacheTtlSeconds"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                autoComplete="off"
                                value={formState.cacheTtlSeconds}
                                onChange={(event) => updateFormState("cacheTtlSeconds", event.target.value)}
                                disabled={formDisabled}
                              />
                            </FieldContent>
                          </Field>
                        </FieldGroup>
                      )}
                    </fieldset>
                  </div>
                </details>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetFormToCurrentStatus}
                    disabled={formDisabled || !isConfigDirty}
                  >
                    {t("Reset to Current Status")}
                  </Button>
                  <Button type="submit" disabled={formDisabled || !isConfigDirty}>
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
                    <h2 className="text-base font-semibold sm:text-lg">{t("KMS Keys Management")}</h2>
                    <CardDescription>
                      {t("Create, rotate, and inspect the keys managed by your KMS backend.")}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingKeys || Boolean(activeMutation) || loadingStatus}
                      onClick={() => void loadKeys(currentMarker)}
                    >
                      {loadingKeys ? <Spinner className="size-4" /> : <RiRefreshLine className="size-4" aria-hidden />}
                      {t("Refresh")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setCreateKeyOpen(true)}
                      disabled={Boolean(activeMutation) || loadingKeys || loadingStatus || Boolean(keysError)}
                    >
                      <RiAddLine className="size-4" aria-hidden />
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

                {keysError ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t("Failed to fetch KMS keys")}</AlertTitle>
                    <AlertDescription>{keysError}</AlertDescription>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => void loadKeys(currentMarker)}
                      disabled={loadingKeys || Boolean(activeMutation) || loadingStatus}
                    >
                      {t("Refresh")}
                    </Button>
                  </Alert>
                ) : null}

                {loadingKeys ? (
                  <div className="flex items-center justify-center border py-10">
                    <Spinner className="size-5" />
                  </div>
                ) : keys.length === 0 && !keysError ? (
                  <div className="border border-dashed py-10 text-center text-sm text-muted-foreground">
                    {t("No KMS keys found")}
                  </div>
                ) : keys.length > 0 && !keysError ? (
                  <>
                    <div className="space-y-3 md:hidden">
                      {keys.map((key) => {
                        const isDefaultKey = key.key_id === status?.config_summary?.default_key_id
                        const isPendingDeletion = (key.status ?? "").toLowerCase().includes("pendingdeletion")
                        return (
                          <article key={key.key_id} className="space-y-4 border p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="break-all text-sm font-medium">{getKeyDisplayName(key)}</h3>
                                <p className="mt-1 break-all text-xs text-muted-foreground">{key.key_id}</p>
                              </div>
                              <Badge variant={getStateBadgeVariant(key.status)}>{key.status || "-"}</Badge>
                            </div>
                            {isDefaultKey ? (
                              <p className="text-xs font-medium text-primary">{t("Default SSE Key")}</p>
                            ) : null}
                            <dl className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <dt className="text-xs text-muted-foreground">{t("Algorithm")}</dt>
                                <dd>{key.algorithm || "-"}</dd>
                              </div>
                              <div>
                                <dt className="text-xs text-muted-foreground">{t("Created")}</dt>
                                <dd>{formatTimestamp(key.created_at)}</dd>
                              </div>
                            </dl>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="min-h-11 flex-1 sm:flex-none"
                                onClick={() => setSelectedKeyId(key.key_id)}
                              >
                                {t("View Details")}
                              </Button>
                              {isPendingDeletion ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="min-h-11 flex-1 sm:flex-none"
                                  disabled={Boolean(activeMutation) || loadingStatus || Boolean(keysError)}
                                  onClick={() => setPendingKeyAction({ type: "cancelDeletion", key })}
                                >
                                  {t("Cancel Deletion")}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="min-h-11 flex-1 sm:flex-none"
                                  disabled={
                                    isDefaultKey || Boolean(activeMutation) || loadingStatus || Boolean(keysError)
                                  }
                                  onClick={() => setPendingKeyAction({ type: "scheduleDelete", key })}
                                >
                                  {t("Schedule Deletion")}
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="destructive"
                                className="min-h-11 flex-1 sm:flex-none"
                                disabled={
                                  isDefaultKey || Boolean(activeMutation) || loadingStatus || Boolean(keysError)
                                }
                                onClick={() => setPendingKeyAction({ type: "forceDelete", key })}
                              >
                                {t("Delete Immediately")}
                              </Button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                      <Table className="min-w-[52rem]">
                        <TableCaption className="sr-only">{t("KMS Keys Management")}</TableCaption>
                        <TableHeader>
                          <TableRow>
                            <TableHead scope="col">{t("Name")}</TableHead>
                            <TableHead scope="col">{t("KMS Key ID")}</TableHead>
                            <TableHead scope="col">{t("Status")}</TableHead>
                            <TableHead scope="col">{t("Algorithm")}</TableHead>
                            <TableHead scope="col">{t("Usage")}</TableHead>
                            <TableHead scope="col">{t("Created")}</TableHead>
                            <TableHead scope="col" className="sticky end-0 z-20 border-s bg-card text-end">
                              {t("Actions")}
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {keys.map((key) => {
                            const isPendingDeletion = (key.status ?? "").toLowerCase().includes("pendingdeletion")
                            const isDefaultKey = key.key_id === status?.config_summary?.default_key_id
                            return (
                              <TableRow key={key.key_id} className="group">
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
                                <TableCell className="sticky end-0 z-10 border-s bg-card group-hover:bg-muted/50">
                                  <div className="flex justify-end">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger
                                        render={
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            aria-label={`${t("Actions")}: ${getKeyDisplayName(key)}`}
                                          >
                                            {t("Actions")}
                                          </Button>
                                        }
                                      />
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setSelectedKeyId(key.key_id)}>
                                          {t("View Details")}
                                        </DropdownMenuItem>
                                        {!isPendingDeletion && (
                                          <DropdownMenuItem
                                            onClick={() => setPendingKeyAction({ type: "scheduleDelete", key })}
                                            disabled={
                                              isDefaultKey ||
                                              Boolean(activeMutation) ||
                                              loadingStatus ||
                                              Boolean(keysError)
                                            }
                                          >
                                            {t("Schedule Deletion")}
                                          </DropdownMenuItem>
                                        )}
                                        {isPendingDeletion && (
                                          <DropdownMenuItem
                                            onClick={() => setPendingKeyAction({ type: "cancelDeletion", key })}
                                            disabled={Boolean(activeMutation) || loadingStatus || Boolean(keysError)}
                                          >
                                            {t("Cancel Deletion")}
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => setPendingKeyAction({ type: "forceDelete", key })}
                                          disabled={
                                            isDefaultKey ||
                                            Boolean(activeMutation) ||
                                            loadingStatus ||
                                            Boolean(keysError)
                                          }
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
                    </div>
                  </>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {t("Showing up to {count} keys per page", { count: KEY_LIST_LIMIT })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        previousMarkers.length === 0 ||
                        loadingKeys ||
                        Boolean(activeMutation) ||
                        loadingStatus ||
                        Boolean(keysError)
                      }
                      onClick={() => {
                        const previousMarker = previousMarkers[previousMarkers.length - 1] ?? ""
                        setPreviousMarkers((current) => current.slice(0, -1))
                        void loadKeys(previousMarker)
                      }}
                    >
                      <RiArrowLeftSLine className="size-4" aria-hidden />
                      {t("Previous")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        !nextMarker || loadingKeys || Boolean(activeMutation) || loadingStatus || Boolean(keysError)
                      }
                      onClick={() => {
                        if (!nextMarker) return
                        setPreviousMarkers((current) => [...current, currentMarker])
                        void loadKeys(nextMarker)
                      }}
                    >
                      {t("Next")}
                      <RiArrowRightSLine className="size-4" aria-hidden />
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
        disablePointerDismissal={creatingKey}
        onOpenChange={(open) => {
          if (!open && creatingKey) return
          setCreateKeyOpen(open)
          if (!open) {
            setCreateKeyName("")
            setCreateKeyDescription("")
            setCreateKeySetAsDefault(false)
          }
        }}
      >
        <DialogContent className="max-h-[min(90dvh,42rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-4 py-4 pe-12 sm:px-6">
            <DialogTitle>{t("Create New Key")}</DialogTitle>
            <DialogDescription>
              {t("Create a new KMS key and optionally make it the default SSE key.")}
            </DialogDescription>
          </DialogHeader>

          <div
            className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
            aria-busy={creatingKey}
          >
            <Field>
              <FieldLabel htmlFor="kms-key-name">{t("Key Name")}</FieldLabel>
              <FieldContent>
                <Input
                  id="kms-key-name"
                  name="kms-key-name"
                  value={createKeyName}
                  onChange={(event) => setCreateKeyName(event.target.value)}
                  autoComplete="off"
                  placeholder={t("Optional display name for the key")}
                  spellCheck={false}
                  disabled={creatingKey || Boolean(activeMutation)}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="kms-key-description">{t("Description")}</FieldLabel>
              <FieldContent>
                <Input
                  id="kms-key-description"
                  name="kms-key-description"
                  value={createKeyDescription}
                  onChange={(event) => setCreateKeyDescription(event.target.value)}
                  autoComplete="off"
                  placeholder={t("Describe the purpose of this key")}
                  disabled={creatingKey || Boolean(activeMutation)}
                />
              </FieldContent>
            </Field>

            <div className="flex items-start gap-3 border p-3">
              <Checkbox
                name="setAsDefaultKey"
                checked={createKeySetAsDefault}
                onCheckedChange={(checked) => setCreateKeySetAsDefault(checked === true)}
                id="setAsDefaultKey"
                disabled={creatingKey || Boolean(activeMutation) || !canSetCreatedKeyAsDefault}
              />
              <label htmlFor="setAsDefaultKey" className="space-y-1 text-sm">
                <span className="block font-medium">{t("Set as default SSE key")}</span>
                <span className="block text-xs text-muted-foreground">
                  {status?.backend_type === "Local"
                    ? t("Set a default key for Local KMS in server configuration.")
                    : isConfigDirty
                      ? t("Save or discard KMS configuration changes before setting a newly created default key.")
                      : t("This will update the current KMS configuration after key creation.")}
                </span>
              </label>
            </div>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateKeyOpen(false)}
              disabled={creatingKey || Boolean(activeMutation)}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleCreateKey}
              disabled={creatingKey || Boolean(activeMutation) || Boolean(statusError) || Boolean(keysError)}
            >
              {creatingKey ? <Spinner className="size-4" /> : null}
              {t("Create Key")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={!!selectedKeyId} onOpenChange={(open) => !open && setSelectedKeyId(null)} direction="right">
        <DrawerContent className="h-dvh overflow-hidden data-[vaul-drawer-direction=right]:w-[92vw] data-[vaul-drawer-direction=right]:sm:max-w-xl">
          <DrawerHeader className="relative shrink-0 border-b pe-14">
            <DrawerTitle>{t("KMS Key Details")}</DrawerTitle>
            <DrawerDescription className="break-all">{selectedKeyId || ""}</DrawerDescription>
            <DrawerClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute end-3 top-3"
                aria-label={t("Close")}
              >
                <RiCloseLine className="size-4" aria-hidden />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
            {loadingKeyDetails ? (
              <div className="flex items-center justify-center py-10">
                <Spinner className="size-5" />
              </div>
            ) : keyDetailsError ? (
              <Alert variant="destructive">
                <AlertTitle>{t("Failed to load key details")}</AlertTitle>
                <AlertDescription>{keyDetailsError}</AlertDescription>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setKeyDetailsReloadVersion((value) => value + 1)}
                >
                  {t("Refresh")}
                </Button>
              </Alert>
            ) : !keyDetails ? (
              <div className="border border-dashed py-10 text-center text-sm text-muted-foreground">
                {t("No key details available")}
              </div>
            ) : (
              <>
                <dl className="grid gap-x-6 sm:grid-cols-2">
                  <div className="border-b py-3">
                    <dt className="text-xs text-muted-foreground">{t("Name")}</dt>
                    <dd className="break-words text-sm font-medium">{getKeyDisplayName(keyDetails)}</dd>
                  </div>
                  <div className="border-b py-3">
                    <dt className="text-xs text-muted-foreground">{t("State")}</dt>
                    <dd className="pt-1">
                      <Badge variant={getStateBadgeVariant(keyDetails.key_state)}>{keyDetails.key_state || "-"}</Badge>
                    </dd>
                  </div>
                  <div className="border-b py-3">
                    <dt className="text-xs text-muted-foreground">{t("KMS Key ID")}</dt>
                    <dd className="break-all text-sm font-medium">{keyDetails.key_id}</dd>
                  </div>
                  <div className="border-b py-3">
                    <dt className="text-xs text-muted-foreground">{t("Usage")}</dt>
                    <dd className="text-sm font-medium">{keyDetails.key_usage || "-"}</dd>
                  </div>
                  <div className="border-b py-3">
                    <dt className="text-xs text-muted-foreground">{t("Creation Date")}</dt>
                    <dd className="text-sm font-medium">{formatTimestamp(keyDetails.creation_date)}</dd>
                  </div>
                  <div className="border-b py-3">
                    <dt className="text-xs text-muted-foreground">{t("Deletion Date")}</dt>
                    <dd className="text-sm font-medium">{formatTimestamp(keyDetails.deletion_date)}</dd>
                  </div>
                  <div className="border-b py-3">
                    <dt className="text-xs text-muted-foreground">{t("Origin")}</dt>
                    <dd className="text-sm font-medium">{keyDetails.origin || "-"}</dd>
                  </div>
                  <div className="border-b py-3">
                    <dt className="text-xs text-muted-foreground">{t("Key Manager")}</dt>
                    <dd className="text-sm font-medium">{keyDetails.key_manager || "-"}</dd>
                  </div>
                </dl>

                {keyDetails.description && (
                  <div className="space-y-1 border-t pt-4">
                    <p className="text-xs text-muted-foreground">{t("Description")}</p>
                    <p className="break-words text-sm">{keyDetails.description}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">{t("Tags")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(keyDetails.tags ?? {}).length > 0 ? (
                      Object.entries(keyDetails.tags ?? {}).map(([key, value]) => (
                        <Badge
                          key={key}
                          variant="outline"
                          className="h-auto max-w-full whitespace-normal break-all text-start"
                        >
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

      <AlertDialog
        open={!!pendingServiceAction}
        onOpenChange={(open) => {
          if (!open && !startingKMS && !stoppingKMS) setPendingServiceAction(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingServiceAction === "stop"
                ? t("Stop KMS")
                : pendingServiceAction === "restart"
                  ? t("Restart KMS")
                  : t("Start KMS")}
            </AlertDialogTitle>
            <AlertDialogDescription>{serviceActionDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={startingKMS || stoppingKMS}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmServiceAction}
              disabled={startingKMS || stoppingKMS || Boolean(activeMutation) || Boolean(statusError)}
              className={pendingServiceAction === "stop" ? "bg-destructive text-destructive-foreground" : undefined}
            >
              {startingKMS || stoppingKMS ? <Spinner className="size-4" /> : null}
              {pendingServiceAction === "stop" ? t("Stop KMS") : t("Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingNavigation} onOpenChange={(open) => !open && setPendingNavigation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Discard Changes")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("You have unsaved KMS changes. Do you want to discard them?")}
              {mutationInFlight ? (
                <span className="mt-2 block">
                  {t("An operation is still in progress. Wait for it to finish before leaving this page.")}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={discardConfigChangesAndNavigate}
              disabled={mutationInFlight}
              className="bg-destructive text-destructive-foreground"
            >
              {t("Discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingKeyAction}
        onOpenChange={(open) => {
          if (!open && !processingKeyAction) setPendingKeyAction(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{keyActionTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">{keyActionDescription}</span>
              <span className="mt-2 block break-all font-medium">
                {t("KMS Key ID")}: {pendingKeyAction?.key.key_id}
              </span>
              {isPendingDefaultKey && pendingKeyAction?.type !== "cancelDeletion" ? (
                <span className="mt-2 block font-medium text-destructive">
                  {t("Cannot delete the default SSE key. Choose another default key first.")}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingKeyAction}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmKeyAction}
              disabled={
                processingKeyAction ||
                Boolean(activeMutation) ||
                Boolean(statusError) ||
                Boolean(isPendingDefaultKey && pendingKeyAction?.type !== "cancelDeletion")
              }
              className={
                pendingKeyAction?.type === "forceDelete" ? "bg-destructive text-destructive-foreground" : undefined
              }
            >
              {processingKeyAction ? <Spinner className="size-4" /> : null}
              {pendingKeyAction?.type === "cancelDeletion"
                ? t("Restore Key")
                : pendingKeyAction?.type === "forceDelete"
                  ? t("Delete Key Immediately")
                  : t("Schedule Key Deletion")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
