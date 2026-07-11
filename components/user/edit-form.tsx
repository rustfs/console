"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiRefreshLine } from "@remixicon/react"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useUsers } from "@/hooks/use-users"
import { usePermissions } from "@/hooks/use-permissions"
import { usePolicies } from "@/hooks/use-policies"
import { useGroups } from "@/hooks/use-groups"
import { useMessage } from "@/lib/feedback/message"
import { getAvailableUserEditTabs } from "@/lib/user-edit-tabs"
import { UserEditSecretKey } from "./edit/secret-key"
import { UserEditGroups } from "./edit/groups"
import { UserEditPolicies } from "./edit/policies"
import { UserEditAccessKeys } from "./edit/access-keys"

interface UserRow {
  accessKey: string
  policyName?: string
  policy?: string[]
  status?: string
  memberOf?: string[]
  updatedAt?: string
  [key: string]: unknown
}

interface UserEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: UserRow | null
  onSuccess: () => void
}

interface UserDetail {
  memberOf?: string[]
  policyName?: string
  status?: string
}

export function UserEditForm({ open, onOpenChange, row, onSuccess }: UserEditFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { getUser, changeUserStatus, createUser } = useUsers()
  const { canCapability } = usePermissions()
  const { listPolicies, setUserOrGroupPolicy } = usePolicies()
  const { listGroup, updateGroupMembers } = useGroups()
  const canEditAccount = canCapability("users.edit")
  const canAssignGroups = canCapability("users.assignGroups")
  const canEditPolicies = canCapability("users.policy.edit")
  const canManageAccessKeys =
    canCapability("accessKeys.create") || canCapability("accessKeys.edit") || canCapability("accessKeys.delete")

  const [user, setUser] = React.useState<{
    accessKey: string
    memberOf: string[]
    policy: string[]
    status: string
  }>({
    accessKey: "",
    memberOf: [],
    policy: [],
    status: "enabled",
  })
  const [originalMemberOf, setOriginalMemberOf] = React.useState<string[]>([])
  const [secretKey, setSecretKey] = React.useState("")
  const [errors, setErrors] = React.useState({ secretKey: "" })
  const [groupsList, setGroupsList] = React.useState<{ label: string; value: string }[]>([])
  const [policiesList, setPoliciesList] = React.useState<{ label: string; value: string }[]>([])
  const [activeTab, setActiveTab] = React.useState("account")
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [loadVersion, setLoadVersion] = React.useState(0)
  const [loadedAccessKey, setLoadedAccessKey] = React.useState("")
  const [originalStatus, setOriginalStatus] = React.useState("enabled")
  const [submitting, setSubmitting] = React.useState(false)

  const statusBoolean = user.status === "enabled"
  const isCurrentUserLoaded = loadedAccessKey === user.accessKey && user.accessKey === row?.accessKey
  const availableTabs = React.useMemo(() => {
    return getAvailableUserEditTabs({
      canEditAccount,
      canAssignGroups,
      canEditPolicies,
      canManageAccessKeys,
    })
  }, [canAssignGroups, canEditAccount, canEditPolicies, canManageAccessKeys])

  React.useEffect(() => {
    if (!open || !row?.accessKey) return

    let cancelled = false
    const targetAccessKey = row.accessKey
    const initialPolicy = Array.isArray(row.policy)
      ? row.policy
      : ((row.policyName as string | undefined)?.split(",").filter(Boolean) ?? [])
    const initialMemberOf = (row.memberOf as string[] | undefined) ?? []
    const initialStatus = (row.status as string) ?? "enabled"

    setUser({
      accessKey: targetAccessKey,
      memberOf: initialMemberOf,
      policy: initialPolicy,
      status: initialStatus,
    })
    setOriginalMemberOf(initialMemberOf)
    setOriginalStatus(initialStatus)
    setSecretKey("")
    setErrors({ secretKey: "" })
    setActiveTab(availableTabs[0] ?? "account")
    setGroupsList([])
    setPoliciesList([])
    setLoadedAccessKey("")
    setLoadError("")
    setLoading(true)

    const needsUserDetail = canEditAccount || canAssignGroups || canEditPolicies
    Promise.all([
      needsUserDetail ? getUser(targetAccessKey) : Promise.resolve(null),
      canAssignGroups ? listGroup() : Promise.resolve([]),
      canEditPolicies ? listPolicies() : Promise.resolve({}),
    ])
      .then(([latest, groups, policies]) => {
        if (cancelled) return
        const latestInfo = (latest ?? {}) as UserDetail
        const latestMemberOf = latestInfo.memberOf ?? initialMemberOf
        const latestStatus = latestInfo.status ?? initialStatus

        setUser({
          accessKey: targetAccessKey,
          memberOf: latestMemberOf,
          policy: latestInfo.policyName?.split(",").filter(Boolean) ?? initialPolicy,
          status: latestStatus,
        })
        setOriginalMemberOf(latestMemberOf)
        setOriginalStatus(latestStatus)
        setGroupsList((groups as string[] | undefined)?.map((group) => ({ label: group, value: group })) ?? [])
        setPoliciesList(
          Object.keys((policies as Record<string, unknown> | undefined) ?? {}).map((policy) => ({
            label: policy,
            value: policy,
          })),
        )
        setLoadedAccessKey(targetAccessKey)
      })
      .catch((error) => {
        if (cancelled) return
        const reason = (error as Error)?.message || t("Failed to get data")
        setLoadError(reason)
        message.error(reason)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    availableTabs,
    canAssignGroups,
    canEditAccount,
    canEditPolicies,
    getUser,
    listGroup,
    listPolicies,
    loadVersion,
    message,
    open,
    row,
    t,
  ])

  const validate = () => {
    const newErrors = { secretKey: "" }
    if (secretKey && !/^.{8,40}$/.test(secretKey)) {
      newErrors.secretKey = t("password length cannot be less than 8 characters and greater than 40 characters")
    }
    setErrors(newErrors)
    return !newErrors.secretKey
  }

  const handleStatusChange = (checked: boolean) => {
    if (!canEditAccount || !isCurrentUserLoaded || loading || loadError || submitting) return
    setUser((current) => ({ ...current, status: checked ? "enabled" : "disabled" }))
  }

  const submitForm = async () => {
    if (!user.accessKey || !isCurrentUserLoaded || loading || loadError || submitting) return
    if (!validate()) {
      message.error(t("Please fill in the correct format"))
      return
    }

    setSubmitting(true)
    try {
      if (canEditAccount && secretKey) {
        await createUser(
          {
            accessKey: user.accessKey,
            secretKey,
            status: user.status,
          },
          { suppress403Redirect: true },
        )
      } else if (canEditAccount && user.status !== originalStatus) {
        await changeUserStatus(user.accessKey, { status: user.status })
      }

      if (canEditPolicies) {
        await setUserOrGroupPolicy({
          policyName: user.policy,
          userOrGroup: user.accessKey,
          isGroup: false,
        })
      }

      const removedGroups = canAssignGroups ? originalMemberOf.filter((group) => !user.memberOf.includes(group)) : []
      const addedGroups = canAssignGroups ? user.memberOf.filter((group) => !originalMemberOf.includes(group)) : []

      if (removedGroups.length) {
        await Promise.all(
          removedGroups.map((group) =>
            updateGroupMembers({
              group,
              members: [user.accessKey],
              isRemove: true,
              groupStatus: "enabled",
            }),
          ),
        )
      }

      if (addedGroups.length) {
        await Promise.all(
          addedGroups.map((group) =>
            updateGroupMembers({
              group,
              members: [user.accessKey],
              isRemove: false,
              groupStatus: "enabled",
            }),
          ),
        )
      }

      message.success(t("Edit Success"))
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error(error)
      message.error((error as Error)?.message || t("Edit Failed"))
    } finally {
      setSubmitting(false)
    }
  }

  const closeModal = () => onOpenChange(false)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!submitting || nextOpen) onOpenChange(nextOpen)
  }
  const isAccessKeysTab = activeTab === "access-keys"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        className="max-h-[min(90dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-5xl"
        aria-busy={loading || submitting}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{row?.accessKey || t("Account")}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {loading ? (
            <div
              className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground"
              role="status"
            >
              <Spinner className="size-4" />
              {t("Loading…")}
            </div>
          ) : loadError ? (
            <div
              className="flex min-h-72 flex-col items-center justify-center gap-3 border border-dashed p-6 text-center"
              role="alert"
            >
              <p className="max-w-md text-sm text-destructive">{loadError}</p>
              <Button type="button" variant="outline" onClick={() => setLoadVersion((current) => current + 1)}>
                <RiRefreshLine className="size-4" aria-hidden />
                {t("Refresh")}
              </Button>
            </div>
          ) : isCurrentUserLoaded ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
              <TabsList className="justify-start overflow-x-auto overflow-y-hidden">
                {canEditAccount ? <TabsTrigger value="account">{t("Account")}</TabsTrigger> : null}
                {canAssignGroups ? <TabsTrigger value="groups">{t("Groups")}</TabsTrigger> : null}
                {canEditPolicies ? <TabsTrigger value="policy">{t("Policies")}</TabsTrigger> : null}
                {canManageAccessKeys ? <TabsTrigger value="access-keys">{t("Access Keys")}</TabsTrigger> : null}
              </TabsList>

              {canEditAccount ? (
                <TabsContent value="account" className="mt-0 space-y-4">
                  <div className="flex items-center justify-start gap-2 border px-3 py-2">
                    <label htmlFor="edit-user-status" className="text-sm text-muted-foreground">
                      {t("Status")}
                    </label>
                    <Switch
                      id="edit-user-status"
                      checked={statusBoolean}
                      onCheckedChange={handleStatusChange}
                      disabled={loading || submitting}
                    />
                  </div>
                  <UserEditSecretKey
                    value={secretKey}
                    error={errors.secretKey}
                    disabled={loading || submitting}
                    onChange={setSecretKey}
                  />
                </TabsContent>
              ) : null}

              {canAssignGroups ? (
                <TabsContent value="groups" className="mt-0">
                  <UserEditGroups
                    value={user.memberOf}
                    options={groupsList}
                    disabled={loading || submitting}
                    onChange={(memberOf) => setUser((prev) => ({ ...prev, memberOf }))}
                  />
                </TabsContent>
              ) : null}

              {canEditPolicies ? (
                <TabsContent value="policy" className="mt-0">
                  <UserEditPolicies
                    value={user.policy}
                    options={policiesList}
                    disabled={loading || submitting}
                    onChange={(policy) => setUser((prev) => ({ ...prev, policy }))}
                  />
                </TabsContent>
              ) : null}

              {canManageAccessKeys ? (
                <TabsContent value="access-keys" className="mt-0">
                  <UserEditAccessKeys userName={user.accessKey} />
                </TabsContent>
              ) : null}
            </Tabs>
          ) : null}
        </div>

        <DialogFooter className="border-t bg-muted/20 px-4 py-3">
          <Button variant="outline" onClick={closeModal} disabled={submitting}>
            {isAccessKeysTab ? t("Close") : t("Cancel")}
          </Button>
          {!isAccessKeysTab && !loadError ? (
            <Button
              onClick={submitForm}
              disabled={loading || submitting || availableTabs.length === 0 || !isCurrentUserLoaded}
            >
              {submitting ? <Spinner className="size-4" /> : null}
              <span>{t("Submit")}</span>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
