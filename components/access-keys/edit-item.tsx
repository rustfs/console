"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import dayjs from "dayjs"
import { RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

export function AccessKeysEditItem({ open, onOpenChange, row, onSuccess }: AccessKeysEditItemProps) {
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
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [policyError, setPolicyError] = React.useState("")
  const [loadVersion, setLoadVersion] = React.useState(0)
  const [initialName, setInitialName] = React.useState("")
  const [initialDescription, setInitialDescription] = React.useState("")

  const minExpiry = React.useMemo(() => dayjs().toISOString(), [])

  React.useEffect(() => {
    if (!open || !row?.accessKey) return

    let cancelled = false
    const currentAccessKey = row.accessKey

    setAccesskey(currentAccessKey)
    setPolicy("")
    setExpiry(null)
    setName("")
    setDescription("")
    setStatus("on")
    setInitialName("")
    setInitialDescription("")
    setPolicyError("")
    setLoadError("")
    setLoading(true)

    getServiceAccount(currentAccessKey)
      .then(
        (res: {
          policy?: unknown
          expiration?: string
          name?: string
          description?: string
          accountStatus?: string
        }) => {
          if (cancelled) return
          let policyValue: string
          if (typeof res.policy === "string") {
            try {
              policyValue = JSON.stringify(JSON.parse(res.policy), null, 2)
            } catch {
              policyValue = res.policy
            }
          } else {
            policyValue = JSON.stringify(res.policy ?? {}, null, 2)
          }
          setPolicy(policyValue)
          setExpiry(
            res.expiration && res.expiration !== "9999-01-01T00:00:00Z" ? dayjs(res.expiration).toISOString() : null,
          )
          const initialNameValue = res.name ?? ""
          const initialDescriptionValue = res.description ?? ""
          setName(initialNameValue)
          setDescription(initialDescriptionValue)
          setInitialName(initialNameValue)
          setInitialDescription(initialDescriptionValue)
          setStatus((res.accountStatus as "on" | "off") ?? "on")
        },
      )
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
  }, [open, row?.accessKey, getServiceAccount, loadVersion, message, t])

  const closeModal = () => {
    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!submitting || nextOpen) {
      onOpenChange(nextOpen)
    }
  }

  const submitForm = async () => {
    if (!accesskey || loading || loadError) return
    if (submitting) return
    setPolicyError("")

    // Validate policy JSON format before submitting
    if (policy) {
      try {
        const parsed = JSON.parse(policy)
        // Basic structure validation
        if (typeof parsed !== "object" || parsed === null) {
          setPolicyError(t("Policy must be a valid JSON object"))
          return
        }
        if (parsed.Statement !== undefined && !Array.isArray(parsed.Statement)) {
          setPolicyError(t("Policy Statement must be an array"))
          return
        }
      } catch {
        setPolicyError(t("Policy format is invalid. Please check the JSON syntax."))
        return
      }
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        newPolicy: policy || "{}",
        newStatus: status,
        newExpiration: expiry ? dayjs(expiry).toISOString() : "9999-01-01T00:00:00Z",
      }
      // Only send newName if it has changed to avoid validation errors on unchanged invalid names
      if (name !== initialName) {
        payload.newName = name
      }
      // Only send newDescription if it has changed
      if (description !== initialDescription) {
        payload.newDescription = description
      }
      await updateServiceAccount(accesskey, payload)
      message.success(t("Updated successfully"))
      closeModal()
      onSuccess()
    } catch (error) {
      console.error(error)
      message.error((error as Error)?.message || t("Update failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal={submitting}>
      <DialogContent
        className="max-h-[min(90dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-6xl"
        aria-busy={loading || submitting}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{t("Edit Key")}</DialogTitle>
        </DialogHeader>

        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            void submitForm()
          }}
        >
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
            ) : (
              <div className="flex flex-col gap-4 lg:min-h-[32rem] lg:flex-row">
                <div className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
                  <Field>
                    <FieldLabel htmlFor="edit-access-key">{t("Access Key")}</FieldLabel>
                    <FieldContent>
                      <Input id="edit-access-key" name="edit-access-key" value={accesskey} disabled />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-access-key-expiry">{t("Expiry")}</FieldLabel>
                    <FieldContent>
                      <DateTimePicker
                        id="edit-access-key-expiry"
                        value={expiry}
                        onChange={setExpiry}
                        min={minExpiry}
                        disabled={loading || submitting}
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-access-key-name">{t("Name")}</FieldLabel>
                    <FieldContent>
                      <Input
                        id="edit-access-key-name"
                        name="edit-access-key-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        disabled={loading || submitting}
                      />
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-access-key-description">{t("Description")}</FieldLabel>
                    <FieldContent>
                      <Textarea
                        id="edit-access-key-description"
                        name="edit-access-key-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        disabled={loading || submitting}
                      />
                    </FieldContent>
                  </Field>

                  <Field orientation="responsive">
                    <FieldLabel htmlFor="edit-access-key-status" className="text-sm font-medium">
                      {t("Status")}
                    </FieldLabel>
                    <FieldContent className="flex justify-end">
                      <Switch
                        id="edit-access-key-status"
                        checked={status === "on"}
                        onCheckedChange={(checked) => setStatus(checked ? "on" : "off")}
                        disabled={loading || submitting}
                      />
                    </FieldContent>
                  </Field>
                </div>

                <div className="min-h-[20rem] flex-1 lg:min-h-0">
                  <Field className="h-full">
                    <FieldLabel htmlFor="edit-access-key-policy">{t("Policy")}</FieldLabel>
                    <FieldContent className="h-full">
                      <Textarea
                        id="edit-access-key-policy"
                        name="edit-access-key-policy"
                        value={policy}
                        onChange={(e) => {
                          setPolicy(e.target.value)
                          setPolicyError("")
                        }}
                        className="min-h-[24rem] font-mono text-xs lg:h-full"
                        spellCheck={false}
                        disabled={loading || submitting}
                        aria-invalid={Boolean(policyError)}
                        aria-describedby={policyError ? "edit-access-key-policy-error" : undefined}
                      />
                    </FieldContent>
                    <FieldError id="edit-access-key-policy-error">{policyError}</FieldError>
                  </Field>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t bg-muted/20 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={closeModal}
              disabled={submitting}
            >
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              variant="default"
              className="w-full sm:w-auto"
              disabled={loading || submitting || Boolean(loadError)}
            >
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
        </form>
      </DialogContent>
    </Dialog>
  )
}
