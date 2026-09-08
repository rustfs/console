"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiFlaskLine,
  RiInformationLine,
  RiSaveLine,
} from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useOnDemandMigration } from "@/hooks/use-on-demand-migration"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import {
  buildOnDemandMigrationConfig,
  createOnDemandMigrationFormValues,
  getOnDemandMigrationErrorKind,
  getOnDemandMigrationServerField,
  ODM_AUTO_REGION_PROVIDERS,
  ODM_NATIVE_PROVIDERS,
  ODM_OPTIONAL_ENDPOINT_PROVIDERS,
  ON_DEMAND_MIGRATION_PROVIDERS,
  validateOnDemandMigrationForm,
} from "@/lib/on-demand-migration"
import { scheduleMicrotask } from "@/lib/schedule-microtask"
import type {
  OnDemandMigrationConfig,
  OnDemandMigrationFormField,
  OnDemandMigrationFormValues,
  OnDemandMigrationProbe,
  OnDemandMigrationProvider,
} from "@/types/on-demand-migration"

interface ConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bucketName: string
  config: OnDemandMigrationConfig | null
  moduleEnabled: boolean
  backfillActive: boolean
  onSaved: () => void | Promise<void>
}

type FormErrors = Partial<Record<OnDemandMigrationFormField, string>>

const ADVANCED_FIELDS = new Set<OnDemandMigrationFormField>([
  "negativeCacheTtlSecs",
  "inlineMaxBytes",
  "multipartPartSizeBytes",
  "maxConcurrentPulls",
  "pullQueueCapacity",
  "connectTimeoutMs",
  "firstByteTimeoutMs",
  "idleTimeoutMs",
  "bandwidthLimitBytesPerSec",
  "caCertPem",
])

const FIELD_IDS: Record<OnDemandMigrationFormField, string> = {
  enabled: "odm-enabled",
  provider: "odm-provider",
  endpoint: "odm-endpoint",
  region: "odm-region",
  bucket: "odm-source-bucket",
  pathStyle: "odm-path-style",
  accessKey: "odm-access-key",
  secretKey: "odm-secret-key",
  sessionToken: "odm-session-token",
  azureAccount: "odm-azure-account",
  azureAuth: "odm-azure-auth",
  azureSecret: "odm-azure-secret",
  serviceAccountJson: "odm-service-account-json",
  localPrefix: "odm-local-prefix",
  sourcePrefix: "odm-source-prefix",
  skipTlsVerify: "odm-skip-tls-verify",
  caCertPem: "odm-ca-cert-pem",
  head: "odm-head-policy",
  rangeGet: "odm-range-get-policy",
  sourceError: "odm-source-error-policy",
  listThrough: "odm-list-through",
  respectLocalDeleteMarker: "odm-respect-delete-marker",
  preserveEtag: "odm-preserve-etag",
  copyTags: "odm-copy-tags",
  emitEvents: "odm-emit-events",
  negativeCacheTtlSecs: "odm-negative-cache-ttl",
  inlineMaxBytes: "odm-inline-max",
  multipartPartSizeBytes: "odm-multipart-part-size",
  maxConcurrentPulls: "odm-max-concurrent-pulls",
  pullQueueCapacity: "odm-pull-queue-capacity",
  connectTimeoutMs: "odm-connect-timeout",
  firstByteTimeoutMs: "odm-first-byte-timeout",
  idleTimeoutMs: "odm-idle-timeout",
  bandwidthLimitBytesPerSec: "odm-bandwidth-limit",
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error)
}

