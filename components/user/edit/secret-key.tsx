"use client"

import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field"

interface UserEditSecretKeyProps {
  value: string
  error?: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function UserEditSecretKey({ value, error, disabled = false, onChange }: UserEditSecretKeyProps) {
  const { t } = useTranslation()

  return (
    <Field>
      <FieldLabel htmlFor="edit-user-secret-key">{t("Change Secret Key")}</FieldLabel>
      <FieldContent>
        <Input
          id="edit-user-secret-key"
          name="edit-user-secret-key"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="password"
          autoComplete="new-password"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={Boolean(error)}
        />
      </FieldContent>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
