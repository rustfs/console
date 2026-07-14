"use client"

import * as React from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
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
import { Textarea } from "@/components/ui/textarea"
import { useSiteReplication } from "@/hooks/use-site-replication"
import { useMessage } from "@/lib/feedback/message"
import {
  buildSiteReplicationTlsPayload,
  getSiteReplicationTlsMode,
  isHttpsSiteReplicationEndpoint,
  type SiteReplicationTlsMode,
} from "@/lib/site-replication-tls"
import type { SiteReplicationPeerInfo, SiteReplicationSyncState } from "@/types/site-replication"

interface SiteReplicationEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  peer: SiteReplicationPeerInfo | null
  onSuccess?: () => void
}

export function SiteReplicationEditForm({ open, onOpenChange, peer, onSuccess }: SiteReplicationEditFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { editSiteReplication } = useSiteReplication()

  const [name, setName] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [syncState, setSyncState] = useState<SiteReplicationSyncState>("enable")
  const [objectNamingMode, setObjectNamingMode] = useState("")
  const [tlsMode, setTlsMode] = useState<SiteReplicationTlsMode>("verify")
  const [caCertPem, setCaCertPem] = useState("")
  const [endpointError, setEndpointError] = useState("")
  const [caCertPemError, setCaCertPemError] = useState("")
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (!open || !peer) return

    setName(peer.name)
    setEndpoint(peer.endpoint)
    setSyncState(peer.syncState === "disable" ? "disable" : "enable")
    setObjectNamingMode(peer.objectNamingMode)
    setTlsMode(getSiteReplicationTlsMode(peer))
    setCaCertPem(peer.caCertPem)
    setEndpointError("")
    setCaCertPemError("")
    setSaving(false)
  }, [open, peer])

  const handleCancel = () => {
    if (saving) return
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (!peer) return

    if (!endpoint.trim()) {
      setEndpointError(t("Endpoint is required"))
      return
    }

    if (isHttpsSiteReplicationEndpoint(endpoint) && tlsMode === "custom-ca" && !caCertPem.trim()) {
      setCaCertPemError(t("Custom CA certificate is required"))
      return
    }

    setSaving(true)
    try {
      const tls = buildSiteReplicationTlsPayload(endpoint, tlsMode, caCertPem)
      const response = await editSiteReplication({
        ...peer,
        name: name.trim(),
        endpoint: endpoint.trim(),
        syncState,
        objectNamingMode: objectNamingMode.trim(),
        ...tls,
      })

      if (!response.success) {
        throw new Error(response.errorDetail || response.status || t("Save Failed"))
      }

      message.success(response.status || t("Save Success"))
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      message.error((error as Error).message || t("Save Failed"))
    } finally {
      setSaving(false)
    }
  }

  if (!peer) {
    return null
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto overflow-x-hidden">
        <DialogHeader className="space-y-2 text-start">
          <DialogTitle>{t("Edit Site")}</DialogTitle>
          <DialogDescription>
            {t(
              "Update the peer details that RustFS uses for site replication management. Fields not shown here are preserved from the current configuration.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="site-edit-name">{t("Site Name")}</Label>
              <Input
                id="site-edit-name"
                name="site-edit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                placeholder={t("Site Name")}
                spellCheck={false}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-edit-sync">{t("Sync")}</Label>
              <Select value={syncState} onValueChange={(value) => setSyncState(value as SiteReplicationSyncState)}>
                <SelectTrigger id="site-edit-sync" className="w-full" aria-label={t("Sync")} disabled={saving}>
                  <SelectValue placeholder={t("Select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enable">{t("Enabled")}</SelectItem>
                  <SelectItem value="disable">{t("Disabled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-edit-endpoint">{t("Endpoint *")}</Label>
            <Input
              id="site-edit-endpoint"
              name="site-edit-endpoint"
              type="url"
              value={endpoint}
              onChange={(event) => {
                setEndpoint(event.target.value)
                if (event.target.value.trim()) {
                  setEndpointError("")
                }
                if (!isHttpsSiteReplicationEndpoint(event.target.value)) {
                  setTlsMode("verify")
                  setCaCertPem("")
                  setCaCertPemError("")
                }
              }}
              autoComplete="off"
              placeholder="https://remote-rustfs.example.com"
              spellCheck={false}
              disabled={saving}
            />
            {endpointError ? <p className="text-sm text-destructive">{endpointError}</p> : null}
          </div>

          {isHttpsSiteReplicationEndpoint(endpoint) ? (
            <div className="space-y-3 border-s-2 border-border ps-4">
              <div className="space-y-2">
                <Label htmlFor="site-edit-tls-verification">{t("TLS Verification")}</Label>
                <Select
                  value={tlsMode}
                  onValueChange={(value) => {
                    if (!value) return
                    setTlsMode(value as SiteReplicationTlsMode)
                    setCaCertPemError("")
                  }}
                  disabled={saving}
                >
                  <SelectTrigger id="site-edit-tls-verification" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verify">{t("Default certificate verification")}</SelectItem>
                    <SelectItem value="custom-ca">{t("Custom CA certificate")}</SelectItem>
                    <SelectItem value="skip">{t("Skip TLS verification")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tlsMode === "custom-ca" ? (
                <div className="space-y-2">
                  <Label htmlFor="site-edit-ca-certificate">{t("Custom CA certificate")}</Label>
                  <Textarea
                    id="site-edit-ca-certificate"
                    name="site-edit-ca-certificate"
                    value={caCertPem}
                    onChange={(event) => {
                      setCaCertPem(event.target.value)
                      if (event.target.value.trim()) setCaCertPemError("")
                    }}
                    aria-invalid={Boolean(caCertPemError)}
                    aria-describedby="site-edit-ca-certificate-description"
                    className="min-h-32 font-mono"
                    placeholder="-----BEGIN CERTIFICATE-----"
                    disabled={saving}
                    spellCheck={false}
                  />
                  <p
                    id="site-edit-ca-certificate-description"
                    className={caCertPemError ? "text-sm text-destructive" : "text-xs text-muted-foreground"}
                  >
                    {caCertPemError || t("Paste the CA certificate in PEM format.")}
                  </p>
                </div>
              ) : null}

              {tlsMode === "skip" ? (
                <p role="alert" className="border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  {t("Certificate verification is disabled. Only use this for trusted networks.")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="site-edit-object-naming-mode">{t("Object Naming Mode")}</Label>
            <Input
              id="site-edit-object-naming-mode"
              name="site-edit-object-naming-mode"
              value={objectNamingMode}
              onChange={(event) => setObjectNamingMode(event.target.value)}
              autoComplete="off"
              placeholder={t("Optional")}
              spellCheck={false}
              disabled={saving}
            />
          </div>

          <div className="grid gap-4 rounded-none border p-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("Deployment ID")}</p>
              <p className="font-mono text-xs break-all">{peer.deploymentId || "-"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("Default Bandwidth")}</p>
              <p className="text-xs">
                {peer.defaultBandwidth.set ? `${peer.defaultBandwidth.limit || 0}` : t("Not configured")}
              </p>
            </div>
          </div>
        </div>

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
