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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  useTableCatalog,
  type CommitTableResponse,
  type LoadedTable,
  type TableIdentifier,
} from "@/hooks/use-table-catalog"
import { useMessage } from "@/lib/feedback/message"
import { displayNamespace } from "@/lib/table-catalog-paths"

interface TableCommitDialogProps {
  open: boolean
  bucket: string
  identifier: TableIdentifier | null
  canCommit: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (response: CommitTableResponse) => void
}

const DEFAULT_UPDATES = `[
  {
    "action": "set-properties",
    "updates": {
      "write.format.default": "parquet"
    }
  }
]`

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return "[]"
  }
}

function parseObjectArray(value: string, label: string): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error(`${label} must be a JSON array of objects`)
  }
  return parsed as Record<string, unknown>[]
}

function newCommitId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `console-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function TableCommitDialog({
  open,
  bucket,
  identifier,
  canCommit,
  onOpenChange,
  onSuccess,
}: TableCommitDialogProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { loadTable, commitTable } = useTableCatalog()
  const [table, setTable] = React.useState<LoadedTable | null>(null)
  const [updates, setUpdates] = React.useState(DEFAULT_UPDATES)
  const [requirements, setRequirements] = React.useState("[]")
  const [loading, setLoading] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [formError, setFormError] = React.useState("")
  const requestId = React.useRef(0)
  const commitIdRef = React.useRef<string | null>(null)

  const reset = React.useCallback(() => {
    setTable(null)
    setUpdates(DEFAULT_UPDATES)
    setRequirements("[]")
    setLoading(false)
    setSubmitting(false)
    setLoadError("")
    setFormError("")
    commitIdRef.current = null
  }, [])

  const loadCurrentTable = React.useCallback(async () => {
    if (!open || !bucket || !identifier) return
    const currentRequest = ++requestId.current
    setLoading(true)
    setLoadError("")
    setFormError("")
    try {
      const result = await loadTable(bucket, identifier.namespace, identifier.name)
      if (currentRequest !== requestId.current) return
      setTable(result)
      const tableUuid = typeof result.metadata["table-uuid"] === "string" ? result.metadata["table-uuid"] : ""
      setRequirements(tableUuid ? formatJson([{ type: "assert-table-uuid", uuid: tableUuid }]) : "[]")
    } catch (error) {
      if (currentRequest !== requestId.current) return
      setTable(null)
      setLoadError(error instanceof Error && error.message ? error.message : t("Unable to load table details"))
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [bucket, identifier, loadTable, open, t])

  React.useEffect(() => {
    if (open) {
      reset()
      void loadCurrentTable()
    } else {
      requestId.current += 1
    }
  }, [loadCurrentTable, open, reset])

  const handleSubmit = async () => {
    if (!identifier || !table || submitting || !canCommit) return

    let parsedUpdates: Record<string, unknown>[]
    let parsedRequirements: Record<string, unknown>[]
    try {
      parsedUpdates = parseObjectArray(updates, t("Updates"))
      parsedRequirements = requirements.trim() ? parseObjectArray(requirements, t("Requirements")) : []
      if (!parsedUpdates.length) throw new Error(t("At least one update is required."))
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("Commit JSON is invalid."))
      return
    }

    setSubmitting(true)
    setFormError("")
    // Keep the same identifiers across a retry. The server can replay a
    // completed standard commit instead of publishing a second metadata file
    // when the first response was lost in transit.
    const commitId = commitIdRef.current ?? newCommitId()
    commitIdRef.current = commitId
    try {
      const response = await commitTable(bucket, identifier.namespace, identifier.name, {
        identifier,
        commitId,
        idempotencyKey: commitId,
        operation: "console-commit",
        expectedMetadataLocation: table.metadataLocation || undefined,
        requirements: parsedRequirements,
        updates: parsedUpdates,
        writer: "rustfs-console",
      })
      message.success(t("Table commit succeeded"))
      onSuccess?.(response)
      onOpenChange(false)
    } catch (error) {
      const text = error instanceof Error && error.message ? error.message : t("Unable to commit table")
      setFormError(text)
      message.error(text)
    } finally {
      setSubmitting(false)
    }
  }

  const title = identifier?.name ?? t("Commit table")
  const namespaceLabel = identifier ? displayNamespace(identifier.namespace) : ""

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submitting) onOpenChange(nextOpen)
      }}
      disablePointerDismissal={submitting}
    >
      <DialogContent
        className="max-h-[min(92dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        aria-busy={loading || submitting}
      >
        <DialogHeader className="border-b px-4 py-4 pe-12 sm:px-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="break-all font-mono">
            {bucket} / {namespaceLabel}
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
                {t("Loading table details…")}
              </div>
            ) : loadError ? (
              <div className="space-y-3" role="alert">
                <Alert variant="destructive">
                  <AlertTitle>{t("Unable to load table details")}</AlertTitle>
                  <AlertDescription>{loadError}</AlertDescription>
                </Alert>
                <Button variant="outline" type="button" onClick={() => void loadCurrentTable()}>
                  {t("Retry")}
                </Button>
              </div>
            ) : table ? (
              <FieldGroup>
                {formError ? (
                  <Alert variant="destructive">
                    <AlertTitle>{t("Table commit failed")}</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                ) : null}

                {!canCommit ? (
                  <Alert>
                    <AlertTitle>{t("Permission required")}</AlertTitle>
                    <AlertDescription>{t("You do not have permission to commit table metadata.")}</AlertDescription>
                  </Alert>
                ) : null}

                <dl className="divide-y border-y text-xs">
                  <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                    <dt className="text-muted-foreground">{t("Metadata location")}</dt>
                    <dd className="break-all font-mono">{table.metadataLocation || "--"}</dd>
                  </div>
                  <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                    <dt className="text-muted-foreground">{t("Table UUID")}</dt>
                    <dd className="break-all font-mono">{String(table.metadata["table-uuid"] ?? "--")}</dd>
                  </div>
                </dl>

                <Field data-invalid={Boolean(formError)}>
                  <FieldLabel htmlFor="table-catalog-commit-updates">{t("Updates")}</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="table-catalog-commit-updates"
                      name="updates"
                      value={updates}
                      onChange={(event) => {
                        setUpdates(event.target.value)
                        setFormError("")
                      }}
                      className="min-h-56 font-mono text-[0.7rem] leading-5"
                      spellCheck={false}
                      aria-describedby="table-catalog-commit-updates-help"
                      aria-invalid={Boolean(formError)}
                      disabled={!canCommit || submitting}
                    />
                  </FieldContent>
                  <FieldDescription id="table-catalog-commit-updates-help">
                    {t("Provide a JSON array of standard Iceberg table updates.")}
                  </FieldDescription>
                  <FieldError>{formError && updates.trim() ? formError : null}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="table-catalog-commit-requirements">{t("Requirements (optional)")}</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="table-catalog-commit-requirements"
                      name="requirements"
                      value={requirements}
                      onChange={(event) => {
                        setRequirements(event.target.value)
                        setFormError("")
                      }}
                      className="min-h-24 font-mono text-[0.7rem] leading-5"
                      spellCheck={false}
                      aria-describedby="table-catalog-commit-requirements-help"
                      disabled={!canCommit || submitting}
                    />
                  </FieldContent>
                  <FieldDescription id="table-catalog-commit-requirements-help">
                    {t("The table UUID assertion is prefilled to prevent committing to another table.")}
                  </FieldDescription>
                </Field>
              </FieldGroup>
            ) : null}
          </div>

          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={loading || submitting || !table || !canCommit}>
              {submitting ? <Spinner className="size-4" aria-hidden /> : null}
              {submitting ? t("Committing…") : t("Commit table")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
