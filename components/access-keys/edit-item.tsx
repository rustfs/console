"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import dayjs from "dayjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateTimePicker } from "@/components/datetime-picker"
import { useMessage } from "@/lib/feedback/message"
import { useAccessKeys } from "@/hooks/use-access-keys"

interface RowData {
  accessKey: string
  expiration?: string | null
  name?: string
  description?: string
  accountStatus?: string
}

interface AccessKeysEditItemProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: RowData | null
  onSuccess: () => void
}

export function AccessKeysEditItem({
  open,
  onOpenChange,
  row,
  onSuccess,
}: AccessKeysEditItemProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { getServiceAccount, updateServiceAccount } = useAccessKeys()

  const [accesskey, setAccesskey] = React.useState("")
  const [policy, setPolicy] = React.useState("")
  const [expiry, setExpiry] = React.useState<string | null>(null)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [status, setStatus] = React.useState<"on" | "off">("on")
  const [submitting, setSubmitting] = React.useState(false)

  const minExpiry = React.useMemo(() => dayjs().toISOString(), [])

  React.useEffect(() => {
    if (open && row?.accessKey) {
      getServiceAccount(row.accessKey)
        .then((res: { policy?: unknown; expiration?: string; name?: string; description?: string; accountStatus?: string }) => {
          setAccesskey(row.accessKey)
          const policyValue =
            typeof res.policy === "string" ? res.policy : JSON.stringify(res.policy ?? {}, null, 2)
          setPolicy(policyValue)
          setExpiry(
            res.expiration && res.expiration !== "9999-01-01T00:00:00Z"
              ? dayjs(res.expiration).toISOString()
              : null
          )
          setName(res.name ?? "")
          setDescription(res.description ?? "")
          setStatus((res.accountStatus as "on" | "off") ?? "on")
        })
        .catch(() => {
          message.error(t("Failed to get data"))
        })
    }
  }, [open, row?.accessKey, getServiceAccount, message, t])

  const closeModal = () => {
    onOpenChange(false)
  }

  const submitForm = async () => {
    if (!accesskey) return

    setSubmitting(true)
    try {
      await updateServiceAccount(accesskey, {
        newPolicy: policy || "{}",
        newStatus: status,
        newName: name,
        newDescription: description,
        newExpiration: expiry ? dayjs(expiry).toISOString() : "9999-01-01T00:00:00Z",
      })
      message.success(t("Updated successfully"))
      closeModal()
      onSuccess()
    } catch (error) {
      console.error(error)
      message.error(t("Update failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent
        className="sm:max-w-6xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Edit Key")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 lg:flex-row max-h-[80vh] overflow-auto px-2 -mx-2">
          <div className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
            <Field>
              <FieldLabel>{t("Access Key")}</FieldLabel>
              <FieldContent>
                <Input value={accesskey} disabled />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("Expiry")}</FieldLabel>
              <FieldContent>
                <DateTimePicker value={expiry} onChange={setExpiry} min={minExpiry} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("Name")}</FieldLabel>
              <FieldContent>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel>{t("Description")}</FieldLabel>
              <FieldContent>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </FieldContent>
            </Field>

            <Field orientation="responsive">
              <FieldLabel className="text-sm font-medium">{t("Status")}</FieldLabel>
              <FieldContent className="flex justify-end">
                <Switch
                  checked={status === "on"}
                  onCheckedChange={(checked) => setStatus(checked ? "on" : "off")}
                />
              </FieldContent>
            </Field>
          </div>

          <div className="flex-1 max-h-[60vh] overflow-auto">
            <Field className="h-full">
              <FieldLabel>{t("Policy")}</FieldLabel>
              <FieldContent className="h-full">
                <Textarea
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                  className="h-full min-h-[200px] font-mono text-xs"
                />
              </FieldContent>
            </Field>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={closeModal}>
            {t("Cancel")}
          </Button>
          <Button variant="default" disabled={submitting} onClick={submitForm}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <Spinner className="size-4" />
                {t("Submit")}
              </span>
            ) : (
              t("Submit")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
