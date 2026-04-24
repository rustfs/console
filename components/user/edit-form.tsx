"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
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
  const [submitting, setSubmitting] = React.useState(false)

  const statusBoolean = user.status === "enabled"
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

    const initialPolicy = Array.isArray(row.policy)
      ? row.policy
      : ((row.policyName as string | undefined)?.split(",").filter(Boolean) ?? [])
    const initialMemberOf = (row.memberOf as string[] | undefined) ?? []

    setUser({
      accessKey: row.accessKey,
      memberOf: initialMemberOf,
      policy: initialPolicy,
      status: (row.status as string) ?? "enabled",
    })
    setOriginalMemberOf(initialMemberOf)
    setSecretKey("")
    setErrors({ secretKey: "" })
    setActiveTab(availableTabs[0] ?? "account")
    setLoading(true)

    Promise.all([getUser(row.accessKey), listGroup(), listPolicies()])
      .then(([latest, groups, policies]) => {
        const latestInfo = (latest ?? {}) as UserDetail
        const latestMemberOf = latestInfo.memberOf ?? initialMemberOf

        setUser((prev) => ({
          ...prev,
          memberOf: latestMemberOf,
          policy: latestInfo.policyName?.split(",").filter(Boolean) ?? initialPolicy,
          status: latestInfo.status ?? prev.status,
        }))
        setOriginalMemberOf(latestMemberOf)
        setGroupsList((groups as string[] | undefined)?.map((group) => ({ label: group, value: group })) ?? [])
        setPoliciesList(
          Object.keys((policies as Record<string, unknown> | undefined) ?? {}).map((policy) => ({
            label: policy,
            value: policy,
          })),
        )
      })
      .catch(() => {
        message.error(t("Failed to get data"))
      })
      .finally(() => setLoading(false))
  }, [availableTabs, open, row, getUser, listGroup, listPolicies, message, t])

  const validate = () => {
    const newErrors = { secretKey: "" }
    if (secretKey && !/^.{8,40}$/.test(secretKey)) {
      newErrors.secretKey = t("password length cannot be less than 8 characters and greater than 40 characters")
    }
    setErrors(newErrors)
    return !newErrors.secretKey
  }

  const handleStatusChange = async (checked: boolean) => {
    if (!canEditAccount) return
    const nextStatus = checked ? "enabled" : "disabled"
    if (!user.accessKey) return

    const previousStatus = user.status
    try {
      await changeUserStatus(user.accessKey, { status: nextStatus })
      setUser((prev) => ({ ...prev, status: nextStatus }))
      onSuccess()
    } catch {
      setUser((prev) => ({ ...prev, status: previousStatus }))
      message.error(t("Edit Failed"))
    }
  }

  const submitForm = async () => {
    if (!user.accessKey) return
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

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent
        className="sm:max-w-5xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{user.accessKey || row?.accessKey || t("Account")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[80vh] overflow-auto px-2 -mx-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
            <TabsList className="justify-start overflow-x-auto">
              {canEditAccount ? <TabsTrigger value="account">{t("Account")}</TabsTrigger> : null}
              {canAssignGroups ? <TabsTrigger value="groups">{t("Groups")}</TabsTrigger> : null}
              {canEditPolicies ? <TabsTrigger value="policy">{t("Policies")}</TabsTrigger> : null}
              {canManageAccessKeys ? <TabsTrigger value="access-keys">{t("Access Keys")}</TabsTrigger> : null}
            </TabsList>

            {canEditAccount ? (
              <TabsContent value="account" className="mt-0 space-y-4">
                <div className="flex items-center justify-start gap-2 rounded-md border px-3 py-2">
                  <span className="text-sm text-muted-foreground">{t("Status")}</span>
                  <Switch
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
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={closeModal} disabled={submitting}>
            {t("Cancel")}
          </Button>
          <Button onClick={submitForm} disabled={loading || submitting || availableTabs.length === 0}>
            {submitting ? <Spinner className="size-4" /> : null}
            <span>{t("Submit")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
