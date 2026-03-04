"use client"

import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field"

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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="password"
          autoComplete="new-password"
          disabled={disabled}
        />
      </FieldContent>
      {error && <FieldDescription className="text-destructive">{error}</FieldDescription>}
    </Field>
  )
}
