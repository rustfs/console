"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ThemeImage } from "@/components/theme/image"
import { useTiers } from "@/hooks/use-tiers"
import { useMessage } from "@/lib/feedback/message"
import {
  TIER_PROVIDERS,
  WASABI_REGIONS,
  buildTierPayload,
  getWasabiEndpoint,
  type TierProviderType,
} from "@/lib/tier-config"
import { getThemeManifest } from "@/lib/theme/manifest"

interface TiersNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type FieldName = "name" | "region" | "accessKey" | "secretKey" | "bucket"
type FieldErrors = Partial<Record<FieldName, string>>

const FIELD_IDS: Record<FieldName, string> = {
  name: "tier-name",
  region: "tier-region",
  accessKey: "tier-access-key",
  secretKey: "tier-secret-key",
  bucket: "tier-bucket",
}

export function TiersNewForm({ open, onOpenChange, onSuccess }: TiersNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { addTiers } = useTiers()
  const theme = getThemeManifest()

  const [type, setType] = React.useState<TierProviderType | "">("")
  const [name, setName] = React.useState("")
  const [endpoint, setEndpoint] = React.useState("")
  const [accessKey, setAccessKey] = React.useState("")
  const [secretKey, setSecretKey] = React.useState("")
  const [creds, setCreds] = React.useState("")
  const [bucket, setBucket] = React.useState("")
  const [prefix, setPrefix] = React.useState("")
  const [region, setRegion] = React.useState("")
  const [storageClass, setStorageClass] = React.useState("STANDARD")
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [saveError, setSaveError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [focusTarget, setFocusTarget] = React.useState<"name" | TierProviderType | null>(null)
  const submittingRef = React.useRef(false)

  const selectedOption = TIER_PROVIDERS.find((option) => option.value === type)
  const isWasabi = type === "wasabi"
  const wasabiEndpoint = isWasabi ? getWasabiEndpoint(region) : ""

  const renderTypeIcon = (icon: string) => (
    <ThemeImage src={icon} alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
  )

  const clearProviderErrors = () => {
    setFieldErrors({})
    setSaveError("")
  }

  const handleProviderSelect = (provider: TierProviderType) => {
    setFocusTarget("name")
    clearProviderErrors()
    setType(provider)
  }

  const handleProviderBack = () => {
    if (!type) return
    const previousType = type
    setFocusTarget(previousType)
    clearProviderErrors()
    setType("")
  }

  const resetForm = React.useCallback(() => {
    setType("")
    setName("")
    setEndpoint("")
    setAccessKey("")
    setSecretKey("")
    setCreds("")
    setBucket("")
    setPrefix("")
    setRegion("")
    setStorageClass("STANDARD")
    setFieldErrors({})
    setSaveError("")
    setFocusTarget(null)
    submittingRef.current = false
    setSubmitting(false)
  }, [])

  React.useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  const clearFieldError = (field: FieldName) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validate = () => {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = t("Please enter rule name")
    if (isWasabi) {
      if (!region.trim()) errors.region = t("Region is required")
      if (!accessKey.trim()) errors.accessKey = t("Access Key is required")
      if (!secretKey.trim()) errors.secretKey = t("Secret Key is required")
      if (!bucket.trim()) errors.bucket = t("Bucket is required")
    }
    setFieldErrors(errors)
    const firstError = (Object.keys(FIELD_IDS) as FieldName[]).find((field) => errors[field])
    const firstErrorId = firstError ? FIELD_IDS[firstError] : null
    if (firstErrorId) document.getElementById(firstErrorId)?.focus()
    return !firstError
  }

  const handleSave = async () => {
    if (submittingRef.current) return
    if (!type || !validate()) return

    submittingRef.current = true
    setSubmitting(true)
    setSaveError("")
    try {
      const payload = buildTierPayload(type, {
        name,
        endpoint,
        accessKey,
        secretKey,
        creds,
        bucket,
        prefix,
        region,
        storageClass,
      })
      await addTiers(payload)
      message.success(t("Create Success"))
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      const errorMessage = (error as Error).message || t("Create Failed")
      setSaveError(errorMessage)
      message.error(errorMessage)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (submittingRef.current) return
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog
      open={open}
      disablePointerDismissal={submitting}
      onOpenChange={(nextOpen) => {
        if (!submitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[min(90dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-4 pe-12 sm:px-6">
          <DialogTitle>{t("Add Tier")}</DialogTitle>
        </DialogHeader>

        <form
          className="contents"
          aria-busy={submitting}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}
        >
          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            {!type ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {TIER_PROVIDERS.map((item) => (
                  <button
                    key={item.value}
                    id={`tier-provider-${item.value}`}
                    type="button"
                    autoFocus={focusTarget === item.value}
                    onClick={() => handleProviderSelect(item.value)}
                    className="min-h-20 cursor-pointer border border-border/70 text-start transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                  >
                    <div className="flex items-center gap-3 p-4">
                      {renderTypeIcon(item.icon)}
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold" title={t(item.labelKey)}>
                          {t(item.labelKey)}
                        </p>
                        <p className="text-sm text-muted-foreground">{t(item.descKey)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <button
                  type="button"
                  onClick={handleProviderBack}
                  className="w-full cursor-pointer border text-start transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                >
                  <div className="flex items-center gap-3 p-4">
                    {selectedOption ? renderTypeIcon(selectedOption.icon) : null}
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">{t("Selected Type")}</p>
                      <p
                        className="truncate text-base font-semibold"
                        title={type === "rustfs" ? theme.brand.name : t(selectedOption?.labelKey ?? "")}
                      >
                        {type === "rustfs" ? theme.brand.name : t(selectedOption?.labelKey ?? "")}
                      </p>
                    </div>
                  </div>
                </button>

                {saveError ? (
                  <Alert variant="destructive" role="alert">
                    <AlertTitle>{t("Create Failed")}</AlertTitle>
                    <AlertDescription>{saveError}</AlertDescription>
                  </Alert>
                ) : null}

                <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field data-invalid={Boolean(fieldErrors.name)}>
                    <FieldLabel htmlFor="tier-name">{t("Name")} (A-Z,0-9,_)</FieldLabel>
                    <FieldContent>
                      <Input
                        id="tier-name"
                        name="tier-name"
                        value={name}
                        onChange={(event) => {
                          setName(event.target.value.replace(/[^A-Za-z0-9_]/g, "").toUpperCase())
                          clearFieldError("name")
                        }}
                        placeholder={t("Please enter name")}
                        autoFocus={focusTarget === "name"}
                        required
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={Boolean(fieldErrors.name)}
                        aria-describedby={fieldErrors.name ? "tier-name-error" : undefined}
                      />
                    </FieldContent>
                    <FieldError id="tier-name-error">{fieldErrors.name}</FieldError>
                  </Field>

                  {isWasabi ? (
                    <Field data-invalid={Boolean(fieldErrors.region)}>
                      <FieldLabel htmlFor="tier-region">{t("Region")}</FieldLabel>
                      <FieldContent>
                        <Combobox
                          items={[...WASABI_REGIONS]}
                          value={WASABI_REGIONS.includes(region as (typeof WASABI_REGIONS)[number]) ? region : null}
                          inputValue={region}
                          onInputValueChange={(value) => {
                            setRegion(value)
                            clearFieldError("region")
                          }}
                          onValueChange={(value) => {
                            setRegion(value ?? "")
                            clearFieldError("region")
                          }}
                        >
                          <ComboboxInput
                            id="tier-region"
                            name="tier-region"
                            placeholder={t("Enter or select a region")}
                            required
                            autoComplete="off"
                            spellCheck={false}
                            aria-invalid={Boolean(fieldErrors.region)}
                            aria-describedby={fieldErrors.region ? "tier-region-error" : "tier-region-description"}
                          />
                          <ComboboxContent>
                            <ComboboxEmpty>{t("Use the entered region")}</ComboboxEmpty>
                            <ComboboxList>
                              {(item) => (
                                <ComboboxItem key={item} value={item}>
                                  {item}
                                </ComboboxItem>
                              )}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      </FieldContent>
                      <FieldDescription id="tier-region-description">
                        {t("Choose a suggested region or enter a new one.")}
                      </FieldDescription>
                      <FieldError id="tier-region-error">{fieldErrors.region}</FieldError>
                    </Field>
                  ) : (
                    <Field>
                      <FieldLabel htmlFor="tier-endpoint">{t("Endpoint")}</FieldLabel>
                      <FieldContent>
                        <Input
                          id="tier-endpoint"
                          name="tier-endpoint"
                          type="url"
                          value={endpoint}
                          onChange={(event) => setEndpoint(event.target.value)}
                          autoComplete="off"
                          placeholder={t("Please enter endpoint")}
                          spellCheck={false}
                        />
                      </FieldContent>
                    </Field>
                  )}

                  {isWasabi ? (
                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="tier-endpoint-preview">{t("Endpoint preview")}</FieldLabel>
                      <FieldContent>
                        <Input
                          id="tier-endpoint-preview"
                          value={wasabiEndpoint}
                          readOnly
                          placeholder={t("Endpoint is derived from the region")}
                          spellCheck={false}
                          className="font-mono"
                          aria-describedby="tier-endpoint-preview-description"
                        />
                      </FieldContent>
                      <FieldDescription id="tier-endpoint-preview-description">
                        {t("Endpoint is derived from the region and cannot be edited.")}
                      </FieldDescription>
                    </Field>
                  ) : null}

                  {type === "gcs" ? (
                    <Field className="md:col-span-2">
                      <FieldLabel htmlFor="tier-credentials">{t("Credentials")} (JSON)</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id="tier-credentials"
                          name="tier-credentials"
                          value={creds}
                          onChange={(event) => setCreds(event.target.value)}
                          placeholder={t("Please enter GCS credentials JSON")}
                          autoComplete="off"
                          spellCheck={false}
                          rows={6}
                        />
                      </FieldContent>
                    </Field>
                  ) : (
                    <>
                      <Field data-invalid={Boolean(fieldErrors.accessKey)}>
                        <FieldLabel htmlFor="tier-access-key">{t("Access Key")}</FieldLabel>
                        <FieldContent>
                          <Input
                            id="tier-access-key"
                            name="tier-access-key"
                            value={accessKey}
                            onChange={(event) => {
                              setAccessKey(event.target.value)
                              clearFieldError("accessKey")
                            }}
                            placeholder={t("Please enter Access Key")}
                            required={isWasabi}
                            autoComplete="off"
                            spellCheck={false}
                            aria-invalid={Boolean(fieldErrors.accessKey)}
                            aria-describedby={fieldErrors.accessKey ? "tier-access-key-error" : undefined}
                          />
                        </FieldContent>
                        <FieldError id="tier-access-key-error">{fieldErrors.accessKey}</FieldError>
                      </Field>
                      <Field data-invalid={Boolean(fieldErrors.secretKey)}>
                        <FieldLabel htmlFor="tier-secret-key">{t("Secret Key")}</FieldLabel>
                        <FieldContent>
                          <Input
                            id="tier-secret-key"
                            name="tier-secret-key"
                            value={secretKey}
                            onChange={(event) => {
                              setSecretKey(event.target.value)
                              clearFieldError("secretKey")
                            }}
                            type="password"
                            placeholder={t("Please enter Secret Key")}
                            required={isWasabi}
                            autoComplete="new-password"
                            spellCheck={false}
                            aria-invalid={Boolean(fieldErrors.secretKey)}
                            aria-describedby={fieldErrors.secretKey ? "tier-secret-key-error" : undefined}
                          />
                        </FieldContent>
                        <FieldError id="tier-secret-key-error">{fieldErrors.secretKey}</FieldError>
                      </Field>
                    </>
                  )}

                  <Field data-invalid={Boolean(fieldErrors.bucket)}>
                    <FieldLabel htmlFor="tier-bucket">{t("Bucket")}</FieldLabel>
                    <FieldContent>
                      <Input
                        id="tier-bucket"
                        name="tier-bucket"
                        value={bucket}
                        onChange={(event) => {
                          setBucket(event.target.value)
                          clearFieldError("bucket")
                        }}
                        autoComplete="off"
                        placeholder={t("Please enter bucket")}
                        required={isWasabi}
                        spellCheck={false}
                        aria-invalid={Boolean(fieldErrors.bucket)}
                        aria-describedby={fieldErrors.bucket ? "tier-bucket-error" : undefined}
                      />
                    </FieldContent>
                    <FieldError id="tier-bucket-error">{fieldErrors.bucket}</FieldError>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="tier-prefix">
                      {t("Prefix")} ({t("Optional")})
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="tier-prefix"
                        name="tier-prefix"
                        value={prefix}
                        onChange={(event) => setPrefix(event.target.value)}
                        autoComplete="off"
                        placeholder={t("Please enter prefix")}
                        spellCheck={false}
                      />
                    </FieldContent>
                  </Field>

                  {!isWasabi ? (
                    <>
                      <Field>
                        <FieldLabel htmlFor="tier-region">{t("Region")}</FieldLabel>
                        <FieldContent>
                          <Input
                            id="tier-region"
                            name="tier-region"
                            value={region}
                            onChange={(event) => setRegion(event.target.value)}
                            autoComplete="off"
                            placeholder={t("Please enter region")}
                            spellCheck={false}
                          />
                        </FieldContent>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="tier-storage-class">{t("Storage Class")}</FieldLabel>
                        <FieldContent>
                          <Input
                            id="tier-storage-class"
                            name="tier-storage-class"
                            value={storageClass}
                            onChange={(event) => setStorageClass(event.target.value)}
                            autoComplete="off"
                            placeholder={t("Please Enter storage class")}
                            spellCheck={false}
                          />
                        </FieldContent>
                      </Field>
                    </>
                  ) : null}
                </FieldGroup>
              </div>
            )}
          </div>

          <DialogFooter className="border-t bg-muted/20 px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={!type || submitting}>
              {submitting ? <Spinner data-icon="inline-start" /> : null}
              {submitting ? t("Saving…") : t("Save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
