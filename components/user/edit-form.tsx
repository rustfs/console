"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useUsers } from "@/hooks/use-users"

interface UserRow {
  accessKey: string
  policyName?: string
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

export function UserEditForm({ open, onOpenChange, row, onSuccess }: UserEditFormProps) {
  const { t } = useTranslation()
  const { getUser, changeUserStatus } = useUsers()

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
  const [loading, setLoading] = React.useState(false)

  const statusBoolean = user.status === "enabled"

  const refreshUser = React.useCallback(async () => {
    if (!user.accessKey) return
    try {
      const latest = (await getUser(user.accessKey)) as {
        memberOf?: string[]
        policyName?: string
        status?: string
      }
      setUser((prev) => ({
        ...prev,
        memberOf: latest?.memberOf ?? [],
        policy: latest?.policyName?.split(",").filter(Boolean) ?? [],
        status: latest?.status ?? "enabled",
      }))
    } catch {
      // ignore
    }
  }, [user.accessKey, getUser])

  React.useEffect(() => {
    if (open && row?.accessKey) {
      setUser({
        accessKey: row.accessKey,
        memberOf: (row.memberOf as string[]) ?? [],
        policy: Array.isArray(row.policy) ? row.policy : ((row.policyName as string)?.split(",").filter(Boolean) ?? []),
        status: (row.status as string) ?? "enabled",
      })
      setLoading(true)
      getUser(row.accessKey)
        .then((latest: { memberOf?: string[]; policyName?: string; status?: string }) => {
          setUser((prev) => ({
            ...prev,
            memberOf: latest?.memberOf ?? [],
            policy: latest?.policyName?.split(",").filter(Boolean) ?? [],
            status: latest?.status ?? "enabled",
          }))
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [open, row, getUser])

  const handleStatusChange = async (checked: boolean) => {
    const nextStatus = checked ? "enabled" : "disabled"
    if (!user.accessKey) return
    try {
      await changeUserStatus(user.accessKey, { status: nextStatus })
      setUser((prev) => ({ ...prev, status: nextStatus }))
      await refreshUser()
      onSuccess()
    } catch {
      // revert on error
      setUser((prev) => ({ ...prev, status: prev.status }))
    }
  }

  const closeModal = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{user.accessKey || row?.accessKey || t("Account")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[80vh] overflow-auto px-2 -mx-2">
          <div className="flex items-center justify-start gap-2 rounded-md border px-3 py-2">
            <span className="text-sm text-muted-foreground">{t("Status")}</span>
            <Switch checked={statusBoolean} onCheckedChange={handleStatusChange} disabled={loading} />
            <Button variant="outline" className="ml-auto" disabled>
              {t("Change Secret Key")} (Coming soon)
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            {t("Groups")}: {user.memberOf?.join(", ") || "-"}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("Policies")}: {user.policy?.join(", ") || "-"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
