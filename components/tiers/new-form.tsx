"use client"

import * as React from "react"
import Image from "next/image"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { useTiers } from "@/hooks/use-tiers"
import { useMessage } from "@/lib/feedback/message"
import { buildRoute } from "@/lib/routes"
import { cn } from "@/lib/utils"
import logoImage from "@/assets/logo.svg"

interface TiersNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const TYPE_OPTIONS = [
  { labelKey: "RustFS", value: "rustfs", icon: "/logo.svg", descKey: "RustFS built-in cold storage" },
  { labelKey: "Minio", value: "minio", icon: "/svg/minio.svg", descKey: "External MinIO tier" },
  { labelKey: "AWS S3", value: "s3", icon: "/svg/aws.svg", descKey: "Standard AWS S3 tier" },
  { labelKey: "Aliyun OSS", value: "aliyun", icon: "/svg/aliyun.svg", descKey: "Alibaba Cloud Object Storage Service" },
  { labelKey: "Tencent COS", value: "tencent", icon: "/svg/tenxunyun.svg", descKey: "Tencent Cloud Object Storage" },
  { labelKey: "Huawei OBS", value: "huaweicloud", icon: "/svg/huaweiyun.svg", descKey: "Huawei Cloud Object Storage Service" },
  { labelKey: "Azure Blob", value: "azure", icon: "/svg/azure.svg", descKey: "Microsoft Azure Blob Storage" },
  { labelKey: "Google Cloud Storage", value: "gcs", icon: "/svg/google.svg", descKey: "Google Cloud Storage" },
  { labelKey: "Cloudflare R2", value: "r2", icon: "/svg/cloudflare.svg", descKey: "Cloudflare R2 Storage" },
] as const

export function TiersNewForm({
  open,
  onOpenChange,
  onSuccess,
}: TiersNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { addTiers } = useTiers()

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
      <DialogContent className="sm:max-w-lg">
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
                  className={cn(
                    "cursor-pointer border border-border/70 text-left transition hover:border-primary"
                  )}
                >
                  <div className="flex items-center gap-3 p-4">
                    <Image
                      src={item.value === "rustfs" ? logoImage : buildRoute(item.icon)}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 object-contain"
                    />
                    <div>
                      <p className="text-base font-semibold">
                        {t(item.labelKey)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t(item.descKey)}
                      </p>
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
                className="w-full cursor-pointer border text-left transition hover:border-primary"
              >
                <div className="flex items-center gap-3 p-4">
                  {selectedOption && (
                    <Image
                      src={selectedOption.value === "rustfs" ? logoImage : buildRoute(selectedOption.icon)}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 object-contain"
                    />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("Selected Type")}
                    </p>
                    <p className="text-base font-semibold">{type}</p>
                  </div>
                </div>
              </button>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>{t("Name")} (A-Z,0-9,_)</FieldLabel>
                  <FieldContent>
                    <Input
                      value={name}
                      onChange={handleNameChange}
                      placeholder={t("Please enter name")}
                      autoComplete="off"
                    />
                  </FieldContent>
                  {nameError && (
                    <FieldDescription className="text-destructive">
                      {nameError}
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel>{t("Endpoint")}</FieldLabel>
                  <FieldContent>
                    <Input
                      value={endpoint}
                      onChange={(e) => setEndpoint(e.target.value)}
                      placeholder={t("Please enter endpoint")}
                    />
                  </FieldContent>
                </Field>

                {type === "gcs" ? (
                  <Field className="md:col-span-2">
                    <FieldLabel>{t("Credentials")} (JSON)</FieldLabel>
                    <FieldContent>
                      <Textarea
                        value={creds}
                        onChange={(e) => setCreds(e.target.value)}
                        placeholder={t("Please enter GCS credentials JSON")}
                        autoComplete="off"
                        rows={6}
                      />
                    </FieldContent>
                  </Field>
                ) : (
                  <>
                    <Field>
                      <FieldLabel>{t("Access Key")}</FieldLabel>
                      <FieldContent>
                        <Input
                          value={accesskey}
                          onChange={(e) => setAccesskey(e.target.value)}
                          placeholder={t("Please enter Access Key")}
                          autoComplete="off"
                        />
                      </FieldContent>
                    </Field>
                    <Field>
                      <FieldLabel>{t("Secret Key")}</FieldLabel>
                      <FieldContent>
                        <Input
                          value={secretkey}
                          onChange={(e) => setSecretkey(e.target.value)}
                          type="password"
                          placeholder={t("Please enter Secret Key")}
                          autoComplete="off"
                        />
                      </FieldContent>
                    </Field>
                  </>
                )}

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
                  <FieldLabel>{t("Prefix")}</FieldLabel>
                  <FieldContent>
                    <Input
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder={t("Please enter prefix")}
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
                      value={storageclass}
                      onChange={(e) => setStorageclass(e.target.value)}
                      placeholder={t("Please Enter storage class")}
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
          <Button
            onClick={handleSave}
            disabled={!type}
            aria-disabled={submitting}
          >
            {submitting ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
