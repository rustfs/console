"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMessage } from "@/lib/feedback/message"
import { useGroups } from "@/hooks/use-groups"
import { UserSelector } from "@/components/user/selector"

interface UserGroupNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function UserGroupNewForm({
  open,
  onOpenChange,
  onSuccess,
}: UserGroupNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { updateGroupMembers } = useGroups()

  const [group, setGroup] = React.useState("")
  const [members, setMembers] = React.useState<string[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setGroup("")
      setMembers([])
    }
  }, [open])

  const closeModal = () => onOpenChange(false)

  const submitForm = async () => {
    if (!group.trim()) {
      message.error(t("Please enter user group name"))
      return
    }

    setSubmitting(true)
    try {
      await updateGroupMembers({
        group: group.trim(),
        members,
        isRemove: false,
        groupStatus: "enabled",
      })
      message.success(t("Add success"))
      closeModal()
      onSuccess()
    } catch {
      message.error(t("Add failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Add group members")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <Field>
            <FieldLabel className="text-sm font-medium">{t("Name")}</FieldLabel>
            <FieldContent>
              <Input
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <UserSelector
            value={members}
            onChange={setMembers}
            label={t("Users")}
            placeholder={t("Select user group members")}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal}>
            {t("Cancel")}
          </Button>
          <Button onClick={submitForm} disabled={submitting}>
            {submitting && <Spinner className="mr-2 size-4" />}
            {t("Submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
