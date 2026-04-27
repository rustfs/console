"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { ProviderList } from "@/components/oidc/provider-list"
import { OidcForm } from "@/components/oidc/form"
import { useOidcConfig } from "@/hooks/use-oidc-config"
import { usePermissions } from "@/hooks/use-permissions"
import { CONSOLE_SCOPES } from "@/lib/console-permissions"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import type {
  OidcConfigProvider,
  OidcProviderFormErrors,
  OidcProviderFormValues,
  SaveOidcConfigPayload,
  ValidateOidcConfigPayload,
  ValidateOidcConfigResponse,
} from "@/types/oidc"
import { DEFAULT_OIDC_FORM_VALUES } from "@/types/oidc"

function cloneDefaultFormValues(): OidcProviderFormValues {
  return { ...DEFAULT_OIDC_FORM_VALUES }
}

function providerToFormValues(provider: OidcConfigProvider): OidcProviderFormValues {
  return {
    provider_id: provider.provider_id,
    enabled: provider.enabled,
    display_name: provider.display_name,
    config_url: provider.config_url,
    client_id: provider.client_id,
    client_secret: "",
    scopes: provider.scopes.join(","),
    other_audiences: provider.other_audiences.join(","),
    redirect_uri: provider.redirect_uri,
    redirect_uri_dynamic: provider.redirect_uri_dynamic,
    claim_name: provider.claim_name,
    claim_prefix: provider.claim_prefix,
    role_policy: provider.role_policy,
    groups_claim: provider.groups_claim,
    roles_claim: provider.roles_claim ?? "",
    email_claim: provider.email_claim,
    username_claim: provider.username_claim,
  }
}

function trimOrEmpty(value: string) {
  return value.trim()
}

