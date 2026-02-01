"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
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
import { useApi } from "@/contexts/api-context"
import { makeRandomString } from "@/lib/functions"
import { cn } from "@/lib/utils"

interface AccessKeysNewItemProps {
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  onSuccess: () => void
  onNotice: (data: unknown) => void
}

export function AccessKeysNewItem({
  visible,
  onVisibleChange,
  onSuccess,
  onNotice,
}: AccessKeysNewItemProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const api = useApi()
  const { createServiceAccount } = useAccessKeys()

  const [accessKey, setAccessKey] = React.useState("")
  const [secretKey, setSecretKey] = React.useState("")
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [expiry, setExpiry] = React.useState<string | null>(null)
  const [policy, setPolicy] = React.useState("")
  const [impliedPolicy, setImpliedPolicy] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState({
    accessKey: "",
    secretKey: "",
    name: "",
  })

  const minExpiry = React.useMemo(() => new Date().toISOString(), [])

  React.useEffect(() => {
    if (visible) {
      setAccessKey(makeRandomString(20))
      setSecretKey(makeRandomString(40))
      setName("")
      setDescription("")
      setExpiry(null)
      setImpliedPolicy(true)
      setErrors({ accessKey: "", secretKey: "", name: "" })
      api.get("/accountinfo").then((userInfo: { Policy?: unknown }) => {
        setPolicy(JSON.stringify(userInfo?.Policy ?? {}, null, 2))
      }).catch(() => {
        setPolicy("{}")
      })
    }
  }, [visible, api])

  const closeModal = () => {
    onVisibleChange(false)
  }

  const validate = () => {
    const newErrors = { accessKey: "", secretKey: "", name: "" }
    if (!accessKey) {
      newErrors.accessKey = t("Please enter Access Key")
    } else if (accessKey.length < 3 || accessKey.length > 20) {
      newErrors.accessKey = t("Access Key length must be between 3 and 20 characters")
    }
    if (!secretKey) {
      newErrors.secretKey = t("Please enter Secret Key")
    } else if (secretKey.length < 8 || secretKey.length > 40) {
      newErrors.secretKey = t("Secret Key length must be between 8 and 40 characters")
    }
    if (!name) {
      newErrors.name = t("Please enter name")
    }
    setErrors(newErrors)
    return !newErrors.accessKey && !newErrors.secretKey && !newErrors.name
  }

  const submitForm = async () => {
    if (!validate()) {
      message.error(t("Please fill in the correct format"))
      return
    }

    setSubmitting(true)
    try {
      let customPolicy: string | null = null
      if (!impliedPolicy) {
        try {
          customPolicy = JSON.stringify(JSON.parse(policy || "{}"))
        } catch {
          message.error(t("Policy format invalid"))
          setSubmitting(false)
          return
        }
      }

      const payload = {
        accessKey,
        secretKey,
        name,
        description,
        policy: customPolicy,
        expiration: expiry ? expiry : "9999-01-01T00:00:00.000Z",
      }

      const res = await createServiceAccount(payload)
      message.success(t("Added successfully"))
      onNotice(res)
      closeModal()
      onSuccess()
    } catch (error) {
      console.error(error)
      message.error(t("Add failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={visible} onOpenChange={closeModal}>
      <DialogContent
        className={cn(
          "sm:max-w-xl",
          !impliedPolicy && "sm:max-w-6xl"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Create Key")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 lg:flex-row max-h-[80vh] overflow-auto px-2 -mx-2">
          <div
            className={cn(
              impliedPolicy ? "flex flex-1 flex-col gap-4" : "flex w-full flex-col gap-4 lg:w-72 lg:shrink-0"
            )}
          >
            <Field>
              <FieldLabel htmlFor="create-access-key">{t("Access Key")}</FieldLabel>
              <FieldContent>
                <Input
                  id="create-access-key"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  autoComplete="off"
                />
              </FieldContent>
              {errors.accessKey && (
                <FieldDescription className="text-destructive">{errors.accessKey}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-secret-key">{t("Secret Key")}</FieldLabel>
              <FieldContent>
                <Input
                  id="create-secret-key"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  autoComplete="off"
                />
              </FieldContent>
              {errors.secretKey && (
                <FieldDescription className="text-destructive">{errors.secretKey}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-expiry">
                {t("Expiry")}({t("empty is indicates permanent validity")})
              </FieldLabel>
              <FieldContent>
                <DateTimePicker
                  id="create-expiry"
                  value={expiry}
                  onChange={setExpiry}
                  min={minExpiry}
                  placeholder={t("Please select expiry date")}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="create-name">{t("Name")}</FieldLabel>
              <FieldContent>
                <Input
                  id="create-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </FieldContent>
              {errors.name && (
                <FieldDescription className="text-destructive">{errors.name}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-description">{t("Description")}</FieldLabel>
              <FieldContent>
                <Textarea id="create-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </FieldContent>
            </Field>

            <Field orientation="responsive" className="items-start gap-3 rounded-md border p-3">
              <FieldLabel className="text-sm font-medium">{t("Use main account policy")}</FieldLabel>
              <FieldContent className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <p className="text-xs text-muted-foreground">
                  {t("Automatically inherit the main account policy when enabled.")}
                </p>
                <Switch checked={impliedPolicy} onCheckedChange={setImpliedPolicy} />
              </FieldContent>
            </Field>
          </div>

          {!impliedPolicy && (
            <div className="flex-1 max-h-[60vh] overflow-auto">
              <Field className="h-full">
                <FieldLabel>{t("Current user policy")}</FieldLabel>
                <FieldContent className="h-full">
                  <Textarea
                    value={policy}
                    onChange={(e) => setPolicy(e.target.value)}
                    className="h-full min-h-[200px] font-mono text-xs"
                  />
                </FieldContent>
              </Field>
            </div>
          )}
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
