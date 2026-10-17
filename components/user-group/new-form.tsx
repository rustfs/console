"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/dialog"
import { useMessage } from "@/lib/feedback/message"
import { useGroups } from "@/hooks/use-groups"
import { UserSelector } from "@/components/user/selector"

interface UserGroupNewFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function UserGroupNewForm({ open, onOpenChange, onSuccess }: UserGroupNewFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { updateGroupMembers } = useGroups()

  const [group, setGroup] = React.useState("")
  const [members, setMembers] = React.useState<string[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const submittingRef = React.useRef(false)

  React.useEffect(() => {
    if (open) {
      setGroup("")
      setMembers([])
    }
  }, [open])

  const closeModal = () => {
    if (!submittingRef.current) onOpenChange(false)
  }

  const submitForm = async () => {
    if (submittingRef.current) return
    if (!group.trim()) {
      message.error(t("Please enter user group name"))
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    try {
      await updateGroupMembers({
        group: group.trim(),
        members,
        isRemove: false,
        groupStatus: "enabled",
      })
      message.success(t("Add success"))
      onOpenChange(false)
      onSuccess()
    } catch {
      message.error(t("Add failed"))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submittingRef.current) onOpenChange(nextOpen)
      }}
      disablePointerDismissal
    >
      <DialogContent className="sm:max-w-lg" aria-busy={submitting}>
        <DialogHeader>
          <DialogTitle>{t("Add group members")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <Field>
            <FieldLabel htmlFor="user-group-name" className="text-sm font-medium">
              {t("Name")}
            </FieldLabel>
            <FieldContent>
              <Input
                id="user-group-name"
                name="user-group-name"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={submitting}
              />
            </FieldContent>
          </Field>
          <UserSelector
            value={members}
            onChange={setMembers}
            label={t("Users")}
            placeholder={t("Select user group members")}
            disabled={submitting}
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal} disabled={submitting}>
            {t("Cancel")}
          </Button>
          <Button onClick={submitForm} disabled={submitting}>
            {submitting && <Spinner className="me-2 size-4" />}
            {t("Submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