function parseList(values: string) {
  return values
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function isAbsoluteHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function validateForm(
  values: OidcProviderFormValues,
  options: {
    requireProviderId: boolean
    requireClientSecret: boolean
  },
  t: (key: string) => string,
) {
  const errors: OidcProviderFormErrors = {}
  const providerId = trimOrEmpty(values.provider_id)
  const configUrl = trimOrEmpty(values.config_url)
  const clientId = trimOrEmpty(values.client_id)
  const clientSecret = trimOrEmpty(values.client_secret)
  const redirectUri = trimOrEmpty(values.redirect_uri)
  const scopes = parseList(values.scopes)

  if (options.requireProviderId) {
    if (!providerId) {
      errors.provider_id = t("Provider ID is required")
    } else if (!/^[A-Za-z0-9_-]+$/.test(providerId)) {
      errors.provider_id = t("Provider ID may only contain letters, numbers, underscores, and hyphens")
    }
  }

  if (!configUrl) {
    errors.config_url = t("Configuration URL is required")
  } else if (!isAbsoluteHttpUrl(configUrl)) {
    errors.config_url = t("Configuration URL must be a valid HTTP or HTTPS URL")
  }

  if (!clientId) {
    errors.client_id = t("Client ID is required")
  }

  if (options.requireClientSecret && !clientSecret) {
    errors.client_secret = t("Client Secret is required")
  }

  if (scopes.length === 0 || !scopes.includes("openid")) {
    errors.scopes = t("Scopes must include openid")
  }

  if (!values.redirect_uri_dynamic) {
    if (!redirectUri) {
      errors.redirect_uri = t("Redirect URI is required when dynamic redirect is disabled")
    } else if (!isAbsoluteHttpUrl(redirectUri)) {
      errors.redirect_uri = t("Redirect URI must be an absolute HTTP or HTTPS URL")
    }
  }

  return errors
}

function buildSavePayload(values: OidcProviderFormValues): SaveOidcConfigPayload {
  const payload: SaveOidcConfigPayload = {
    enabled: values.enabled,
    display_name: trimOrEmpty(values.display_name),
    config_url: trimOrEmpty(values.config_url),
    client_id: trimOrEmpty(values.client_id),
    scopes: parseList(values.scopes),
    other_audiences: parseList(values.other_audiences),
    redirect_uri: trimOrEmpty(values.redirect_uri),
    redirect_uri_dynamic: values.redirect_uri_dynamic,
    claim_name: trimOrEmpty(values.claim_name),
    claim_prefix: trimOrEmpty(values.claim_prefix),
    role_policy: trimOrEmpty(values.role_policy),
    groups_claim: trimOrEmpty(values.groups_claim),
    roles_claim: trimOrEmpty(values.roles_claim),
    email_claim: trimOrEmpty(values.email_claim),
    username_claim: trimOrEmpty(values.username_claim),
  }

  const clientSecret = trimOrEmpty(values.client_secret)
  if (clientSecret) {
    payload.client_secret = clientSecret
  }

  return payload
}

function buildValidatePayload(values: OidcProviderFormValues): ValidateOidcConfigPayload {
  return {
    provider_id: trimOrEmpty(values.provider_id),
    config_url: trimOrEmpty(values.config_url),
    client_id: trimOrEmpty(values.client_id),
    client_secret: trimOrEmpty(values.client_secret),
    scopes: parseList(values.scopes),
    other_audiences: parseList(values.other_audiences),
    redirect_uri: trimOrEmpty(values.redirect_uri),
    redirect_uri_dynamic: values.redirect_uri_dynamic,
  }
}

export default function OidcPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { getOidcConfig, saveOidcConfig, deleteOidcConfig, validateOidcConfig } = useOidcConfig()
  const { isAdmin, hasPermission } = usePermissions()
  const canUpdateOidcProviders = isAdmin || hasPermission(["admin:ConfigUpdate", CONSOLE_SCOPES.CONSOLE_ADMIN], false)

  const [providers, setProviders] = useState<OidcConfigProvider[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<OidcProviderFormValues>(cloneDefaultFormValues)
  const [baselineValues, setBaselineValues] = useState<OidcProviderFormValues>(cloneDefaultFormValues)
  const [formErrors, setFormErrors] = useState<OidcProviderFormErrors>({})
  const [validateResult, setValidateResult] = useState<ValidateOidcConfigResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [restartRequired, setRestartRequired] = useState(false)
  const selectedProviderIdRef = useRef<string | null>(null)

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.provider_id === selectedProviderId) ?? null,
    [providers, selectedProviderId],
  )
  const isCreateMode = selectedProvider === null
  const isProviderReadOnly = selectedProvider?.editable === false || selectedProvider?.source === "env"
  const isReadOnly = !canUpdateOidcProviders || isProviderReadOnly
  const isDirty = JSON.stringify(formValues) !== JSON.stringify(baselineValues)

  const applySelection = useCallback((providerId: string | null, nextProviders: OidcConfigProvider[]) => {
    const nextProvider = providerId
      ? (nextProviders.find((provider) => provider.provider_id === providerId) ?? null)
      : null
    const nextFormValues = nextProvider ? providerToFormValues(nextProvider) : cloneDefaultFormValues()
    const nextProviderId = nextProvider?.provider_id ?? null

    selectedProviderIdRef.current = nextProviderId
    setSelectedProviderId(nextProviderId)
    setFormValues(nextFormValues)
    setBaselineValues(nextFormValues)
    setFormErrors({})
    setValidateResult(null)
  }, [])

  const loadProviders = useCallback(
    async (preferredProviderId?: string | null) => {
      setLoading(true)
      try {
        const response = await getOidcConfig()
        const nextProviders = response?.providers ?? []
        setProviders(nextProviders)
        setRestartRequired(Boolean(response?.restart_required))

        const candidateProviderId =
          preferredProviderId !== undefined
            ? preferredProviderId
            : selectedProviderIdRef.current &&
                nextProviders.some((provider) => provider.provider_id === selectedProviderIdRef.current)
              ? selectedProviderIdRef.current
              : (nextProviders[0]?.provider_id ?? null)

        applySelection(candidateProviderId, nextProviders)
      } catch (error) {
        message.error((error as Error).message || t("Failed to load OIDC providers"))
        setProviders([])
        applySelection(null, [])
      } finally {
        setLoading(false)
      }
    },
    [applySelection, getOidcConfig, message, t],
  )

  useEffect(() => {
    void loadProviders()
  }, [loadProviders])

  useEffect(() => {
    if (!isDirty) return

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  const confirmDiscardChanges = useCallback(
    (onConfirm: () => void) => {
      dialog.warning({
        title: t("Discard Changes"),
        content: t("You have unsaved OIDC changes. Do you want to discard them?"),
        positiveText: t("Discard"),
        negativeText: t("Cancel"),
        onPositiveClick: () => {
          onConfirm()
        },
      })
    },
    [dialog, t],
  )

  const requestSelection = useCallback(
    (providerId: string | null) => {
      if (providerId === null && !canUpdateOidcProviders) return

      const isSameSelection =
        (providerId === null && selectedProviderIdRef.current === null) || providerId === selectedProviderIdRef.current
      if (isSameSelection) return

      const select = () => applySelection(providerId, providers)
      if (isDirty) {
        confirmDiscardChanges(select)
        return
      }
      select()
    },
    [applySelection, canUpdateOidcProviders, confirmDiscardChanges, isDirty, providers],
  )

  const handleFieldChange = useCallback(
    <K extends keyof OidcProviderFormValues>(field: K, value: OidcProviderFormValues[K]) => {
      setFormValues((current) => ({ ...current, [field]: value }))
      setFormErrors((current) => {
        if (!current[field]) return current
        const next = { ...current }
        delete next[field]
        return next
      })
      setValidateResult(null)
    },
    [],
  )

  const handleSave = useCallback(async () => {
    if (!canUpdateOidcProviders) {
      message.warning(t("You do not have permission to update OIDC providers."))
      return
    }
    if (isProviderReadOnly) return

    const errors = validateForm(
      formValues,
      {
        requireProviderId: true,
        requireClientSecret: isCreateMode,
      },
      t,
    )

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      message.error(t("Please fix the form errors before saving"))
      return
    }

    setSaving(true)
    try {
      const providerId = trimOrEmpty(formValues.provider_id)
      const response = await saveOidcConfig(providerId, buildSavePayload(formValues))

      message.success(response?.message || t("OIDC provider saved"), {
        description: t("Changes will take effect after RustFS restarts"),
      })
      setRestartRequired(Boolean(response?.restart_required))
      await loadProviders(providerId)
    } catch (error) {
      message.error((error as Error).message || t("Failed to save OIDC provider"))
    } finally {
      setSaving(false)
    }
  }, [canUpdateOidcProviders, formValues, isCreateMode, isProviderReadOnly, loadProviders, message, saveOidcConfig, t])

  const handleValidate = useCallback(async () => {
    if (!isCreateMode) return
    if (!canUpdateOidcProviders) {
      message.warning(t("You do not have permission to update OIDC providers."))
      return
    }
    if (isProviderReadOnly) return

    const errors = validateForm(
      formValues,
      {
        requireProviderId: true,
        requireClientSecret: true,
      },
      t,
    )

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      message.error(t("Please fix the form errors before validating"))
      return
    }

    setValidating(true)
    try {
      const response = await validateOidcConfig(buildValidatePayload(formValues))
      setValidateResult(response)

      if (response.valid) {
        message.success(t("OIDC configuration validated successfully"))
      } else {
        message.error(response.message || t("Failed to validate OIDC configuration"))
      }
    } catch (error) {
      setValidateResult(null)
      message.error((error as Error).message || t("Failed to validate OIDC configuration"))
    } finally {
      setValidating(false)
    }
  }, [canUpdateOidcProviders, formValues, isCreateMode, isProviderReadOnly, message, t, validateOidcConfig])

  const performDelete = useCallback(async () => {
    if (!selectedProvider) return
    if (!canUpdateOidcProviders) {
      message.warning(t("You do not have permission to update OIDC providers."))
      return
    }
    if (isProviderReadOnly) return

    setSaving(true)
    try {
      const response = await deleteOidcConfig(selectedProvider.provider_id)
      message.success(response?.message || t("OIDC provider deleted"), {
        description: t("Changes will take effect after RustFS restarts"),
      })
      setRestartRequired(Boolean(response?.restart_required))
      await loadProviders()
    } catch (error) {
      message.error((error as Error).message || t("Failed to delete OIDC provider"))
    } finally {
      setSaving(false)
    }
  }, [canUpdateOidcProviders, deleteOidcConfig, isProviderReadOnly, loadProviders, message, selectedProvider, t])

  const handleDelete = useCallback(() => {
    if (!selectedProvider) return
    if (!canUpdateOidcProviders) {
      message.warning(t("You do not have permission to update OIDC providers."))
      return
    }
    if (isProviderReadOnly) return

    dialog.error({
      title: t("Delete"),
      content: t("Are you sure you want to delete this OIDC provider?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: performDelete,
    })
  }, [canUpdateOidcProviders, dialog, isProviderReadOnly, message, performDelete, selectedProvider, t])

  return (
    <Page>
      <PageHeader>
        <h1 className="text-2xl font-bold">{t("OIDC Providers")}</h1>
      </PageHeader>

      <div className="space-y-4">
        <Alert>
          <AlertTitle>{t("Environment Managed")}</AlertTitle>
          <AlertDescription className="space-y-1">
            <p>{t("Environment-managed providers are read-only")}</p>
            <p>{t("Changes will take effect after RustFS restarts")}</p>
          </AlertDescription>
        </Alert>

        {!canUpdateOidcProviders ? (
          <Alert>
            <AlertTitle>{t("Read-only OIDC settings")}</AlertTitle>
            <AlertDescription>{t("You do not have permission to update OIDC providers.")}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <ProviderList
            providers={providers}
            loading={loading}
            selectedProviderId={selectedProviderId}
            canAddProvider={canUpdateOidcProviders}
            onAddProvider={() => requestSelection(null)}
            onSelectProvider={(providerId) => requestSelection(providerId)}
          />

          <OidcForm
            values={formValues}
            errors={formErrors}
            source={selectedProvider?.source}
            isCreateMode={isCreateMode}
            isReadOnly={isReadOnly}
            secretConfigured={selectedProvider?.client_secret_configured ?? false}
            restartRequired={restartRequired}
            readOnlyDescription={
              !canUpdateOidcProviders ? t("You do not have permission to update OIDC providers.") : undefined
            }
            isSaving={saving}
            isValidating={validating}
            validateResult={validateResult}
            onChange={handleFieldChange}
            onSave={handleSave}
            onValidate={handleValidate}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </Page>
  )
}
