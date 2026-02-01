"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMessage } from "@/lib/ui/message"
import { usePolicies } from "@/hooks/use-policies"

export interface PolicyItem {
  name: string
  content: string | object
}

interface PoliciesFormItemProps {
  show: boolean
  onShowChange: (show: boolean) => void
  policy: PolicyItem | null
  onSaved: () => void
}

export function PoliciesFormItem({
  show,
  onShowChange,
  policy,
  onSaved,
}: PoliciesFormItemProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { addPolicy } = usePolicies()

  const [name, setName] = React.useState("")
  const [content, setContent] = React.useState("")
  const [errors, setErrors] = React.useState({ name: "", content: "" })
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (show && policy) {
      setName(policy.name ?? "")
      if (typeof policy.content === "object") {
        setContent(JSON.stringify(policy.content, null, 2))
      } else {
        setContent(policy.content ? String(policy.content) : "{}")
      }
      setErrors({ name: "", content: "" })
    }
  }, [show, policy])

  const closeModal = () => {
    onShowChange(false)
    setSubmitting(false)
  }

  const validate = () => {
    const newErrors = { name: "", content: "" }
    if (!name.trim()) {
      newErrors.name = t("Please enter policy name")
    }
    if (!content.trim()) {
      newErrors.content = t("Please enter policy content")
    } else {
      try {
        JSON.parse(content)
      } catch {
        newErrors.content = t("Policy format invalid")
      }
    }
    setErrors(newErrors)
    return !newErrors.name && !newErrors.content
  }

  const normalizePolicyForSubmit = (policy: Record<string, unknown>) => {
    const normalized = JSON.parse(JSON.stringify(policy)) as Record<string, unknown>
    const statements = normalized.Statement as Array<Record<string, unknown>> | undefined
    if (Array.isArray(statements)) {
      for (const stmt of statements) {
        if (Array.isArray(stmt.Resource) && stmt.Resource.length === 0) {
          stmt.Resource = ["*"]
        }
      }
    }
    return normalized
  }

  const submitForm = async () => {
    if (!validate()) {
      message.error(t("Please fill in the correct format"))
      return
    }

    setSubmitting(true)
    try {
      const payload = normalizePolicyForSubmit(
        JSON.parse(content) as Record<string, unknown>
      )
      await addPolicy(name.trim(), payload)
      message.success(t("Saved"))
      closeModal()
      onSaved()
    } catch (error) {
      console.error(error)
      const msg =
        error instanceof Error ? error.message : String(error)
      message.error(msg || t("Save Failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={closeModal}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Policy Original")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[80vh] overflow-auto px-2 -mx-2">
          <Field>
            <FieldLabel htmlFor="policy-name">{t("Policy Name")}</FieldLabel>
            <FieldContent>
              <Input
                id="policy-name"
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
            <FieldLabel htmlFor="policy-content">{t("Policy Original")}</FieldLabel>
            <FieldContent>
              <div className="max-h-[60vh] overflow-auto rounded-md border">
                <Textarea
                  id="policy-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px] font-mono text-xs"
                />
              </div>
            </FieldContent>
            {errors.content && (
              <FieldDescription className="text-destructive">{errors.content}</FieldDescription>
            )}
          </Field>
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
