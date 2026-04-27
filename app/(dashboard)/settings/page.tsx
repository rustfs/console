"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { RiRefreshLine, RiSave3Line } from "@remixicon/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { useModuleSwitches } from "@/hooks/use-module-switches"
import { usePermissions } from "@/hooks/use-permissions"
import {
  getModuleSwitchEnvKey,
  isEnvManagedSource,
  isModuleSwitchEnvConflictError,
  type ModuleSwitchName,
  type ModuleSwitchPayload,
  type ModuleSwitchSnapshot,
  type ModuleSwitchSource,
} from "@/lib/module-switches"
import { CONSOLE_SCOPES } from "@/lib/console-permissions"
import { useMessage } from "@/lib/feedback/message"

function getSourceLabel(source: ModuleSwitchSource, t: (key: string) => string) {
  if (source === "env") return t("ENV")
  if (source === "console") return t("Console")
  return t("Default")
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const { getModuleSwitches, saveModuleSwitches } = useModuleSwitches()
  const { isAdmin, hasPermission } = usePermissions()
  const canUpdateModuleSwitches = isAdmin || hasPermission(["admin:ConfigUpdate", CONSOLE_SCOPES.CONSOLE_ADMIN], false)

  const [snapshot, setSnapshot] = useState<ModuleSwitchSnapshot | null>(null)
  const [formValues, setFormValues] = useState<ModuleSwitchPayload>({
    notify_enabled: false,
    audit_enabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const applySnapshot = useCallback((nextSnapshot: ModuleSwitchSnapshot) => {
    setSnapshot(nextSnapshot)
    setFormValues({
      notify_enabled: nextSnapshot.notify_enabled,
      audit_enabled: nextSnapshot.audit_enabled,
    })
  }, [])

  const loadSwitches = useCallback(async () => {
    setLoading(true)
    try {
      applySnapshot(await getModuleSwitches())
    } catch (error) {
      message.error((error as Error).message || t("Failed to load module switches"))
    } finally {
      setLoading(false)
    }
  }, [applySnapshot, getModuleSwitches, message, t])

  useEffect(() => {
    void loadSwitches()
  }, [loadSwitches])

  const hasEnvManagedSwitch = snapshot
    ? isEnvManagedSource(snapshot.notify_source) || isEnvManagedSource(snapshot.audit_source)
    : false

  const isDirty = useMemo(() => {
    if (!snapshot) return false
    return formValues.notify_enabled !== snapshot.notify_enabled || formValues.audit_enabled !== snapshot.audit_enabled
  }, [formValues, snapshot])

  const updateSwitch = (moduleName: ModuleSwitchName, checked: boolean) => {
    if (!canUpdateModuleSwitches) return

    setFormValues((current) => ({
      ...current,
      [`${moduleName}_enabled`]: checked,
    }))
  }

  const handleSave = async () => {
    if (!snapshot) return
    if (!canUpdateModuleSwitches) {
      message.warning(t("You do not have permission to update module switches."))
      return
    }

    setSaving(true)
    try {
      applySnapshot(await saveModuleSwitches(formValues))
      message.success(t("Module switches saved"))
    } catch (error) {
      const description = (error as Error).message || t("Save Failed")
      if (isModuleSwitchEnvConflictError(error)) {
        message.error(t("Module switch is managed by environment variables"), { description })
      } else {
        message.error(description)
      }
    } finally {
      setSaving(false)
    }
  }

  const switchItems = useMemo(
    () =>
      snapshot
        ? [
            {
              name: "notify" as const,
              label: t("Notify"),
              checked: formValues.notify_enabled,
              source: snapshot.notify_source,
            },
            {
              name: "audit" as const,
              label: t("Audit"),
              checked: formValues.audit_enabled,
              source: snapshot.audit_source,
            },
          ]
        : [],
    [formValues, snapshot, t],
  )

  if (loading && !snapshot) {
    return (
      <Page>
        <PageHeader>
          <h1 className="text-2xl font-bold">{t("Settings")}</h1>
        </PageHeader>
        <div className="flex items-center justify-center py-24">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <Button type="button" variant="outline" onClick={loadSwitches} disabled={loading || saving}>
              <RiRefreshLine className="me-2 size-4" aria-hidden />
              {t("Sync")}
            </Button>
            {canUpdateModuleSwitches ? (
              <Button type="button" onClick={handleSave} disabled={!snapshot || !isDirty || loading || saving}>
                {saving ? <Spinner className="me-2 size-4" /> : <RiSave3Line className="me-2 size-4" aria-hidden />}
                {t("Save")}
              </Button>
            ) : null}
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Settings")}</h1>
      </PageHeader>

      <div className="space-y-4">
        {hasEnvManagedSwitch ? (
          <Alert>
            <AlertTitle>{t("Environment variables are controlling some switches")}</AlertTitle>
            <AlertDescription>
              {t("Update the deployment environment first before changing ENV-managed module switches.")}
            </AlertDescription>
          </Alert>
        ) : null}

        {!canUpdateModuleSwitches ? (
          <Alert>
            <AlertTitle>{t("Read-only settings")}</AlertTitle>
            <AlertDescription>{t("You do not have permission to update module switches.")}</AlertDescription>
          </Alert>
        ) : null}

        <div className="divide-y rounded-none border">
          {switchItems.map((item) => {
            const isEnvManaged = isEnvManagedSource(item.source)
            return (
              <Field key={item.name} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FieldLabel htmlFor={`${item.name}-module-switch`} className="text-sm font-medium">
                      {item.label}
                    </FieldLabel>
                    <Badge variant={item.checked ? "default" : "secondary"}>
                      {item.checked ? t("Enabled") : t("Disabled")}
                    </Badge>
                    <Badge variant={isEnvManaged ? "destructive" : "outline"}>{getSourceLabel(item.source, t)}</Badge>
                  </div>
                  {isEnvManaged ? (
                    <FieldDescription>
                      {t("Controlled by {envKey}", { envKey: getModuleSwitchEnvKey(item.name) })}
                    </FieldDescription>
                  ) : null}
                </div>
                <FieldContent className="md:justify-self-end">
                  <Switch
                    id={`${item.name}-module-switch`}
                    checked={item.checked}
                    onCheckedChange={(checked) => updateSwitch(item.name, checked)}
                    disabled={!canUpdateModuleSwitches || isEnvManaged || loading || saving}
                  />
                </FieldContent>
              </Field>
            )
          })}
        </div>
      </div>
    </Page>
  )
}
