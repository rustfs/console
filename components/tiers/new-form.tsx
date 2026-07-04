"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { ThemeImage } from "@/components/theme/image"
import { useTiers } from "@/hooks/use-tiers"
import { useMessage } from "@/lib/feedback/message"
import { getThemeManifest } from "@/lib/theme/manifest"

interface TiersNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const TYPE_OPTIONS = [
  { labelKey: "RustFS", value: "rustfs", icon: "/logo.svg", descKey: "RustFS built-in cold storage" },
  { labelKey: "MinIO", value: "minio", icon: "/svg/minio.svg", descKey: "External MinIO tier" },
  { labelKey: "AWS S3", value: "s3", icon: "/svg/aws.svg", descKey: "Standard AWS S3 tier" },
  {
    labelKey: "Alibaba Cloud",
    value: "aliyun",
    icon: "/svg/aliyun.svg",
    descKey: "Alibaba Cloud Object Storage Service",
  },
  { labelKey: "Azure Blob", value: "azure", icon: "/svg/azure.svg", descKey: "Microsoft Azure Blob Storage" },
  { labelKey: "Google Cloud Storage", value: "gcs", icon: "/svg/google.svg", descKey: "Google Cloud Storage" },
  { labelKey: "Cloudflare R2", value: "r2", icon: "/svg/cloudflare.svg", descKey: "Cloudflare R2 Storage" },
] as const

export function TiersNewForm({ open, onOpenChange, onSuccess }: TiersNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { addTiers } = useTiers()
  const theme = getThemeManifest()

  const [type, setType] = React.useState("")
  const [name, setName] = React.useState("")
  const [endpoint, setEndpoint] = React.useState("")
  const [accesskey, setAccesskey] = React.useState("")
  const [secretkey, setSecretkey] = React.useState("")
  const [creds, setCreds] = React.useState("")
  const [bucket, setBucket] = React.useState("")
  const [prefix, setPrefix] = React.useState("")
  const [region, setRegion] = React.useState("")
  const [storageclass, setStorageclass] = React.useState("STANDARD")
  const [nameError, setNameError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const selectedOption = TYPE_OPTIONS.find((o) => o.value === type)

  const renderTypeIcon = (icon: string) => {
    return <ThemeImage src={icon} alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
  }

  const resetForm = React.useCallback(() => {
    setType("")
    setName("")
    setEndpoint("")
    setAccesskey("")
    setSecretkey("")
    setCreds("")
    setBucket("")
    setPrefix("")
    setRegion("")
    setStorageclass("STANDARD")
    setNameError("")
  }, [])

  React.useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, resetForm])

  const filterName = (v: string) => {
    return v.replace(/[^A-Za-z0-9_]/g, "").toUpperCase()
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(filterName(e.target.value))
  }

  const validate = () => {
    if (!type) {
      message.error(t("Please select rule type"))
      return false
    }
    if (!name) {
      setNameError(t("Please enter rule name"))
      return false
    }
    setNameError("")
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSubmitting(true)
    try {
      const config: Record<string, unknown> = {
        name,
        endpoint,
        bucket,
        prefix,
        region,
        storageClass: storageclass,
      }
      if (type === "gcs") {
        config.creds = creds
      } else {
        config.accessKey = accesskey
        config.secretKey = secretkey
      }
      const payload = { type, [type]: config }
      await addTiers(payload)
      message.success(t("Create Success"))
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      message.error((error as Error).message || t("Create Failed"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setSubmitting(false)
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Add Tier")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {!type ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {TYPE_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setType(item.value)}
                  className="cursor-pointer border border-border/70 text-start transition hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
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
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => setType("")}
                className="w-full cursor-pointer border text-start transition hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                <div className="flex items-center gap-3 p-4">
                  {selectedOption ? renderTypeIcon(selectedOption.icon) : null}
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{t("Selected Type")}</p>
                    <p className="truncate text-base font-semibold" title={type === "rustfs" ? theme.brand.name : type}>
                      {type === "rustfs" ? theme.brand.name : type}
                    </p>
                  </div>
                </div>
              </button>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="tier-name">{t("Name")} (A-Z,0-9,_)</FieldLabel>
                  <FieldContent>
                    <Input
                      id="tier-name"
                      name="tier-name"
                      value={name}
                      onChange={handleNameChange}
                      placeholder={t("Please enter name")}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </FieldContent>
                  {nameError && <FieldDescription className="text-destructive">{nameError}</FieldDescription>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="tier-endpoint">{t("Endpoint")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="tier-endpoint"
                      name="tier-endpoint"
                      type="url"
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      autoComplete="off"
                      placeholder={t("Please enter endpoint")}
                      spellCheck={false}
                    />
                  </FieldContent>
                </Field>

                {type === "gcs" ? (
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="tier-credentials">{t("Credentials")} (JSON)</FieldLabel>
                    <FieldContent>
                      <Textarea
                        id="tier-credentials"
                        name="tier-credentials"
                        value={creds}
                        onChange={(e) => setCreds(e.target.value)}
                        placeholder={t("Please enter GCS credentials JSON")}
                        autoComplete="off"
                        spellCheck={false}
                        rows={6}
                      />
                    </FieldContent>
                  </Field>
                ) : (
                  <>
                    <Field>
                      <FieldLabel htmlFor="tier-access-key">{t("Access Key")}</FieldLabel>
                      <FieldContent>
                        <Input
                          id="tier-access-key"
                          name="tier-access-key"
                          value={accesskey}
                          onChange={(e) => setAccesskey(e.target.value)}
                          placeholder={t("Please enter Access Key")}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="tier-secret-key">{t("Secret Key")}</FieldLabel>
                      <FieldContent>
                        <Input
                          id="tier-secret-key"
                          name="tier-secret-key"
                          value={secretkey}
                          onChange={(e) => setSecretkey(e.target.value)}
                          type="password"
                          placeholder={t("Please enter Secret Key")}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </FieldContent>
                    </Field>
                  </>
                )}

                <Field>
                  <FieldLabel htmlFor="tier-bucket">{t("Bucket")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="tier-bucket"
                      name="tier-bucket"
                      value={bucket}
                      onChange={(e) => setBucket(e.target.value)}
                      autoComplete="off"
                      placeholder={t("Please enter bucket")}
                      spellCheck={false}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="tier-prefix">{t("Prefix")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="tier-prefix"
                      name="tier-prefix"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      autoComplete="off"
                      placeholder={t("Please enter prefix")}
                      spellCheck={false}
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="tier-region">{t("Region")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="tier-region"
                      name="tier-region"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
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
                      value={storageclass}
                      onChange={(e) => setStorageclass(e.target.value)}
                      autoComplete="off"
                      placeholder={t("Please Enter storage class")}
                      spellCheck={false}
                    />
                  </FieldContent>
                </Field>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!type} aria-disabled={submitting}>
            {submitting ? t("Saving…") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
