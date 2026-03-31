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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useSiteReplication } from "@/hooks/use-site-replication"
import { useMessage } from "@/lib/feedback/message"
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
}

function createRemoteSite(): SiteReplicationAddSiteInput {
  return {
    name: "",
    endpoint: "",
    accessKey: "",
    secretKey: "",
  }
}

function createErrors(): SiteFormErrors {
  return {
    endpoint: "",
    accessKey: "",
    secretKey: "",
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
  const [replicateIlmExpiry, setReplicateIlmExpiry] = useState(false)
  const [saving, setSaving] = useState(false)

  const resetForm = useCallback(() => {
    setSites([createRemoteSite()])
    setErrors([createErrors()])
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

  const updateSite = (index: number, field: keyof SiteReplicationAddSiteInput, value: string) => {
    setSites((prev) => prev.map((site, siteIndex) => (siteIndex === index ? { ...site, [field]: value } : site)))

    if (field === "endpoint" || field === "accessKey" || field === "secretKey") {
      setErrors((prev) =>
        prev.map((error, errorIndex) => (errorIndex === index && value.trim() ? { ...error, [field]: "" } : error)),
      )
    }
  }

  const addSite = () => {
    setSites((prev) => [...prev, createRemoteSite()])
    setErrors((prev) => [...prev, createErrors()])
  }

  const removeSite = (index: number) => {
    if (sites.length <= 1) return
    setSites((prev) => prev.filter((_, siteIndex) => siteIndex !== index))
    setErrors((prev) => prev.filter((_, errorIndex) => errorIndex !== index))
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
    })

    setErrors(nextErrors)
    return valid
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      const response = await addSiteReplication(sites, { replicateIlmExpiry })

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl gap-0 border-0 bg-transparent p-0 ring-0 shadow-none sm:max-w-6xl"
        showCloseButton={false}
        onPointerDownOutside={(event) => saving && event.preventDefault()}
        onInteractOutside={(event) => saving && event.preventDefault()}
        onEscapeKeyDown={(event) => saving && event.preventDefault()}
      >
        <div className="grid overflow-hidden border bg-background lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.35fr)]">
          <section className="relative overflow-hidden border-b bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.26),_transparent_45%),linear-gradient(160deg,_rgba(255,247,237,0.92),_rgba(255,255,255,1)_65%)] px-6 py-6 lg:border-r lg:border-b-0">
            <div className="absolute inset-y-0 right-0 hidden w-px bg-border/70 lg:block" />
            <div className="relative space-y-6">
              <DialogHeader className="space-y-3">
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

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <div className="border bg-background/70 p-4">
                  <div className="mb-3 flex items-center gap-2 text-foreground">
                    <RiStackLine className="size-4" aria-hidden />
                    <span className="text-xs font-medium uppercase tracking-[0.18em]">{t("Topology")}</span>
                  </div>
                  <p className="text-sm font-medium">{t("Current site + remote peers")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Build a site replication group without manually entering the local deployment identity.")}
                  </p>
                </div>

                <div className="border bg-background/70 p-4">
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

                <div className="border bg-background/70 p-4">
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

              <div className="border bg-background/75 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t("Replicate ILM Expiry")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Matches the backend and MinIO site replication option for expiry lifecycle rules.")}
                    </p>
                  </div>
                  <Switch checked={replicateIlmExpiry} onCheckedChange={setReplicateIlmExpiry} disabled={saving} />
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

          <section className="min-w-0 bg-background">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-5">
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
                <Button type="button" variant="ghost" size="icon-sm" onClick={handleCancel} disabled={saving}>
                  <RiCloseLine className="size-4" aria-hidden />
                  <span className="sr-only">{t("Cancel")}</span>
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-[72vh]">
              <div className="space-y-5 px-6 py-6">
                {sites.map((site, index) => (
                  <div key={index} className="overflow-hidden border bg-muted/20">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-background px-5 py-4">
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
                          size="icon-sm"
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
                          value={site.name}
                          onChange={(event) => updateSite(index, "name", event.target.value)}
                          placeholder={t("Site Name")}
                          disabled={saving}
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`site-endpoint-${index}`}>{t("Endpoint *")}</Label>
                        <Input
                          id={`site-endpoint-${index}`}
                          value={site.endpoint}
                          onChange={(event) => updateSite(index, "endpoint", event.target.value)}
                          placeholder="https://remote-rustfs.example.com"
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
                          value={site.accessKey}
                          onChange={(event) => updateSite(index, "accessKey", event.target.value)}
                          placeholder={t("Access Key")}
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
                          type="password"
                          value={site.secretKey}
                          onChange={(event) => updateSite(index, "secretKey", event.target.value)}
                          placeholder={t("Secret Key")}
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
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>
                {t("Cancel")}
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? t("Saving...") : t("Save")}
              </Button>
            </DialogFooter>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
