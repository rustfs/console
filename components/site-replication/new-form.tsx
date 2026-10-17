"use client"

import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiCloseLine } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useSiteReplication } from "@/hooks/use-site-replication"
import { useMessage } from "@/lib/feedback/message"
import {
  buildSiteReplicationTlsPayload,
  isHttpsSiteReplicationEndpoint,
  type SiteReplicationTlsMode,
} from "@/lib/site-replication-tls"
import type { SiteReplicationAddSiteInput } from "@/types/site-replication"

interface SiteReplicationNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  isConfigured?: boolean
}

interface SiteFormErrors {
  endpoint: string
  accessKey: string
  secretKey: string
  caCertPem: string
}

function createRemoteSite(): SiteReplicationAddSiteInput {
  return {
    name: "",
    endpoint: "",
    accessKey: "",
    secretKey: "",
    skipTlsVerify: false,
    caCertPem: "",
  }
}

function createErrors(): SiteFormErrors {
  return {
    endpoint: "",
    accessKey: "",
    secretKey: "",
    caCertPem: "",
  }
}

function normalizeEndpoint(value: string) {
  return value.trim().replace(/\/+$/, "").toLowerCase()
}

export function SiteReplicationNewForm({
  open,
  onOpenChange,
  onSuccess,
  isConfigured = false,
}: SiteReplicationNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { addSiteReplication } = useSiteReplication()

  const [sites, setSites] = useState<SiteReplicationAddSiteInput[]>([createRemoteSite()])
  const [errors, setErrors] = useState<SiteFormErrors[]>([createErrors()])
  const [tlsModes, setTlsModes] = useState<SiteReplicationTlsMode[]>(["verify"])
  const [replicateIlmExpiry, setReplicateIlmExpiry] = useState(false)
  const [saving, setSaving] = useState(false)

  const resetForm = useCallback(() => {
    setSites([createRemoteSite()])
    setErrors([createErrors()])
    setTlsModes(["verify"])
    setReplicateIlmExpiry(false)
    setSaving(false)
  }, [])

  React.useEffect(() => {
    if (open) {
      resetForm()
    }
  }, [open, resetForm])

  const title = useMemo(() => (isConfigured ? t("Add Site") : t("Set Up Site Replication")), [isConfigured, t])
  const siteCountLabel = useMemo(
    () => `${sites.length} ${sites.length === 1 ? t("site") : t("sites")}`,
    [sites.length, t],
  )

  const updateSite = (index: number, field: "name" | "endpoint" | "accessKey" | "secretKey", value: string) => {
    setSites((prev) =>
      prev.map((site, siteIndex) => {
        if (siteIndex !== index) return site
        if (field === "endpoint" && !isHttpsSiteReplicationEndpoint(value)) {
          return { ...site, endpoint: value, skipTlsVerify: false, caCertPem: "" }
        }
        return { ...site, [field]: value }
      }),
    )

    if (field === "endpoint" && !isHttpsSiteReplicationEndpoint(value)) {
      setTlsModes((prev) => prev.map((mode, modeIndex) => (modeIndex === index ? "verify" : mode)))
    }

    if (field === "endpoint" || field === "accessKey" || field === "secretKey") {
      setErrors((prev) =>
        prev.map((error, errorIndex) =>
          errorIndex === index && value.trim()
            ? {
                ...error,
                [field]: "",
                ...(field === "endpoint" && !isHttpsSiteReplicationEndpoint(value) ? { caCertPem: "" } : {}),
              }
            : error,
        ),
      )
    }
  }

  const addSite = () => {
    setSites((prev) => [...prev, createRemoteSite()])
    setErrors((prev) => [...prev, createErrors()])
    setTlsModes((prev) => [...prev, "verify"])
  }

  const removeSite = (index: number) => {
    if (sites.length <= 1) return
    setSites((prev) => prev.filter((_, siteIndex) => siteIndex !== index))
    setErrors((prev) => prev.filter((_, errorIndex) => errorIndex !== index))
    setTlsModes((prev) => prev.filter((_, modeIndex) => modeIndex !== index))
  }

  const validate = () => {
    let valid = true
    const nextErrors = sites.map(() => createErrors())
    const seenEndpoints = new Set<string>()

    sites.forEach((site, index) => {
      if (!site.endpoint.trim()) {
        nextErrors[index].endpoint = t("Endpoint is required")
        valid = false
      } else {
        const normalizedEndpoint = normalizeEndpoint(site.endpoint)
        if (seenEndpoints.has(normalizedEndpoint)) {
          nextErrors[index].endpoint = t("Endpoint must be unique")
          valid = false
        }
        seenEndpoints.add(normalizedEndpoint)
      }

      if (!site.accessKey.trim()) {
        nextErrors[index].accessKey = t("Access Key is required")
        valid = false
      }

      if (!site.secretKey.trim()) {
        nextErrors[index].secretKey = t("Secret Key is required")
        valid = false
      }

      if (isHttpsSiteReplicationEndpoint(site.endpoint) && tlsModes[index] === "custom-ca" && !site.caCertPem.trim()) {
        nextErrors[index].caCertPem = t("Custom CA certificate is required")
        valid = false
      }
    })

    setErrors(nextErrors)
    return valid
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      const payload = sites.map((site, index) => ({
        ...site,
        ...buildSiteReplicationTlsPayload(site.endpoint, tlsModes[index] ?? "verify", site.caCertPem),
      }))
      const response = await addSiteReplication(payload, { replicateIlmExpiry })

      if (!response.success) {
        throw new Error(response.errorDetail || response.status || t("Save Failed"))
      }

      message.success(response.status || t("Site replication configuration saved"))
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      message.error((error as Error).message || t("Save Failed"))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (saving) return
    onOpenChange(false)
    resetForm()
  }

  const tlsModeLabels: Record<SiteReplicationTlsMode, string> = {
    verify: t("Default certificate verification"),
    "custom-ca": t("Custom CA certificate"),
    skip: t("Skip TLS verification"),
  }

  return (
    <Dialog
      open={open}
      disablePointerDismissal={saving}
      onOpenChange={(nextOpen) => {
        if (saving && !nextOpen) {
          return
        }

        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[min(94dvh,54rem)] sm:max-w-3xl" aria-busy={saving}>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle>{title}</DialogTitle>
            <Badge variant="outline">{siteCountLabel}</Badge>
          </div>
          <DialogDescription>
            {t(
              "The current site is detected automatically by the server. Add one or more remote sites to join the replication group.",
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-6">
          {sites.map((site, index) => (
            <fieldset key={index} className="space-y-5 border-b pb-6 last:border-b-0 last:pb-0">
              <legend className="sr-only">
                {t("Remote Site")} {index + 1}
              </legend>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {t("Remote Site")} {index + 1}
                    </Badge>
                    {!site.name.trim() ? (
                      <Badge variant="outline">{t("Name inferred from endpoint if left blank")}</Badge>
                    ) : null}
                  </div>
                </div>

                {sites.length > 1 ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t("Delete")}
                    onClick={() => removeSite(index)}
                    disabled={saving}
                  >
                    <RiCloseLine className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`site-endpoint-${index}`}>{t("Endpoint *")}</Label>
                  <Input
                    id={`site-endpoint-${index}`}
                    name={`site-endpoint-${index}`}
                    type="url"
                    value={site.endpoint}
                    onChange={(event) => updateSite(index, "endpoint", event.target.value)}
                    autoComplete="off"
                    placeholder="https://remote-rustfs.example.com"
                    spellCheck={false}
                    disabled={saving}
                  />
                  {errors[index]?.endpoint ? (
                    <p className="text-sm text-destructive">{errors[index].endpoint}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("Use the remote RustFS API endpoint, including protocol and port if needed.")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`site-access-${index}`}>{t("Access Key *")}</Label>
                  <Input
                    id={`site-access-${index}`}
                    name={`site-access-${index}`}
                    value={site.accessKey}
                    onChange={(event) => updateSite(index, "accessKey", event.target.value)}
                    autoComplete="off"
                    placeholder={t("Access Key")}
                    spellCheck={false}
                    disabled={saving}
                  />
                  {errors[index]?.accessKey ? (
                    <p className="text-sm text-destructive">{errors[index].accessKey}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("Administrator access key for the remote site.")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`site-secret-${index}`}>{t("Secret Key *")}</Label>
                  <Input
                    id={`site-secret-${index}`}
                    name={`site-secret-${index}`}
                    type="password"
                    value={site.secretKey}
                    onChange={(event) => updateSite(index, "secretKey", event.target.value)}
                    autoComplete="off"
                    placeholder={t("Secret Key")}
                    spellCheck={false}
                    disabled={saving}
                  />
                  {errors[index]?.secretKey ? (
                    <p className="text-sm text-destructive">{errors[index].secretKey}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("The value is used only for the initial join request.")}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`site-name-${index}`}>{t("Site Name")}</Label>
                  <Input
                    id={`site-name-${index}`}
                    name={`site-name-${index}`}
                    value={site.name}
                    onChange={(event) => updateSite(index, "name", event.target.value)}
                    autoComplete="off"
                    placeholder={t("Site Name")}
                    spellCheck={false}
                    disabled={saving}
                  />
                </div>
                {isHttpsSiteReplicationEndpoint(site.endpoint) ? (
                  <div className="space-y-3 border-s-2 border-border ps-4 sm:col-span-2">
                    <div className="space-y-2">
                      <Label htmlFor={`site-tls-verification-${index}`}>{t("TLS Verification")}</Label>
                      <Select
                        value={tlsModes[index] ?? "verify"}
                        onValueChange={(value) => {
                          if (!value) return
                          const mode = value as SiteReplicationTlsMode
                          setTlsModes((prev) =>
                            prev.map((current, modeIndex) => (modeIndex === index ? mode : current)),
                          )
                          const tls = buildSiteReplicationTlsPayload(site.endpoint, mode, site.caCertPem)
                          setSites((prev) =>
                            prev.map((current, siteIndex) => (siteIndex === index ? { ...current, ...tls } : current)),
                          )
                          setErrors((prev) =>
                            prev.map((error, errorIndex) =>
                              errorIndex === index ? { ...error, caCertPem: "" } : error,
                            ),
                          )
                        }}
                        disabled={saving}
                      >
                        <SelectTrigger id={`site-tls-verification-${index}`} className="w-full">
                          <SelectValue>{tlsModeLabels[tlsModes[index] ?? "verify"]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verify">{t("Default certificate verification")}</SelectItem>
                          <SelectItem value="custom-ca">{t("Custom CA certificate")}</SelectItem>
                          <SelectItem value="skip">{t("Skip TLS verification")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {tlsModes[index] === "custom-ca" ? (
                      <div className="space-y-2">
                        <Label htmlFor={`site-ca-certificate-${index}`}>{t("Custom CA certificate")}</Label>
                        <Textarea
                          id={`site-ca-certificate-${index}`}
                          name={`site-ca-certificate-${index}`}
                          value={site.caCertPem}
                          onChange={(event) => {
                            const caCertPem = event.target.value
                            setSites((prev) =>
                              prev.map((current, siteIndex) =>
                                siteIndex === index ? { ...current, skipTlsVerify: false, caCertPem } : current,
                              ),
                            )
                            if (caCertPem.trim()) {
                              setErrors((prev) =>
                                prev.map((error, errorIndex) =>
                                  errorIndex === index ? { ...error, caCertPem: "" } : error,
                                ),
                              )
                            }
                          }}
                          aria-invalid={Boolean(errors[index]?.caCertPem)}
                          aria-describedby={`site-ca-certificate-description-${index}`}
                          className="min-h-32 font-mono"
                          placeholder="-----BEGIN CERTIFICATE-----"
                          disabled={saving}
                          spellCheck={false}
                        />
                        {errors[index]?.caCertPem ? (
                          <p id={`site-ca-certificate-description-${index}`} className="text-sm text-destructive">
                            {errors[index].caCertPem}
                          </p>
                        ) : (
                          <p id={`site-ca-certificate-description-${index}`} className="text-xs text-muted-foreground">
                            {t("Paste the CA certificate in PEM format.")}
                          </p>
                        )}
                      </div>
                    ) : null}

                    {tlsModes[index] === "skip" ? (
                      <p
                        role="alert"
                        className="border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive"
                      >
                        {t("Certificate verification is disabled. Only use this for trusted networks.")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </fieldset>
          ))}
          <Button type="button" variant="outline" onClick={addSite} disabled={saving}>
            <RiAddLine className="size-4" aria-hidden />
            {t("Add Site")}
          </Button>
          <div className="flex items-start justify-between gap-5 border-t pt-6">
            <div className="space-y-2">
              <label htmlFor="site-replication-ilm-expiry" className="text-sm font-medium">
                {t("Replicate ILM Expiry")}
              </label>
              <p className="max-w-lg text-xs text-muted-foreground">
                {t("When enabled, lifecycle expiry rule metadata is propagated to every peer site in the group.")}
              </p>
            </div>
            <Switch
              id="site-replication-ilm-expiry"
              name="site-replication-ilm-expiry"
              checked={replicateIlmExpiry}
              onCheckedChange={setReplicateIlmExpiry}
              disabled={saving}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
            {t("Cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? t("Saving…") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
