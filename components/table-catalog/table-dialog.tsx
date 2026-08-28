"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useTableCatalog, type CreateTablePayload } from "@/hooks/use-table-catalog"
import { useMessage } from "@/lib/feedback/message"
import { isCatalogIdentifierValid } from "@/lib/table-catalog-paths"

interface TableDialogProps {
  open: boolean
  bucket: string
  catalogPrefix?: string
  namespace: string[]
  canCreate?: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const DEFAULT_SCHEMA = `{
  "type": "struct",
  "schema-id": 0,
  "fields": [
    { "id": 1, "name": "id", "required": true, "type": "long" },
    { "id": 2, "name": "payload", "required": false, "type": "string" }
  ]
}`

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`)
  }
  return parsed as Record<string, unknown>
}

export function TableDialog({
  open,
  bucket,
  catalogPrefix,
  namespace,
  canCreate = false,
  onOpenChange,
  onSuccess,
}: TableDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { createTable } = useTableCatalog(catalogPrefix)
  const [name, setName] = React.useState("")
  const [schema, setSchema] = React.useState(DEFAULT_SCHEMA)
  const [location, setLocation] = React.useState("")
  const [nameError, setNameError] = React.useState("")
  const [schemaError, setSchemaError] = React.useState("")
  const [saveError, setSaveError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const submittingRef = React.useRef(false)

  const reset = React.useCallback(() => {
    setName("")
    setSchema(DEFAULT_SCHEMA)
    setLocation("")
    setNameError("")
    setSchemaError("")
    setSaveError("")
    setSubmitting(false)
    submittingRef.current = false
  }, [])

  React.useEffect(() => {
    if (open) reset()
  }, [open, reset])

  const validate = () => {
    let valid = true
    const trimmedName = name.trim().toLowerCase()
    if (!isCatalogIdentifierValid(trimmedName)) {
      setNameError(t("Use lowercase letters, numbers, hyphens, or underscores."))
      document.getElementById("table-catalog-table-name")?.focus()
      valid = false
    } else {
      setNameError("")
    }

    try {
      const parsed = parseJsonObject(schema, t("Schema"))
      if (parsed.type !== "struct" || !Array.isArray(parsed.fields)) {
        throw new Error(t("Schema must contain a struct type and a fields array."))
      }
      setSchemaError("")
    } catch (error) {
      setSchemaError(error instanceof Error ? error.message : t("Schema must be valid JSON."))
      if (valid) document.getElementById("table-catalog-table-schema")?.focus()
      valid = false
    }

    return valid ? trimmedName : null
  }

  const handleSubmit = async () => {
    if (submittingRef.current || !canCreate) return
    const tableName = validate()
    if (!tableName) return

    let parsedSchema: Record<string, unknown>
    try {
      parsedSchema = parseJsonObject(schema, t("Schema"))
    } catch {
      return
    }

    const payload: CreateTablePayload = {
      name: tableName,
      schema: parsedSchema,
      location: location.trim() || undefined,
    }

    submittingRef.current = true
    setSubmitting(true)
    setSaveError("")
    try {
      await createTable(bucket, namespace, payload)
      message.success(t("Table created"))
      onSuccess?.()
      onOpenChange(false)
      reset()
    } catch (error) {
      const text = error instanceof Error && error.message ? error.message : t("Unable to create table")
      setSaveError(text)
      message.error(text)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      disablePointerDismissal={submitting}
      onOpenChange={(nextOpen) => {
        if (!submitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-h-[min(92dvh,54rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-4 pe-12 sm:px-6">
          <DialogTitle>{t("Create table")}</DialogTitle>
          <DialogDescription>
            {t("Create an Iceberg table in")} <span className="font-mono text-foreground">{bucket}</span>
            <span className="text-muted-foreground"> / {namespace.join(".")}</span>.
          </DialogDescription>
        </DialogHeader>

        <form
          className="contents"
          noValidate
          aria-busy={submitting}
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmit()
          }}
        >
          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <FieldGroup>
              {saveError ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("Table creation failed")}</AlertTitle>
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              ) : null}

              {!canCreate ? (
                <Alert>
                  <AlertTitle>{t("Permission required")}</AlertTitle>
                  <AlertDescription>{t("You do not have permission to create tables.")}</AlertDescription>
                </Alert>
              ) : null}

              <Field data-invalid={Boolean(nameError)}>
                <FieldLabel htmlFor="table-catalog-table-name">{t("Table name")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="table-catalog-table-name"
                    name="table-name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value.toLowerCase())
                      setNameError("")
                      setSaveError("")
                    }}
                    placeholder="events"
                    autoComplete="off"
                    spellCheck={false}
                    required
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={nameError ? "table-catalog-table-name-error" : "table-catalog-table-name-help"}
                    disabled={!canCreate || submitting}
                  />
                </FieldContent>
                <FieldDescription id="table-catalog-table-name-help">
                  {t("Use lowercase letters, numbers, hyphens, or underscores.")}
                </FieldDescription>
                <FieldError id="table-catalog-table-name-error">{nameError}</FieldError>
              </Field>

              <Field data-invalid={Boolean(schemaError)}>
                <FieldLabel htmlFor="table-catalog-table-schema">{t("Schema")}</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="table-catalog-table-schema"
                    name="schema"
                    value={schema}
                    onChange={(event) => {
                      setSchema(event.target.value)
                      setSchemaError("")
                      setSaveError("")
                    }}
                    className="min-h-64 font-mono text-[0.7rem] leading-5"
                    spellCheck={false}
                    required
                    aria-invalid={Boolean(schemaError)}
                    aria-describedby={
                      schemaError ? "table-catalog-table-schema-error" : "table-catalog-table-schema-help"
                    }
                    disabled={!canCreate || submitting}
                  />
                </FieldContent>
                <FieldDescription id="table-catalog-table-schema-help">
                  {t("Iceberg struct schema in REST Catalog JSON format. Field IDs are preserved by the server.")}
                </FieldDescription>
                <FieldError id="table-catalog-table-schema-error">{schemaError}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="table-catalog-table-location">{t("Location (optional)")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="table-catalog-table-location"
                    name="location"
                    type="url"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder={`s3://${bucket}/tables/events`}
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="table-catalog-table-location-help"
                    disabled={!canCreate || submitting}
                  />
                </FieldContent>
                <FieldDescription id="table-catalog-table-location-help">
                  {t("Leave blank to let RustFS place metadata and data inside this table bucket.")}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={submitting || !canCreate}>
              {submitting ? <Spinner className="size-4" aria-hidden /> : null}
              {submitting ? t("Creating…") : t("Create table")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
