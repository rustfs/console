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
import { useTableCatalog, type NamespaceSummary } from "@/hooks/use-table-catalog"
import { useMessage } from "@/lib/feedback/message"
import { displayNamespace, isCatalogIdentifierValid } from "@/lib/table-catalog-paths"

interface NamespaceDialogProps {
  open: boolean
  bucket: string
  catalogPrefix?: string
  initialNamespace?: NamespaceSummary | null
  canCreate?: boolean
  canUpdate?: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function parseProperties(value: string): Record<string, string> {
  if (!value.trim()) return {}
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Properties must be a JSON object")
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, item]) => {
      if (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") {
        throw new Error("Property values must be strings, numbers, or booleans")
      }
      return [key, String(item)]
    }),
  )
}

export function NamespaceDialog({
  open,
  bucket,
  catalogPrefix,
  initialNamespace = null,
  canCreate = false,
  canUpdate = false,
  onOpenChange,
  onSuccess,
}: NamespaceDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { createNamespace, getNamespace, updateNamespaceProperties } = useTableCatalog(catalogPrefix)
  const [namespace, setNamespace] = React.useState("")
  const [properties, setProperties] = React.useState("")
  const [originalProperties, setOriginalProperties] = React.useState<Record<string, string>>({})
  const [fieldError, setFieldError] = React.useState("")
  const [loadError, setLoadError] = React.useState("")
  const [saveError, setSaveError] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const submittingRef = React.useRef(false)
  const requestId = React.useRef(0)
  const [reloadVersion, setReloadVersion] = React.useState(0)

  const editing = Boolean(initialNamespace)
  const canSubmit = editing ? canUpdate : canCreate

  const reset = React.useCallback(() => {
    setNamespace(initialNamespace ? displayNamespace(initialNamespace.namespace) : "")
    setProperties("")
    setOriginalProperties({})
    setFieldError("")
    setLoadError("")
    setSaveError("")
    setLoading(false)
    setSubmitting(false)
    submittingRef.current = false
  }, [initialNamespace])

  React.useEffect(() => {
    if (!open) {
      requestId.current += 1
      return
    }

    reset()
    if (!initialNamespace) return

    const currentRequest = ++requestId.current
    setLoading(true)
    void getNamespace(bucket, initialNamespace.namespace)
      .then((result) => {
        if (currentRequest !== requestId.current) return
        setOriginalProperties(result.properties)
        setProperties(JSON.stringify(result.properties, null, 2))
      })
      .catch((error) => {
        if (currentRequest !== requestId.current) return
        setLoadError(error instanceof Error && error.message ? error.message : t("Unable to load namespace"))
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false)
      })
  }, [bucket, getNamespace, initialNamespace, open, reloadVersion, reset, t])

  const validate = () => {
    const value = namespace.trim()
    const segments = value.split(".").map((segment) => segment.trim())
    if (!value || segments.some((segment) => !isCatalogIdentifierValid(segment))) {
      setFieldError(t("Use lowercase letters, numbers, hyphens, or underscores; separate levels with dots."))
      document.getElementById("table-catalog-namespace")?.focus()
      return null
    }
    if (segments.some((segment) => segment.length > 64)) {
      setFieldError(t("Each namespace level must be 64 characters or fewer."))
      document.getElementById("table-catalog-namespace")?.focus()
      return null
    }
    if (value.length > 512) {
      setFieldError(t("The namespace must be 512 characters or fewer."))
      document.getElementById("table-catalog-namespace")?.focus()
      return null
    }
    setFieldError("")
    return segments
  }

  const handleSubmit = async () => {
    if (submittingRef.current) return
    if (!canSubmit || (editing && (loading || Boolean(loadError)))) return
    const segments = validate()
    if (!segments) return

    let parsedProperties: Record<string, string>
    try {
      parsedProperties = parseProperties(properties)
    } catch (error) {
      const text = error instanceof Error ? error.message : t("Properties must be a JSON object")
      setSaveError(text)
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setSaveError("")
    try {
      if (editing) {
        const removals = Object.keys(originalProperties).filter((key) => !(key in parsedProperties))
        await updateNamespaceProperties(bucket, segments, { removals, updates: parsedProperties })
        message.success(t("Namespace updated"))
      } else {
        await createNamespace(bucket, segments, parsedProperties)
        message.success(t("Namespace created"))
      }
      onSuccess?.()
      onOpenChange(false)
      reset()
    } catch (error) {
      const text =
        error instanceof Error && error.message
          ? error.message
          : editing
            ? t("Unable to update namespace")
            : t("Unable to create namespace")
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
      <DialogContent
        className="max-h-[min(90dvh,42rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-lg"
        aria-busy={loading || submitting}
      >
        <DialogHeader className="border-b px-4 py-4 pe-12 sm:px-6">
          <DialogTitle>{editing ? t("Edit namespace") : t("Create namespace")}</DialogTitle>
          <DialogDescription>
            {editing ? (
              <>
                {t("Update catalog properties for")} <span className="font-mono text-foreground">{bucket}</span>.
              </>
            ) : (
              <>
                {t("Add a logical namespace inside")} <span className="font-mono text-foreground">{bucket}</span>.
              </>
            )}
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
                  <AlertTitle>{editing ? t("Namespace update failed") : t("Namespace creation failed")}</AlertTitle>
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              ) : null}

              {editing && loadError ? (
                <Alert variant="destructive">
                  <AlertTitle>{t("Unable to load namespace")}</AlertTitle>
                  <AlertDescription>{loadError}</AlertDescription>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setReloadVersion((value) => value + 1)}
                  >
                    {t("Retry")}
                  </Button>
                </Alert>
              ) : null}

              {editing && loading ? (
                <div
                  className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground"
                  role="status"
                >
                  <Spinner className="size-4" aria-hidden />
                  {t("Loading namespace…")}
                </div>
              ) : null}

              {!canSubmit ? (
                <Alert>
                  <AlertTitle>{t("Permission required")}</AlertTitle>
                  <AlertDescription>
                    {editing
                      ? t("You do not have permission to update namespaces.")
                      : t("You do not have permission to create namespaces.")}
                  </AlertDescription>
                </Alert>
              ) : null}

              <Field data-invalid={Boolean(fieldError)}>
                <FieldLabel htmlFor="table-catalog-namespace">{t("Namespace")}</FieldLabel>
                <FieldContent>
                  <Input
                    id="table-catalog-namespace"
                    name="namespace"
                    value={namespace}
                    onChange={(event) => {
                      setNamespace(event.target.value.toLowerCase())
                      setFieldError("")
                      setLoadError("")
                      setSaveError("")
                    }}
                    disabled={editing || loading || submitting}
                    placeholder="analytics.reporting"
                    autoComplete="off"
                    spellCheck={false}
                    required
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={fieldError ? "table-catalog-namespace-error" : "table-catalog-namespace-help"}
                  />
                </FieldContent>
                <FieldDescription id="table-catalog-namespace-help">
                  {t("Use dots for nested levels. RustFS stores the REST separator as %1F.")}
                </FieldDescription>
                <FieldError id="table-catalog-namespace-error">{fieldError}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="table-catalog-namespace-properties">{t("Properties (optional)")}</FieldLabel>
                <FieldContent>
                  <Textarea
                    id="table-catalog-namespace-properties"
                    name="properties"
                    value={properties}
                    onChange={(event) => setProperties(event.target.value)}
                    placeholder={'{"owner":"data-platform"}'}
                    className="min-h-24 font-mono text-[0.7rem]"
                    spellCheck={false}
                    disabled={loading || submitting || !canSubmit || (editing && Boolean(loadError))}
                    aria-describedby="table-catalog-namespace-properties-help"
                  />
                </FieldContent>
                <FieldDescription id="table-catalog-namespace-properties-help">
                  {t("Provide a flat JSON object. Values are stored as strings.")}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={submitting || loading || !canSubmit || (editing && Boolean(loadError))}>
              {submitting ? <Spinner className="size-4" aria-hidden /> : null}
              {submitting
                ? editing
                  ? t("Saving…")
                  : t("Creating…")
                : editing
                  ? t("Save changes")
                  : t("Create namespace")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
