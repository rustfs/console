"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { useMessage } from "@/lib/feedback/message"
import { useApiOptional } from "@/contexts/api-context"
import { useUsers } from "@/hooks/use-users"

interface ChangePasswordProps {
  visible: boolean
  onVisibleChange: (visible: boolean) => void
}

export function ChangePassword({ visible, onVisibleChange }: ChangePasswordProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const api = useApiOptional()
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
      if (!api) {
        message.error(t("API not ready"))
        return
      }
      const userInfo = (await api.get("/accountinfo")) as { account_name?: string }
      await createUser(
        {
          accessKey: userInfo?.account_name ?? "",
          secretKey: newSecretKey,
          status: "enabled",
        },
        { suppress403Redirect: true },
      )
      message.success(t("Updated successfully"))
      closeModal()
    } catch (error) {
      console.error(error)
      message.error((error as Error)?.message || t("Update failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={visible} onOpenChange={closeModal}>
      <DialogContent className="overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Change current account password")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Field>
            <FieldLabel htmlFor="password-current">{t("Current Password")}</FieldLabel>
            <FieldContent>
              <Input
                id="password-current"
                name="password-current"
                value={currentSecretKey}
                onChange={(e) => setCurrentSecretKey(e.target.value)}
                type="password"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(errors.current)}
              />
            </FieldContent>
            <FieldError>{errors.current}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="password-new">{t("New Password")}</FieldLabel>
            <FieldContent>
              <Input
                id="password-new"
                name="password-new"
                value={newSecretKey}
                onChange={(e) => setNewSecretKey(e.target.value)}
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                aria-invalid={Boolean(errors.new)}
              />
            </FieldContent>
            <FieldError>{errors.new}</FieldError>
          </Field>

          <Field>
            <FieldLabel htmlFor="password-new-confirm">{t("Confirm New Password")}</FieldLabel>
            <FieldContent>
              <Input
                id="password-new-confirm"
                name="password-new-confirm"
                value={reNewSecretKey}
                onChange={(e) => setReNewSecretKey(e.target.value)}
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                disabled={!newSecretKey}
                aria-invalid={Boolean(errors.reNew)}
              />
            </FieldContent>
            <FieldError>{errors.reNew}</FieldError>
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