export function OnDemandMigrationConfigDialog({
  open,
  onOpenChange,
  bucketName,
  config,
  moduleEnabled,
  backfillActive,
  onSaved,
}: ConfigDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { setConfig } = useOnDemandMigration()
  const [values, setValues] = React.useState<OnDemandMigrationFormValues>(() =>
    createOnDemandMigrationFormValues(config ?? undefined),
  )
  const [initialFingerprint, setInitialFingerprint] = React.useState("")
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [operationError, setOperationError] = React.useState<unknown>(null)
  const [probe, setProbe] = React.useState<OnDemandMigrationProbe | null>(null)
  const [testing, setTesting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [advancedOpen, setAdvancedOpen] = React.useState(false)
  const wasOpenRef = React.useRef(false)

  const fingerprint = React.useMemo(() => JSON.stringify(values), [values])
  const dirty = initialFingerprint !== "" && fingerprint !== initialFingerprint
  const nativeProvider = ODM_NATIVE_PROVIDERS.has(values.provider)
  const endpointOptional = ODM_OPTIONAL_ENDPOINT_PROVIDERS.has(values.provider)
  const editing = config !== null

  React.useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true
    scheduleMicrotask(() => {
      const nextValues = createOnDemandMigrationFormValues(config ?? undefined)
      setValues(nextValues)
      setInitialFingerprint(JSON.stringify(nextValues))
      setErrors({})
      setOperationError(null)
      setProbe(null)
      setTesting(false)
      setSaving(false)
      setAdvancedOpen(false)
    })
  }, [config, open])

  const providerItems = React.useMemo(
    () =>
      ON_DEMAND_MIGRATION_PROVIDERS.map((value) => ({
        value,
        label:
          value === "aws"
            ? t("Amazon S3")
            : value === "s3"
              ? t("S3-compatible storage")
              : value === "minio"
                ? "MinIO"
                : value === "rustfs"
                  ? "RustFS"
                  : value === "r2"
                    ? "Cloudflare R2"
                    : value === "gcs"
                      ? t("Google Cloud Storage (HMAC)")
                      : value === "azure"
                        ? t("Azure Blob Storage (Native)")
                        : t("Google Cloud Storage (Native)"),
      })),
    [t],
  )
  const providerLabel = providerItems.find((item) => item.value === values.provider)?.label ?? values.provider

  const update = React.useCallback(
    <K extends OnDemandMigrationFormField>(field: K, value: OnDemandMigrationFormValues[K]) => {
      setValues((current) => ({ ...current, [field]: value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
      setOperationError(null)
      setProbe(null)
    },
    [],
  )

  const updateProvider = (provider: OnDemandMigrationProvider) => {
    setValues((current) => {
      const native = ODM_NATIVE_PROVIDERS.has(provider)
      const region = native
        ? "auto"
        : current.region === "auto" && !ODM_AUTO_REGION_PROVIDERS.has(provider)
          ? "us-east-1"
          : current.region || (ODM_AUTO_REGION_PROVIDERS.has(provider) ? "auto" : "us-east-1")
      return { ...current, provider, region, pathStyle: native ? "auto" : current.pathStyle }
    })
    setErrors({})
    setOperationError(null)
    setProbe(null)
  }

  const validate = () => {
    const issues = validateOnDemandMigrationForm(values)
    const nextErrors: FormErrors = {}
    for (const issue of issues) nextErrors[issue.field] ??= t(issue.message)
    setErrors(nextErrors)
    if (issues[0]) {
      if (ADVANCED_FIELDS.has(issues[0].field)) {
        setAdvancedOpen(true)
      }
      scheduleMicrotask(() => document.getElementById(FIELD_IDS[issues[0].field])?.focus())
    }
    return issues.length === 0
  }

  const handleError = (error: unknown) => {
    setOperationError(error)
    const serverField = getOnDemandMigrationServerField(getErrorMessage(error))
    if (serverField) {
      setErrors((current) => ({ ...current, [serverField]: getErrorMessage(error) }))
      if (ADVANCED_FIELDS.has(serverField)) {
        setAdvancedOpen(true)
      }
      scheduleMicrotask(() => document.getElementById(FIELD_IDS[serverField])?.focus())
    }
  }

  const handleTest = async () => {
    if (!moduleEnabled || testing || saving || !validate()) return
    setTesting(true)
    setOperationError(null)
    setProbe(null)
    try {
      const response = await setConfig(bucketName, buildOnDemandMigrationConfig(values), true)
      setProbe(response.probe)
      message.success(t("Connection test passed"))
    } catch (error) {
      handleError(error)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!moduleEnabled || testing || saving || !validate()) return
    setSaving(true)
    setOperationError(null)
    try {
      await setConfig(bucketName, buildOnDemandMigrationConfig(values), false)
      message.success(editing ? t("Migration configuration updated") : t("On-demand migration enabled"))
      setInitialFingerprint("")
      onOpenChange(false)
      await onSaved()
    } catch (error) {
      handleError(error)
    } finally {
      setSaving(false)
    }
  }

  const closeNow = React.useCallback(() => {
    setInitialFingerprint("")
    onOpenChange(false)
  }, [onOpenChange])

  const requestClose = React.useCallback(() => {
    if (testing || saving) return
    if (!dirty) {
      closeNow()
      return
    }
    dialog.warning({
      title: t("Discard unsaved changes?"),
      content: t("Your migration configuration changes will be lost."),
      positiveText: t("Discard changes"),
      negativeText: t("Keep editing"),
      onPositiveClick: closeNow,
    })
  }, [closeNow, dialog, dirty, saving, t, testing])

  const renderTextField = (
    field: OnDemandMigrationFormField,
    label: string,
    description: string,
    options: React.ComponentProps<typeof Input> = {},
  ) => {
    const id = FIELD_IDS[field]
    const error = errors[field]
    const value = values[field]
    return (
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldContent>
          <Input
            {...options}
            id={id}
            name={field}
            value={typeof value === "string" ? value : ""}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-description${error ? ` ${id}-error` : ""}`}
            onChange={(event) => update(field, event.target.value as never)}
          />
          <FieldDescription id={`${id}-description`}>{description}</FieldDescription>
          <FieldError id={`${id}-error`}>{error}</FieldError>
        </FieldContent>
      </Field>
    )
  }

  const renderSwitch = (field: OnDemandMigrationFormField, label: string, description: string, disabled = false) => {
    const id = FIELD_IDS[field]
    return (
      <Field orientation="horizontal" data-disabled={disabled || undefined}>
        <FieldContent>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <FieldDescription id={`${id}-description`}>{description}</FieldDescription>
        </FieldContent>
        <Switch
          id={id}
          name={field}
          checked={Boolean(values[field])}
          disabled={disabled}
          aria-describedby={`${id}-description`}
          onCheckedChange={(checked) => update(field, checked as never)}
        />
      </Field>
    )
  }

  const errorKind = getOnDemandMigrationErrorKind(operationError)
  const errorMessage = operationError ? getErrorMessage(operationError) : ""

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) onOpenChange(true)
        else requestClose()
      }}
      disablePointerDismissal
    >
      <DialogContent
        className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-4 sm:px-6">
          <DialogTitle>{editing ? t("Edit on-demand migration") : t("Enable on-demand migration")}</DialogTitle>
          <DialogDescription>
            {t("Bucket")}: <span className="break-all font-medium text-foreground">{bucketName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {!moduleEnabled ? (
            <Alert variant="destructive">
              <RiErrorWarningLine aria-hidden />
              <AlertTitle>{t("On-demand migration is not enabled on this server")}</AlertTitle>
              <AlertDescription>
                {t("Enable RUSTFS_ON_DEMAND_MIGRATION_ENABLED on every server node, restart, and try again.")}
              </AlertDescription>
            </Alert>
          ) : null}

          {editing ? (
            <Alert>
              <RiInformationLine aria-hidden />
              <AlertTitle>{t("Credentials are write-only")}</AlertTitle>
              <AlertDescription>
                {t("For security, re-enter the source credential before testing or saving any change.")}
              </AlertDescription>
            </Alert>
          ) : null}

          {backfillActive ? (
            <Alert>
              <RiInformationLine aria-hidden />
              <AlertTitle>{t("Editing cancels the active backfill")}</AlertTitle>
              <AlertDescription>
                {t(
                  "Saving a replacement configuration cancels the current job. You can start a new backfill afterward.",
                )}
              </AlertDescription>
            </Alert>
          ) : null}

          {operationError ? (
            <Alert variant="destructive">
              <RiErrorWarningLine aria-hidden />
              <AlertTitle>
                {errorKind === "module_disabled"
                  ? t("On-demand migration is not enabled on this server")
                  : errorKind === "source_unreachable"
                    ? t("The source could not be reached")
                    : errorKind === "backend_not_compiled"
                      ? t("This backend is not included in the server build")
                      : errorKind === "license_denied"
                        ? t("The server rejected this operation")
                        : errorKind === "access_denied"
                          ? t("You do not have permission to change migration settings")
                          : t("Migration configuration could not be saved")}
              </AlertTitle>
              <AlertDescription>
                <p>{errorMessage}</p>
                {errorKind === "license_denied" ? (
                  <p>
                    <Link href="/license">{t("Open license settings")}</Link>
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {probe ? (
            <Alert>
              <RiCheckLine aria-hidden />
              <AlertTitle>{t("Connection test passed")}</AlertTitle>
              <AlertDescription>
                <p>{t("RustFS reached the source bucket and listed it successfully.")}</p>
                {probe.sample_key ? (
                  <p className="break-all">
                    {t("Sample object")}: <span className="font-mono text-foreground">{probe.sample_key}</span>
                  </p>
                ) : (
                  <p>{t("The source bucket is empty or the selected prefix has no objects.")}</p>
                )}
              </AlertDescription>
            </Alert>
          ) : null}

          <FieldGroup>
            <FieldSet>
              <FieldLegend>{t("Source connection")}</FieldLegend>

              <Field data-invalid={Boolean(errors.provider)}>
                <FieldLabel htmlFor={FIELD_IDS.provider}>{t("Provider")}</FieldLabel>
                <FieldContent>
                  <Select
                    name="provider"
                    items={providerItems}
                    value={values.provider}
                    onValueChange={(value) => value && updateProvider(value as OnDemandMigrationProvider)}
                  >
                    <SelectTrigger id={FIELD_IDS.provider} className="w-full" aria-invalid={Boolean(errors.provider)}>
                      <SelectValue>{providerLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {providerItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {values.provider === "gcs"
                      ? t("Uses the S3 interoperability API and an HMAC key pair.")
                      : values.provider === "gcs_native"
                        ? t("Uses the native GCS API and a service-account JSON key.")
                        : values.provider === "azure"
                          ? t("Uses the native Azure Blob API.")
                          : t("RustFS reads from this source and never writes or deletes objects there.")}
                  </FieldDescription>
                </FieldContent>
              </Field>

              {renderTextField(
                "endpoint",
                endpointOptional ? t("Custom endpoint (optional)") : t("Endpoint"),
                values.provider === "aws"
                  ? t("Leave empty to use the regional Amazon S3 endpoint.")
                  : values.provider === "azure"
                    ? t("Leave empty to use the account's public Azure Blob endpoint.")
                    : values.provider === "gcs_native"
                      ? t("Leave empty to use https://storage.googleapis.com.")
                      : t("Use an absolute HTTP or HTTPS URL with no path."),
                {
                  type: "url",
                  placeholder: endpointOptional ? t("Use provider default") : "https://source.example.com",
                },
              )}

              {!nativeProvider
                ? renderTextField(
                    "region",
                    t("Region"),
                    ODM_AUTO_REGION_PROVIDERS.has(values.provider)
                      ? t("Enter a real region or auto.")
                      : t("This provider requires a real region; auto is not supported."),
                    { autoComplete: "off", placeholder: "us-east-1" },
                  )
                : null}

              {renderTextField(
                "bucket",
                values.provider === "azure" ? t("Source container") : t("Source Bucket"),
                t("The existing source that RustFS will read from."),
                { autoComplete: "off" },
              )}

              {!nativeProvider ? (
                <Field>
                  <FieldLabel htmlFor={FIELD_IDS.pathStyle}>{t("Addressing style")}</FieldLabel>
                  <FieldContent>
                    <Select
                      name="pathStyle"
                      items={[
                        { value: "auto", label: t("Automatic") },
                        { value: "path", label: t("Path style") },
                        { value: "virtual", label: t("Virtual-host style") },
                      ]}
                      value={values.pathStyle}
                      onValueChange={(value) =>
                        value && update("pathStyle", value as OnDemandMigrationFormValues["pathStyle"])
                      }
                    >
                      <SelectTrigger id={FIELD_IDS.pathStyle} className="w-full">
                        <SelectValue>
                          {values.pathStyle === "auto"
                            ? t("Automatic")
                            : values.pathStyle === "path"
                              ? t("Path style")
                              : t("Virtual-host style")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="auto">{t("Automatic")}</SelectItem>
                          <SelectItem value="path">{t("Path style")}</SelectItem>
                          <SelectItem value="virtual">{t("Virtual-host style")}</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      {t("Use an explicit style when the source redirects or reports a missing bucket.")}
                    </FieldDescription>
                  </FieldContent>
                </Field>
              ) : null}

              {values.provider === "azure" ? (
                <>
                  {renderTextField(
                    "azureAccount",
                    t("Azure storage account"),
                    t("Used to derive the public endpoint when no custom endpoint is set."),
                    { autoComplete: "off" },
                  )}
                  <Field>
                    <FieldLabel htmlFor={FIELD_IDS.azureAuth}>{t("Azure credential type")}</FieldLabel>
                    <FieldContent>
                      <Select
                        name="azureAuth"
                        items={[
                          { value: "account_key", label: t("Account key") },
                          { value: "sas_token", label: t("SAS token") },
                        ]}
                        value={values.azureAuth}
                        onValueChange={(value) =>
                          value && update("azureAuth", value as OnDemandMigrationFormValues["azureAuth"])
                        }
                      >
                        <SelectTrigger id={FIELD_IDS.azureAuth} className="w-full">
                          <SelectValue>
                            {values.azureAuth === "account_key" ? t("Account key") : t("SAS token")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="account_key">{t("Account key")}</SelectItem>
                            <SelectItem value="sas_token">{t("SAS token")}</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FieldContent>
                  </Field>
                  {renderTextField(
                    "azureSecret",
                    values.azureAuth === "account_key" ? t("Account key") : t("SAS token"),
                    values.azureAuth === "account_key"
                      ? t("Enter the Base64 storage account key.")
                      : t("Enter the SAS query string without a leading question mark."),
                    { type: "password", autoComplete: "new-password" },
                  )}
                </>
              ) : values.provider === "gcs_native" ? (
                <Field data-invalid={Boolean(errors.serviceAccountJson)}>
                  <FieldLabel htmlFor={FIELD_IDS.serviceAccountJson}>{t("Service-account JSON key")}</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id={FIELD_IDS.serviceAccountJson}
                      name="serviceAccountJson"
                      value={values.serviceAccountJson}
                      className="min-h-36 font-mono"
                      spellCheck={false}
                      autoComplete="off"
                      aria-invalid={Boolean(errors.serviceAccountJson)}
                      aria-describedby={`${FIELD_IDS.serviceAccountJson}-description${errors.serviceAccountJson ? ` ${FIELD_IDS.serviceAccountJson}-error` : ""}`}
                      onChange={(event) => update("serviceAccountJson", event.target.value)}
                    />
                    <FieldDescription id={`${FIELD_IDS.serviceAccountJson}-description`}>
                      {t("Use a service account with storage.objects.get and storage.objects.list.")}
                    </FieldDescription>
                    <FieldError id={`${FIELD_IDS.serviceAccountJson}-error`}>{errors.serviceAccountJson}</FieldError>
                  </FieldContent>
                </Field>
              ) : (
                <>
                  {renderTextField(
                    "accessKey",
                    t("Access Key"),
                    t("Use a read-only key scoped to the source bucket."),
                    {
                      autoComplete: "username",
                    },
                  )}
                  {renderTextField(
                    "secretKey",
                    t("Secret Key"),
                    t("The secret is stored by RustFS but never returned to the Console."),
                    { type: "password", autoComplete: "new-password" },
                  )}
                  {renderTextField(
                    "sessionToken",
                    t("Session token (optional)"),
                    t("Provide it only when the source credentials require a session token."),
                    { type: "password", autoComplete: "new-password" },
                  )}
                </>
              )}
            </FieldSet>

            <FieldSet>
              <FieldLegend>{t("Key mapping")}</FieldLegend>
              {renderTextField(
                "localPrefix",
                t("Local prefix (optional)"),
                t("Only local keys with this prefix will consult the source."),
                { autoComplete: "off", placeholder: "archive/" },
              )}
              {renderTextField(
                "sourcePrefix",
                t("Source prefix (optional)"),
                t("Prepended to the local key when RustFS reads the source."),
                { autoComplete: "off", placeholder: "legacy/" },
              )}
            </FieldSet>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger
                render={<Button type="button" variant="outline" className="w-full justify-between" />}
              >
                <span>{t("Advanced Settings")}</span>
                <RiArrowDownSLine
                  data-icon="inline-end"
                  className={advancedOpen ? "rotate-180 transition-transform" : "transition-transform"}
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-5">
                <FieldGroup>
                  <FieldSet>
                    <FieldLegend>{t("Read behavior")}</FieldLegend>
                    {renderSwitch(
                      "enabled",
                      t("Migration active"),
                      t("Turn off to keep the saved configuration without consulting the source."),
                    )}

                    <Field>
                      <FieldLabel htmlFor={FIELD_IDS.head}>{t("HEAD requests")}</FieldLabel>
                      <FieldContent>
                        <Select
                          name="head"
                          items={[
                            { value: "proxy", label: t("Read from source on a miss") },
                            { value: "local_only", label: t("Local only") },
                          ]}
                          value={values.head}
                          onValueChange={(value) =>
                            value && update("head", value as OnDemandMigrationFormValues["head"])
                          }
                        >
                          <SelectTrigger id={FIELD_IDS.head} className="w-full">
                            <SelectValue>
                              {values.head === "proxy" ? t("Read from source on a miss") : t("Local only")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="proxy">{t("Read from source on a miss")}</SelectItem>
                              <SelectItem value="local_only">{t("Local only")}</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor={FIELD_IDS.rangeGet}>{t("Range GET requests")}</FieldLabel>
                      <FieldContent>
                        <Select
                          name="rangeGet"
                          items={[
                            { value: "serve_and_backfill", label: t("Serve range and queue the full object") },
                            { value: "serve_only", label: t("Serve range only") },
                          ]}
                          value={values.rangeGet}
                          onValueChange={(value) =>
                            value && update("rangeGet", value as OnDemandMigrationFormValues["rangeGet"])
                          }
                        >
                          <SelectTrigger id={FIELD_IDS.rangeGet} className="w-full">
                            <SelectValue>
                              {values.rangeGet === "serve_and_backfill"
                                ? t("Serve range and queue the full object")
                                : t("Serve range only")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="serve_and_backfill">
                                {t("Serve range and queue the full object")}
                              </SelectItem>
                              <SelectItem value="serve_only">{t("Serve range only")}</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FieldContent>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor={FIELD_IDS.sourceError}>{t("Source error response")}</FieldLabel>
                      <FieldContent>
                        <Select
                          name="sourceError"
                          items={[
                            { value: "propagate", label: t("Return SourceUnavailable") },
                            { value: "not_found", label: t("Return Not Found") },
                          ]}
                          value={values.sourceError}
                          onValueChange={(value) =>
                            value && update("sourceError", value as OnDemandMigrationFormValues["sourceError"])
                          }
                        >
                          <SelectTrigger id={FIELD_IDS.sourceError} className="w-full">
                            <SelectValue>
                              {values.sourceError === "propagate"
                                ? t("Return SourceUnavailable")
                                : t("Return Not Found")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="propagate">{t("Return SourceUnavailable")}</SelectItem>
                              <SelectItem value="not_found">{t("Return Not Found")}</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          {t(
                            "Returning Not Found can make sync clients treat a temporary source failure as a deletion.",
                          )}
                        </FieldDescription>
                      </FieldContent>
                    </Field>

                    {renderSwitch(
                      "listThrough",
                      t("Include source objects in ListObjectsV2"),
                      t("Adds source requests to listings so clients can see objects not yet migrated."),
                    )}
                    {renderSwitch(
                      "respectLocalDeleteMarker",
                      t("Respect local delete markers"),
                      t("A local versioned delete marker prevents the object from being pulled again."),
                    )}
                    {renderSwitch(
                      "preserveEtag",
                      t("Preserve source ETag"),
                      t("Keep the source ETag unless local bucket encryption replaces it."),
                    )}
                    {renderSwitch(
                      "copyTags",
                      t("Copy object tags"),
                      values.provider === "gcs_native"
                        ? t("Native GCS has no object tags, so no tags will be copied.")
                        : t("Requires source tag-read permission and adds one request per pull."),
                    )}
                    {renderSwitch(
                      "emitEvents",
                      t("Emit object-created events"),
                      t("Send normal bucket notifications when a pulled object is stored locally."),
                    )}
                  </FieldSet>

                  <FieldSet>
                    <FieldLegend>{t("Performance and limits")}</FieldLegend>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {renderTextField(
                        "negativeCacheTtlSecs",
                        t("Negative cache TTL (seconds)"),
                        t("0 disables the cache; maximum 3600."),
                        { type: "number", min: 0, max: 3600, step: 1, inputMode: "numeric" },
                      )}
                      {renderTextField(
                        "inlineMaxBytes",
                        t("Inline object limit (bytes)"),
                        t(
                          "0–268435456 bytes (256 MiB). Larger objects are served first and queued for background pull.",
                        ),
                        { type: "number", min: 0, max: 268435456, step: 1, inputMode: "numeric" },
                      )}
                      {renderTextField(
                        "multipartPartSizeBytes",
                        t("Multipart part size (bytes)"),
                        t("5242880–5368709120 bytes (5 MiB–5 GiB)."),
                        { type: "number", min: 5242880, max: 5368709120, step: 1, inputMode: "numeric" },
                      )}
                      {renderTextField(
                        "maxConcurrentPulls",
                        t("Concurrent pulls"),
                        t("1–256 across inline, background, and backfill work."),
                        { type: "number", min: 1, max: 256, step: 1, inputMode: "numeric" },
                      )}
                      {renderTextField(
                        "pullQueueCapacity",
                        t("Pull queue capacity"),
                        t("1–65536 waiting background pulls."),
                        { type: "number", min: 1, max: 65536, step: 1, inputMode: "numeric" },
                      )}
                      {renderTextField(
                        "bandwidthLimitBytesPerSec",
                        t("Bandwidth limit (bytes/s, optional)"),
                        t("Leave empty for unlimited; the server minimum is 65536 bytes/s."),
                        { type: "number", min: 65536, step: 1, inputMode: "numeric" },
                      )}
                      {renderTextField("connectTimeoutMs", t("Connect timeout (ms)"), t("100–600000 ms."), {
                        type: "number",
                        min: 100,
                        max: 600000,
                        step: 1,
                        inputMode: "numeric",
                      })}
                      {renderTextField("firstByteTimeoutMs", t("First-byte timeout (ms)"), t("100–600000 ms."), {
                        type: "number",
                        min: 100,
                        max: 600000,
                        step: 1,
                        inputMode: "numeric",
                      })}
                      {renderTextField(
                        "idleTimeoutMs",
                        t("Idle timeout (ms)"),
                        t("100–600000 ms between source body chunks."),
                        { type: "number", min: 100, max: 600000, step: 1, inputMode: "numeric" },
                      )}
                    </div>
                  </FieldSet>

                  <FieldSet>
                    <FieldLegend>{t("TLS")}</FieldLegend>
                    {renderSwitch(
                      "skipTlsVerify",
                      t("Skip TLS certificate verification"),
                      t("Use only in a trusted test environment. Prefer a custom CA certificate."),
                    )}
                    <Field data-invalid={Boolean(errors.caCertPem)}>
                      <FieldLabel htmlFor={FIELD_IDS.caCertPem}>{t("CA certificate (PEM, optional)")}</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id={FIELD_IDS.caCertPem}
                          name="caCertPem"
                          value={values.caCertPem}
                          className="min-h-28 font-mono"
                          spellCheck={false}
                          autoComplete="off"
                          aria-invalid={Boolean(errors.caCertPem)}
                          aria-describedby={`${FIELD_IDS.caCertPem}-description${errors.caCertPem ? ` ${FIELD_IDS.caCertPem}-error` : ""}`}
                          onChange={(event) => update("caCertPem", event.target.value)}
                        />
                        <FieldDescription id={`${FIELD_IDS.caCertPem}-description`}>
                          {t("Paste the issuing certificate when the source uses a private CA.")}
                        </FieldDescription>
                        <FieldError id={`${FIELD_IDS.caCertPem}-error`}>{errors.caCertPem}</FieldError>
                      </FieldContent>
                    </Field>
                  </FieldSet>
                </FieldGroup>
              </CollapsibleContent>
            </Collapsible>
          </FieldGroup>
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-0"
            onClick={requestClose}
            disabled={testing || saving}
          >
            {t("Cancel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-0"
            onClick={handleTest}
            disabled={!moduleEnabled || testing || saving}
          >
            {testing ? <Spinner data-icon="inline-start" /> : <RiFlaskLine data-icon="inline-start" aria-hidden />}
            {testing ? t("Testing connection") : t("Test connection")}
          </Button>
          <Button
            type="button"
            className="min-h-11 sm:min-h-0"
            onClick={handleSave}
            disabled={!moduleEnabled || testing || saving}
          >
            {saving ? <Spinner data-icon="inline-start" /> : <RiSaveLine data-icon="inline-start" aria-hidden />}
            {saving ? t("Saving") : editing ? t("Save changes") : t("Enable migration")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
