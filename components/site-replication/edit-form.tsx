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
import { useSiteReplication } from "@/hooks/use-site-replication"
import { useMessage } from "@/lib/feedback/message"
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
  const [endpointError, setEndpointError] = useState("")
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (!open || !peer) return

    setName(peer.name)
    setEndpoint(peer.endpoint)
    setSyncState(peer.syncState === "disable" ? "disable" : "enable")
    setObjectNamingMode(peer.objectNamingMode)
    setEndpointError("")
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

    setSaving(true)
    try {
      const response = await editSiteReplication({
        ...peer,
        name: name.trim(),
        endpoint: endpoint.trim(),
        syncState,
        objectNamingMode: objectNamingMode.trim(),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl"
        onPointerDownOutside={(event) => saving && event.preventDefault()}
        onInteractOutside={(event) => saving && event.preventDefault()}
        onEscapeKeyDown={(event) => saving && event.preventDefault()}
      >
        <DialogHeader className="space-y-2 text-left">
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
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("Site Name")}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-edit-sync">{t("Sync")}</Label>
              <Select value={syncState} onValueChange={(value) => setSyncState(value as SiteReplicationSyncState)}>
                <SelectTrigger id="site-edit-sync" className="w-full" disabled={saving}>
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
              value={endpoint}
              onChange={(event) => {
                setEndpoint(event.target.value)
                if (event.target.value.trim()) {
                  setEndpointError("")
                }
              }}
              placeholder="https://remote-rustfs.example.com"
              disabled={saving}
            />
            {endpointError ? <p className="text-sm text-destructive">{endpointError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-edit-object-naming-mode">{t("Object Naming Mode")}</Label>
            <Input
              id="site-edit-object-naming-mode"
              value={objectNamingMode}
              onChange={(event) => setObjectNamingMode(event.target.value)}
              placeholder={t("Optional")}
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
            {saving ? t("Saving...") : t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
