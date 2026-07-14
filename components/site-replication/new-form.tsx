"use client"

import * as React from "react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiCloseLine, RiKeyLine, RiShieldCheckLine, RiStackLine } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
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

  return (
    <Dialog
      open={open}
      disablePointerDismissal={saving}
      onOpenChange={(nextOpen, details) => {
        if (saving && !nextOpen && details.reason === "escape-key") {
          return
        }

        onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        className="max-h-[min(94dvh,56rem)] max-w-6xl grid-rows-[minmax(0,1fr)] gap-0 overflow-hidden border-0 bg-transparent p-0 ring-0 shadow-none sm:max-w-6xl"
        showCloseButton={false}
      >
        <div className="grid min-h-0 overflow-y-auto overscroll-contain border bg-background lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.35fr)] lg:overflow-hidden">
          <section className="relative border-b bg-muted/20 px-4 py-5 sm:px-6 sm:py-6 lg:min-h-0 lg:overflow-y-auto lg:border-e lg:border-b-0">
            <div className="absolute inset-y-0 end-0 hidden w-px bg-border/70 lg:block" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-3 end-3 lg:hidden"
              onClick={handleCancel}
              disabled={saving}
            >
              <RiCloseLine className="size-4" aria-hidden />
              <span className="sr-only">{t("Cancel")}</span>
            </Button>
            <div className="relative space-y-6">
              <DialogHeader className="space-y-3 pe-10 lg:pe-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-background/70">
                    {isConfigured ? t("Expand replication group") : t("First-time setup")}
                  </Badge>
                  <Badge variant="secondary">{siteCountLabel}</Badge>
                </div>
                <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
                <DialogDescription className="max-w-md text-sm">
                  {t(
                    "The current site is detected automatically by the server. Add one or more remote sites to join the replication group.",
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="p-1">
                  <div className="mb-3 flex items-center gap-2 text-foreground">
                    <RiStackLine className="size-4" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-[0.18em]">{t("Topology")}</span>
                  </div>
                  <p className="text-sm font-medium">{t("Current site + remote peers")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Build a site replication group without manually entering the local deployment identity.")}
                  </p>
                </div>

                <div className="p-1">
                  <div className="mb-3 flex items-center gap-2 text-foreground">
                    <RiShieldCheckLine className="size-4" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-[0.18em]">{t("Handshake")}</span>
                  </div>
                  <p className="text-sm font-medium">{t("Admin-to-admin join flow")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      "Each remote site uses its administrator credentials to complete the initial replication handshake.",
                    )}
                  </p>
                </div>

                <div className="p-1">
                  <div className="mb-3 flex items-center gap-2 text-foreground">
                    <RiKeyLine className="size-4" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-[0.18em]">{t("Credentials")}</span>
                  </div>
                  <p className="text-sm font-medium">{t("Service account is automatic")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("RustFS creates the internal site replication service account after the first successful join.")}
                  </p>
                </div>
              </div>

              <div className="border-t pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label htmlFor="site-replication-ilm-expiry" className="text-sm font-medium">
                      {t("Replicate ILM Expiry")}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t("Matches the backend and MinIO site replication option for expiry lifecycle rules.")}
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
                <Separator className="my-4" />
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    {t("When enabled, lifecycle expiry rule metadata is propagated to every peer site in the group.")}
                  </p>
                  <p>{t("You can still adjust this setting later from the site replication overview page.")}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="min-w-0 bg-background lg:grid lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)_auto]">
            <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-4 border-b bg-background px-4 py-5 sm:px-6 lg:static">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("Remote Sites")}
                </h3>
                <p className="max-w-2xl text-sm text-foreground">
                  {t(
                    "Each remote site needs an endpoint and administrator credentials so the cluster can complete the join handshake.",
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" className="inline-flex items-center gap-2" onClick={addSite}>
                  <RiAddLine className="size-4" aria-hidden />
                  {t("Add Site")}
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={handleCancel} disabled={saving}>
                  <RiCloseLine className="size-4" aria-hidden />
                  <span className="sr-only">{t("Cancel")}</span>
                </Button>
              </div>
            </div>

            <div className="lg:min-h-0 lg:overflow-y-auto">
              <div className="space-y-5 px-6 py-6">
                {sites.map((site, index) => (
                  <fieldset key={index} className="overflow-hidden bg-muted/20">
                    <legend className="sr-only">
                      {t("Remote Site")} {index + 1}
                    </legend>
                    <div className="flex flex-wrap items-start justify-between gap-3 bg-background/60 px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {t("Remote Site")} {index + 1}
                          </Badge>
                          {!site.name.trim() ? (
                            <Badge variant="outline">{t("Name inferred from endpoint if left blank")}</Badge>
                          ) : null}
                        </div>
                        <p className="text-sm font-medium">{site.name.trim() || t("Unnamed remote site")}</p>
                        <p className="text-xs text-muted-foreground">
                          {site.endpoint.trim() || "https://remote-rustfs.example.com"}
                        </p>
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

                    <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
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
                                  prev.map((current, siteIndex) =>
                                    siteIndex === index ? { ...current, ...tls } : current,
                                  ),
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
                                <SelectValue />
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
                                <p
                                  id={`site-ca-certificate-description-${index}`}
                                  className="text-xs text-muted-foreground"
                                >
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
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>

            <DialogFooter className="sticky bottom-0 z-10 border-t bg-background px-4 py-4 sm:px-6 lg:static">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
                {t("Cancel")}
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? t("Saving…") : t("Save")}
              </Button>
            </DialogFooter>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
