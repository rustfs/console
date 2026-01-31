"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldLabel, FieldDescription } from "@/components/ui/field"
import { useMessage } from "@/lib/ui/message"
import { useApi } from "@/contexts/api-context"
import { useUsers } from "@/hooks/use-users"

interface ChangePasswordProps {
  visible: boolean
  onVisibleChange: (visible: boolean) => void
}

export function AccessKeysChangePassword({ visible, onVisibleChange }: ChangePasswordProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const api = useApi()
  const { createUser } = useUsers()

  const [currentSecretKey, setCurrentSecretKey] = useState("")
  const [newSecretKey, setNewSecretKey] = useState("")
  const [reNewSecretKey, setReNewSecretKey] = useState("")
  const [errors, setErrors] = useState({
    current: "",
    new: "",
    reNew: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const clearForm = () => {
    setCurrentSecretKey("")
    setNewSecretKey("")
    setReNewSecretKey("")
    setErrors({ current: "", new: "", reNew: "" })
    setSubmitting(false)
  }

  const closeModal = (open = false) => {
    onVisibleChange(open)
    if (!open) clearForm()
  }

  const validate = () => {
    const newErrors = {
      current: !currentSecretKey ? t("Please enter current password") : "",
      new: !newSecretKey ? t("Please enter new password") : "",
      reNew: !reNewSecretKey
        ? t("Please enter new password again")
        : reNewSecretKey !== newSecretKey
          ? t("The two passwords are inconsistent")
          : "",
    }
    setErrors(newErrors)
    return !newErrors.current && !newErrors.new && !newErrors.reNew
  }

  const submitForm = async () => {
    if (!validate()) {
      message.error(t("Please fill in the correct format"))
      return
    }

    setSubmitting(true)
    try {
      const userInfo = (await api.get("/accountinfo")) as { account_name?: string }
      await createUser({
        accessKey: userInfo?.account_name ?? "",
        secretKey: newSecretKey,
        status: "enabled",
      })
      message.success(t("Updated successfully"))
      closeModal()
    } catch (error) {
      console.error(error)
      message.error(t("Update failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={visible} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Change current account password")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Field>
            <FieldLabel htmlFor="password-current">
              {t("Current Password")}
            </FieldLabel>
            <FieldContent>
              <Input
                id="password-current"
                value={currentSecretKey}
                onChange={(e) => setCurrentSecretKey(e.target.value)}
                type="password"
                autoComplete="off"
              />
            </FieldContent>
            {errors.current && (
              <FieldDescription className="text-destructive">
                {errors.current}
              </FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="password-new">{t("New Password")}</FieldLabel>
            <FieldContent>
              <Input
                id="password-new"
                value={newSecretKey}
                onChange={(e) => setNewSecretKey(e.target.value)}
                type="password"
                autoComplete="off"
              />
            </FieldContent>
            {errors.new && (
              <FieldDescription className="text-destructive">
                {errors.new}
              </FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="password-new-confirm">
              {t("Confirm New Password")}
            </FieldLabel>
            <FieldContent>
              <Input
                id="password-new-confirm"
                value={reNewSecretKey}
                onChange={(e) => setReNewSecretKey(e.target.value)}
                type="password"
                autoComplete="off"
                disabled={!newSecretKey}
              />
            </FieldContent>
            {errors.reNew && (
              <FieldDescription className="text-destructive">
                {errors.reNew}
              </FieldDescription>
            )}
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => closeModal()}>
            {t("Cancel")}
          </Button>
          <Button onClick={submitForm} disabled={submitting}>
            {submitting ? <Spinner className="size-4" /> : null}
            <span>{t("Submit")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
