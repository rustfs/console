"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useGroups } from "@/hooks/use-groups"
import { UserGroupMembers } from "./members"
import { UserGroupPolicies } from "./policies"

interface GroupInfo {
  name: string
  members: string[]
  status: string
  policy?: string
}

interface UserGroupEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: { name: string } | null
  onSuccess: () => void
}

export function UserGroupEditForm({ open, onOpenChange, row, onSuccess }: UserGroupEditFormProps) {
  const { t } = useTranslation()
  const { getGroup, updateGroupStatus } = useGroups()

  const [group, setGroup] = React.useState<GroupInfo>({
    name: "",
    members: [],
    status: "enabled",
  })
  const [activeTab, setActiveTab] = React.useState("users")
  const [statusBoolean, setStatusBoolean] = React.useState(true)
  const [loadedName, setLoadedName] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [loadVersion, setLoadVersion] = React.useState(0)
  const [statusUpdating, setStatusUpdating] = React.useState(false)
  const activeNameRef = React.useRef("")
  const isCurrentGroup = loadedName === group.name && group.name === row?.name

  React.useEffect(() => {
    const targetName = open ? (row?.name ?? "") : ""
    activeNameRef.current = targetName
    if (!targetName) return

    let cancelled = false
    setGroup({ name: targetName, members: [], status: "enabled" })
    setLoadedName("")
    setStatusBoolean(false)
    setActiveTab("users")
    setLoadError("")
    setLoading(true)

    getGroup(targetName)
      .then((data) => {
        if (cancelled || activeNameRef.current !== targetName) return
        const nextGroup = data as GroupInfo
        setGroup(nextGroup)
        setStatusBoolean(nextGroup.status === "enabled")
        setLoadedName(targetName)
      })
      .catch((error) => {
        if (cancelled || activeNameRef.current !== targetName) return
        setLoadError((error as Error)?.message || t("Failed to get data"))
      })
      .finally(() => {
        if (!cancelled && activeNameRef.current === targetName) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [getGroup, loadVersion, open, row?.name, t])

  const handleStatusToggle = async (checked: boolean) => {
    if (!isCurrentGroup || loading || loadError || statusUpdating) return
    const nextStatus = checked ? "enabled" : "disabled"
    if (nextStatus === group.status) return
    const targetName = group.name
    const previousStatus = group.status
    setStatusBoolean(checked)
    setStatusUpdating(true)

    try {
      await updateGroupStatus(targetName, { ...group, status: nextStatus })
      if (activeNameRef.current !== targetName) return
      setGroup((current) => ({ ...current, status: nextStatus }))
      onSuccess()
    } catch {
      if (activeNameRef.current === targetName) {
        setStatusBoolean(previousStatus === "enabled")
      }
    } finally {
      if (activeNameRef.current === targetName) setStatusUpdating(false)
    }
  }

  const closeModal = () => onOpenChange(false)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!statusUpdating || nextOpen) onOpenChange(nextOpen)
  }
  const refreshGroup = () => setLoadVersion((current) => current + 1)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        className="max-h-[min(90dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        aria-busy={loading || statusUpdating}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{row?.name || t("Members")}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {loading ? (
            <div
              className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <Spinner className="size-4" />
              {t("Loading…")}
            </div>
          ) : loadError ? (
            <div
              className="flex min-h-64 flex-col items-center justify-center gap-3 border border-dashed p-6 text-center"
              role="alert"
            >
              <p className="max-w-md text-sm text-destructive">{loadError}</p>
              <Button type="button" variant="outline" onClick={refreshGroup}>
                <RiRefreshLine className="size-4" aria-hidden />
                {t("Refresh")}
              </Button>
            </div>
          ) : isCurrentGroup ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border px-3 py-2">
                <label htmlFor="user-group-status" className="text-sm text-muted-foreground">
                  {t("Status")}
                </label>
                <Switch
                  id="user-group-status"
                  checked={statusBoolean}
                  onCheckedChange={handleStatusToggle}
                  disabled={loading || Boolean(loadError) || statusUpdating || !isCurrentGroup}
                />
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
                <TabsList className="justify-start overflow-x-auto overflow-y-hidden">
                  <TabsTrigger value="users">{t("Members")}</TabsTrigger>
                  <TabsTrigger value="policy">{t("Policies")}</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-0">
                  <UserGroupMembers group={group} onSearch={refreshGroup} />
                </TabsContent>
                <TabsContent value="policy" className="mt-0">
                  <UserGroupPolicies group={group} onSearch={refreshGroup} />
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3">
          <Button type="button" variant="outline" onClick={closeModal} disabled={statusUpdating}>
            {t("Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
