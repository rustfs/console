"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useGroups } from "@/hooks/use-groups"
import { useMessage } from "@/lib/feedback/message"
import { buildAddUsersToGroupsRequests } from "@/lib/user-group-memberships"
import { UserEditGroups } from "./edit/groups"

interface UserAddToGroupFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUsers: string[]
  onSuccess: () => void
}

export function UserAddToGroupForm({ open, onOpenChange, selectedUsers, onSuccess }: UserAddToGroupFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { listGroup, updateGroupMembers } = useGroups()
  const [groups, setGroups] = React.useState<string[]>([])
  const [groupsList, setGroupsList] = React.useState<{ label: string; value: string }[]>([])
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return

    setGroups([])
    setLoading(true)
    listGroup()
      .then((res) => {
        setGroupsList((res as string[] | undefined)?.map((group) => ({ label: group, value: group })) ?? [])
      })
      .catch(() => {
        message.error(t("Failed to get data"))
      })
      .finally(() => setLoading(false))
  }, [listGroup, message, open, t])

  const closeModal = () => onOpenChange(false)

  const submitForm = async () => {
    const requests = buildAddUsersToGroupsRequests(selectedUsers, groups)
    if (!requests.length) {
      message.error(t("Please select at least one item"))
      return
    }

    setSubmitting(true)
    try {
      await Promise.all(requests.map((request) => updateGroupMembers(request)))
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

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("Add to Group")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("Users")}</div>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <Badge key={user} variant="secondary">
                  {user}
                </Badge>
              ))}
            </div>
          </div>
          <UserEditGroups value={groups} options={groupsList} disabled={loading || submitting} onChange={setGroups} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={submitting}>
            {t("Cancel")}
          </Button>
          <Button onClick={submitForm} disabled={loading || submitting || !selectedUsers.length}>
            {submitting ? <Spinner className="size-4" /> : null}
            <span>{t("Submit")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
