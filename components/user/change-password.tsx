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

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 40

export function ChangePassword({ visible, onVisibleChange }: ChangePasswordProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const api = useApiOptional()
  const { createUser } = useUsers()

  const [newSecretKey, setNewSecretKey] = useState("")
  const [reNewSecretKey, setReNewSecretKey] = useState("")
  const [errors, setErrors] = useState({
    new: "",
    reNew: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const clearForm = () => {
    setNewSecretKey("")
    setReNewSecretKey("")
    setErrors({ new: "", reNew: "" })
    setSubmitting(false)
  }

  const closeModal = (open = false) => {
    onVisibleChange(open)
    if (!open) clearForm()
  }

  const handleOpenChange = (open: boolean) => {
    if (!submitting || open) closeModal(open)
  }

  const validate = () => {
    const newErrors = {
      new: !newSecretKey
        ? t("Please enter new password")
        : newSecretKey.length < PASSWORD_MIN_LENGTH || newSecretKey.length > PASSWORD_MAX_LENGTH
          ? t("password length cannot be less than 8 characters and greater than 40 characters")
          : "",
      reNew: !reNewSecretKey
        ? t("Please enter new password again")
        : reNewSecretKey !== newSecretKey
          ? t("The two passwords are inconsistent")
          : "",
    }
    setErrors(newErrors)
    return !newErrors.new && !newErrors.reNew
  }

  const submitForm = async () => {
    if (submitting) return
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
      if (!userInfo?.account_name) {
        message.error(t("Failed to get data"))
        return
      }
      await createUser(
        {
          accessKey: userInfo.account_name,
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
    <Dialog open={visible} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        className="max-h-[min(90dvh,40rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg"
        aria-busy={submitting}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{t("Change Password")}</DialogTitle>
        </DialogHeader>

        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            void submitForm()
          }}
        >
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4">
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
                  minLength={PASSWORD_MIN_LENGTH}
                  maxLength={PASSWORD_MAX_LENGTH}
                  required
                  disabled={submitting}
                  aria-invalid={Boolean(errors.new)}
                  aria-describedby={errors.new ? "password-new-error" : undefined}
                />
              </FieldContent>
              <FieldError id="password-new-error">{errors.new}</FieldError>
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
                  minLength={PASSWORD_MIN_LENGTH}
                  maxLength={PASSWORD_MAX_LENGTH}
                  required
                  disabled={!newSecretKey || submitting}
                  aria-invalid={Boolean(errors.reNew)}
                  aria-describedby={errors.reNew ? "password-new-confirm-error" : undefined}
                />
              </FieldContent>
              <FieldError id="password-new-confirm-error">{errors.reNew}</FieldError>
            </Field>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-4 py-3">
            <Button type="button" variant="outline" onClick={() => closeModal()} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Spinner className="size-4" /> : null}
              <span>{t("Submit")}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
