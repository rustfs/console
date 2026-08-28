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
import {
  useTableCatalog,
  type ViewIdentifier,
  type CreateViewPayload,
  type ReplaceViewPayload,
} from "@/hooks/use-table-catalog"
import { useMessage } from "@/lib/feedback/message"
import { displayNamespace, isCatalogIdentifierValid } from "@/lib/table-catalog-paths"

export type ViewDialogMode = "create" | "edit"

interface ViewDialogProps {
  open: boolean
  bucket: string
  catalogPrefix?: string
  namespace: string[]
  mode: ViewDialogMode
  identifier?: ViewIdentifier | null
  canSubmit?: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const DEFAULT_SCHEMA = `{
  "type": "struct",
  "schema-id": 0,
  "fields": []
}`

const DEFAULT_SQL = "SELECT * FROM analytics.events"

function formatJson(value: unknown, fallback = "{}") {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return fallback
  }
}

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`)
  }
  return parsed as Record<string, unknown>
}

function parseProperties(value: string): Record<string, string> {
  if (!value.trim()) return {}
  const parsed = parseJsonObject(value, "Properties")
  return Object.fromEntries(
    Object.entries(parsed).map(([key, item]) => {
      if (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") {
        throw new Error("Property values must be strings, numbers, or booleans")
      }
      return [key, String(item)]
    }),
  )
}

function metadataObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function metadataArray(value: unknown, key: string): Record<string, unknown>[] {
  const candidate = metadataObject(value)[key]
  return Array.isArray(candidate)
    ? candidate.filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
    : []
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function currentViewVersion(metadata: Record<string, unknown>) {
  const versions = metadataArray(metadata, "versions")
  const currentId = metadata["current-version-id"]
  return versions.find((version) => version["version-id"] === currentId) ?? versions.at(-1) ?? null
}

function currentViewSchema(metadata: Record<string, unknown>, version: Record<string, unknown> | null) {
  const schemas = metadataArray(metadata, "schemas")
  const schemaId = version?.["schema-id"]
  return schemas.find((schema) => schema["schema-id"] === schemaId) ?? schemas.at(-1) ?? null
}

function nextVersionId(metadata: Record<string, unknown>) {
  const ids = metadataArray(metadata, "versions")
    .map((version) => version["version-id"])
    .filter((value): value is number => typeof value === "number" && Number.isInteger(value))
  return (ids.length ? Math.max(...ids) : 0) + 1
}

function stringProperty(value: unknown, key: string, fallback = "") {
  const candidate = metadataObject(value)[key]
  return typeof candidate === "string" ? candidate : fallback
}

export function ViewDialog({
  open,
  bucket,
  catalogPrefix,
  namespace,
  mode,
  identifier = null,
  canSubmit = false,
  onOpenChange,
  onSuccess,
}: ViewDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { createView, loadView, replaceView } = useTableCatalog(catalogPrefix)
  const [name, setName] = React.useState("")
  const [schema, setSchema] = React.useState(DEFAULT_SCHEMA)
  const [sql, setSql] = React.useState(DEFAULT_SQL)
  const [dialect, setDialect] = React.useState("spark")
  const [location, setLocation] = React.useState("")
  const [locationTouched, setLocationTouched] = React.useState(false)
  const [properties, setProperties] = React.useState("{}")
  const [originalMetadata, setOriginalMetadata] = React.useState<Record<string, unknown> | null>(null)
  const [originalMetadataLocation, setOriginalMetadataLocation] = React.useState("")
  const [nameError, setNameError] = React.useState("")
  const [schemaError, setSchemaError] = React.useState("")
  const [sqlError, setSqlError] = React.useState("")
  const [dialectError, setDialectError] = React.useState("")
  const [locationError, setLocationError] = React.useState("")
  const [loadError, setLoadError] = React.useState("")
  const [saveError, setSaveError] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const requestId = React.useRef(0)
  const [reloadVersion, setReloadVersion] = React.useState(0)

  const editing = mode === "edit"

  const reset = React.useCallback(() => {
    setName(identifier?.name ?? "")
    setSchema(DEFAULT_SCHEMA)
    setSql(DEFAULT_SQL)
    setDialect("spark")
    setLocation(`s3://${bucket}/views/${identifier?.name ?? "new_view"}`)
    setLocationTouched(false)
    setProperties("{}")
    setOriginalMetadata(null)
    setOriginalMetadataLocation("")
    setNameError("")
    setSchemaError("")
    setSqlError("")
    setDialectError("")
    setLocationError("")
    setLoadError("")
    setSaveError("")
    setLoading(false)
    setSubmitting(false)
  }, [bucket, identifier])

  React.useEffect(() => {
    if (!open) {
      requestId.current += 1
      return
    }

    reset()
    if (!editing || !identifier) return

    const currentRequest = ++requestId.current
    setLoading(true)
    void loadView(bucket, identifier.namespace, identifier.name)
      .then((result) => {
        if (currentRequest !== requestId.current) return
        const metadata = result.metadata
        const version = currentViewVersion(metadata)
        const viewSchema = currentViewSchema(metadata, version)
        const representations = Array.isArray(version?.representations) ? version.representations : []
        const sqlRepresentation = representations.find(
          (representation): representation is Record<string, unknown> =>
            Boolean(representation && typeof representation === "object" && !Array.isArray(representation)) &&
            (representation as Record<string, unknown>).type === "sql",
        )
        setOriginalMetadata(metadata)
        setOriginalMetadataLocation(result.metadataLocation)
        setSchema(formatJson(viewSchema ?? { type: "struct", "schema-id": 0, fields: [] }))
        setSql(stringProperty(sqlRepresentation, "sql", DEFAULT_SQL))
        setDialect(stringProperty(sqlRepresentation, "dialect", "spark"))
        setLocation(stringProperty(metadata, "location", `s3://${bucket}/views/${identifier.name}`))
        setLocationTouched(true)
        setProperties(formatJson(metadata.properties ?? {}, "{}"))
      })
      .catch((error) => {
        if (currentRequest !== requestId.current) return
        setLoadError(error instanceof Error && error.message ? error.message : t("Unable to load view"))
      })
      .finally(() => {
        if (currentRequest === requestId.current) setLoading(false)
      })
  }, [bucket, editing, identifier, loadView, open, reloadVersion, reset, t])

  const validate = () => {
    let valid = true
    if (!editing && !isCatalogIdentifierValid(name.trim().toLowerCase())) {
      setNameError(t("Use lowercase letters, numbers, hyphens, or underscores."))
      document.getElementById("table-catalog-view-name")?.focus()
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
      if (valid) document.getElementById("table-catalog-view-schema")?.focus()
      valid = false
    }

    if (!sql.trim()) {
      setSqlError(t("SQL query is required."))
      if (valid) document.getElementById("table-catalog-view-sql")?.focus()
      valid = false
    } else {
      setSqlError("")
    }

    if (!dialect.trim()) {
      setDialectError(t("SQL dialect is required."))
      if (valid) document.getElementById("table-catalog-view-dialect")?.focus()
      valid = false
    } else {
      setDialectError("")
    }

    if (!location.trim()) {
      setLocationError(t("View location is required."))
      if (valid) document.getElementById("table-catalog-view-location")?.focus()
      valid = false
    } else {
      setLocationError("")
    }
    return valid
  }

  const handleSubmit = async () => {
    if (submitting || loading || !canSubmit || (editing && (!originalMetadata || Boolean(loadError))) || !validate())
      return

    const viewName = (editing ? identifier?.name : name.trim().toLowerCase()) ?? ""
    if (!viewName) return

    let parsedSchema: Record<string, unknown>
    let parsedProperties: Record<string, string>
    try {
      parsedSchema = parseJsonObject(schema, t("Schema"))
      parsedProperties = parseProperties(properties)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : t("View JSON is invalid."))
      return
    }

    setSubmitting(true)
    setSaveError("")
    try {
      if (!editing) {
        const payload: CreateViewPayload = {
          name: viewName,
          schema: parsedSchema,
          location: location.trim(),
          properties: parsedProperties,
          viewVersion: {
            "version-id": 1,
            "timestamp-ms": Date.now(),
            "schema-id": 0,
            summary: { "engine-name": "rustfs-console" },
            "default-catalog": bucket,
            "default-namespace": namespace,
            representations: [{ type: "sql", sql: sql.trim(), dialect: dialect.trim() }],
          },
        }
        await createView(bucket, namespace, payload)
        message.success(t("View created"))
      } else {
        const metadata = originalMetadata ?? {}
        const currentVersion = currentViewVersion(metadata)
        const currentSchema = currentViewSchema(metadata, currentVersion)
        const versionId = nextVersionId(metadata)
        const viewVersion: Record<string, unknown> = {
          ...(currentVersion ?? {}),
          "version-id": versionId,
          "timestamp-ms": Date.now(),
          "schema-id": sameJson(parsedSchema, currentSchema) ? (currentVersion?.["schema-id"] ?? 0) : -1,
          summary: { ...metadataObject(currentVersion?.summary), "engine-name": "rustfs-console" },
          "default-catalog": stringProperty(currentVersion, "default-catalog", bucket),
          "default-namespace": Array.isArray(currentVersion?.["default-namespace"])
            ? currentVersion?.["default-namespace"]
            : namespace,
          representations: [{ type: "sql", sql: sql.trim(), dialect: dialect.trim() }],
        }
        const updates: Record<string, unknown>[] = []
        if (!sameJson(parsedSchema, currentSchema)) updates.push({ action: "add-schema", schema: parsedSchema })
        updates.push({ action: "add-view-version", "view-version": viewVersion })
        updates.push({ action: "set-current-view-version", "view-version-id": -1 })
        if (location.trim() !== stringProperty(metadata, "location")) {
          updates.push({ action: "set-location", location: location.trim() })
        }
        const currentProperties = Object.fromEntries(
          Object.entries(metadataObject(metadata.properties)).flatMap(([key, value]) =>
            typeof value === "string" || typeof value === "number" || typeof value === "boolean"
              ? [[key, String(value)]]
              : [],
          ),
        )
        const removals = Object.keys(currentProperties).filter((key) => !(key in parsedProperties))
        if (removals.length) updates.push({ action: "remove-properties", removals })
        updates.push({ action: "set-properties", updates: parsedProperties })
        const payload: ReplaceViewPayload = {
          identifier: { namespace: identifier?.namespace ?? namespace, name: viewName },
          expectedMetadataLocation: originalMetadataLocation || undefined,
          requirements: viewUuidFromMetadata(metadata)
            ? [{ type: "assert-view-uuid", uuid: viewUuidFromMetadata(metadata) }]
            : [],
          updates,
        }
        await replaceView(bucket, identifier?.namespace ?? namespace, viewName, payload)
        message.success(t("View updated"))
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      const text =
        error instanceof Error && error.message
          ? error.message
          : editing
            ? t("Unable to update view")
            : t("Unable to create view")
      setSaveError(text)
      message.error(text)
    } finally {
      setSubmitting(false)
    }
  }

  const title = editing ? t("Edit view") : t("Create view")
  const namespaceLabel = displayNamespace(namespace)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submitting) onOpenChange(nextOpen)
      }}
      disablePointerDismissal={submitting || loading}
    >
      <DialogContent
        className="max-h-[min(92dvh,56rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl"
        aria-busy={loading || submitting}
      >
        <DialogHeader className="border-b px-4 py-4 pe-12 sm:px-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="break-all">
            {bucket} / <span className="font-mono">{namespaceLabel}</span>
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
            {loading ? (
              <div
                className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"
                role="status"
              >
                <Spinner className="size-5" aria-hidden />
                {t("Loading view details…")}
              </div>
            ) : (
              <FieldGroup>
                {saveError ? (
                  <Alert variant="destructive">
                    <AlertTitle>{editing ? t("View update failed") : t("View creation failed")}</AlertTitle>
                    <AlertDescription>{saveError}</AlertDescription>
                  </Alert>
                ) : null}
                {editing && loadError ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t("Unable to load view")}</AlertTitle>
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
                {!canSubmit ? (
                  <Alert>
                    <AlertTitle>{t("Permission required")}</AlertTitle>
                    <AlertDescription>{t("You do not have permission to manage views.")}</AlertDescription>
                  </Alert>
                ) : null}

                <Field data-invalid={Boolean(nameError)}>
                  <FieldLabel htmlFor="table-catalog-view-name">{t("View name")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="table-catalog-view-name"
                      name="view-name"
                      value={name}
                      onChange={(event) => {
                        const nextName = event.target.value.toLowerCase()
                        setName(nextName)
                        if (!editing && !locationTouched) {
                          setLocation(`s3://${bucket}/views/${nextName || "new_view"}`)
                        }
                        setNameError("")
                        setSaveError("")
                      }}
                      disabled={editing || submitting || !canSubmit || Boolean(loadError)}
                      placeholder="recent_events"
                      autoComplete="off"
                      spellCheck={false}
                      required
                      aria-invalid={Boolean(nameError)}
                    />
                  </FieldContent>
                  <FieldDescription>{t("Use lowercase letters, numbers, hyphens, or underscores.")}</FieldDescription>
                  <FieldError>{nameError}</FieldError>
                </Field>

                <Field data-invalid={Boolean(schemaError)}>
                  <FieldLabel htmlFor="table-catalog-view-schema">{t("Schema")}</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="table-catalog-view-schema"
                      name="schema"
                      value={schema}
                      onChange={(event) => {
                        setSchema(event.target.value)
                        setSchemaError("")
                        setSaveError("")
                      }}
                      className="min-h-44 font-mono text-[0.7rem] leading-5"
                      spellCheck={false}
                      disabled={submitting || !canSubmit || Boolean(loadError)}
                      aria-invalid={Boolean(schemaError)}
                    />
                  </FieldContent>
                  <FieldDescription>{t("View schema in Iceberg REST Catalog JSON format.")}</FieldDescription>
                  <FieldError>{schemaError}</FieldError>
                </Field>

                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                  <Field data-invalid={Boolean(sqlError)}>
                    <FieldLabel htmlFor="table-catalog-view-sql">{t("SQL query")}</FieldLabel>
                    <FieldContent>
                      <Textarea
                        id="table-catalog-view-sql"
                        name="sql"
                        value={sql}
                        onChange={(event) => {
                          setSql(event.target.value)
                          setSqlError("")
                          setSaveError("")
                        }}
                        className="min-h-28 font-mono text-[0.7rem] leading-5"
                        spellCheck={false}
                        disabled={submitting || !canSubmit || Boolean(loadError)}
                        aria-invalid={Boolean(sqlError)}
                      />
                    </FieldContent>
                    <FieldDescription>{t("The SQL representation clients will execute.")}</FieldDescription>
                    <FieldError>{sqlError}</FieldError>
                  </Field>
                  <Field data-invalid={Boolean(dialectError)}>
                    <FieldLabel htmlFor="table-catalog-view-dialect">{t("SQL dialect")}</FieldLabel>
                    <FieldContent>
                      <Input
                        id="table-catalog-view-dialect"
                        name="dialect"
                        value={dialect}
                        onChange={(event) => {
                          setDialect(event.target.value)
                          setDialectError("")
                        }}
                        placeholder="spark"
                        autoComplete="off"
                        spellCheck={false}
                        disabled={submitting || !canSubmit || Boolean(loadError)}
                      />
                    </FieldContent>
                    <FieldDescription>{t("For example, spark or trino.")}</FieldDescription>
                    <FieldError>{dialectError}</FieldError>
                  </Field>
                </div>

                <Field data-invalid={Boolean(locationError)}>
                  <FieldLabel htmlFor="table-catalog-view-location">{t("Location")}</FieldLabel>
                  <FieldContent>
                    <Input
                      id="table-catalog-view-location"
                      name="location"
                      value={location}
                      onChange={(event) => {
                        setLocation(event.target.value)
                        setLocationTouched(true)
                        setLocationError("")
                        setSaveError("")
                      }}
                      placeholder={`s3://${bucket}/views/${name || "recent_events"}`}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={submitting || !canSubmit || Boolean(loadError)}
                    />
                  </FieldContent>
                  <FieldDescription>{t("A stable warehouse location for view metadata.")}</FieldDescription>
                  <FieldError>{locationError}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="table-catalog-view-properties">{t("Properties (optional)")}</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="table-catalog-view-properties"
                      name="properties"
                      value={properties}
                      onChange={(event) => {
                        setProperties(event.target.value)
                        setSaveError("")
                      }}
                      className="min-h-24 font-mono text-[0.7rem] leading-5"
                      spellCheck={false}
                      disabled={submitting || !canSubmit || Boolean(loadError)}
                    />
                  </FieldContent>
                  <FieldDescription>{t("Provide a flat JSON object. Values are stored as strings.")}</FieldDescription>
                </Field>
              </FieldGroup>
            )}
          </div>

          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading || submitting || !canSubmit || (editing && (!originalMetadata || Boolean(loadError)))}
            >
              {submitting ? <Spinner className="size-4" aria-hidden /> : null}
              {submitting ? (editing ? t("Saving…") : t("Creating…")) : editing ? t("Save changes") : t("Create view")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function viewUuidFromMetadata(metadata: Record<string, unknown>) {
  const value = metadata["view-uuid"]
  return typeof value === "string" ? value : ""
}
