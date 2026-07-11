"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMessage } from "@/lib/feedback/message"
import { usePolicies } from "@/hooks/use-policies"

export interface PolicyItem {
  name: string
  content: string | object
}

interface PolicyFormProps {
  show: boolean
  onShowChange: (show: boolean) => void
  policy: PolicyItem | null
  onSaved: () => void
}

export function PolicyForm({ show, onShowChange, policy, onSaved }: PolicyFormProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { addPolicy } = usePolicies()

  const [name, setName] = React.useState("")
  const [content, setContent] = React.useState("")
  const [errors, setErrors] = React.useState({ name: "", content: "" })
  const [submitting, setSubmitting] = React.useState(false)
  const isEditing = Boolean(policy?.name)

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

  const handleOpenChange = (nextShow: boolean) => {
    if (!submitting || nextShow) {
      onShowChange(nextShow)
    }
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
        const parsed = JSON.parse(content)
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          newErrors.content = t("Policy must be a valid JSON object")
        } else if (parsed.Statement !== undefined && !Array.isArray(parsed.Statement)) {
          newErrors.content = t("Policy Statement must be an array")
        }
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
    if (submitting) return
    if (!validate()) {
      message.error(t("Please fill in the correct format"))
      return
    }

    setSubmitting(true)
    try {
      const payload = normalizePolicyForSubmit(JSON.parse(content) as Record<string, unknown>)
      await addPolicy(name.trim(), payload)
      message.success(t("Saved"))
      closeModal()
      onSaved()
    } catch (error) {
      console.error(error)
      const msg = error instanceof Error ? error.message : String(error)
      message.error(msg || t("Save Failed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={show} onOpenChange={handleOpenChange} disablePointerDismissal={submitting}>
      <DialogContent
        className="max-h-[min(90dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl"
        aria-busy={submitting}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{isEditing ? t("Edit Policy") : t("New Policy")}</DialogTitle>
        </DialogHeader>

        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            void submitForm()
          }}
        >
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden p-4">
            <Field>
              <FieldLabel htmlFor="policy-name">{t("Policy Name")}</FieldLabel>
              <FieldContent>
                <Input
                  id="policy-name"
                  name="policy-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  required
                  disabled={isEditing || submitting}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "policy-name-error" : undefined}
                />
              </FieldContent>
              <FieldError id="policy-name-error">{errors.name}</FieldError>
            </Field>

            <Field className="flex min-h-0 flex-1 flex-col">
              <FieldLabel htmlFor="policy-content">{t("Policy")}</FieldLabel>
              <FieldContent className="flex min-h-0 flex-1">
                <Textarea
                  id="policy-content"
                  name="policy-content"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value)
                    if (errors.content) setErrors((current) => ({ ...current, content: "" }))
                  }}
                  className="min-h-[12rem] flex-1 resize-none overflow-y-auto font-mono text-xs"
                  spellCheck={false}
                  required
                  disabled={submitting}
                  aria-invalid={Boolean(errors.content)}
                  aria-describedby={errors.content ? "policy-content-error" : undefined}
                />
              </FieldContent>
              <FieldError id="policy-content-error">{errors.content}</FieldError>
            </Field>
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
            <Button type="submit" variant="default" className="w-full sm:w-auto" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  {t("Save")}
                </span>
              ) : (
                t("Save")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
