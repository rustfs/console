"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAlertLine, RiDeleteBin5Line, RiEditLine, RiRefreshLine } from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/empty-state"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CopyButton } from "@/components/copy-button"
import { useTableCatalog, type LoadedView, type ViewIdentifier } from "@/hooks/use-table-catalog"
import { displayNamespace } from "@/lib/table-catalog-paths"

interface ViewDetailDialogProps {
  open: boolean
  bucket: string
  catalogPrefix?: string
  identifier: ViewIdentifier | null
  canReplace?: boolean
  canDelete?: boolean
  onOpenChange: (open: boolean) => void
  onRequestEdit?: (identifier: ViewIdentifier) => void
  onRequestDelete?: (identifier: ViewIdentifier) => void
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

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return "{}"
  }
}

function stringValue(value: unknown, fallback = "--") {
  if (typeof value === "string" && value) return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return fallback
}

function currentVersion(metadata: Record<string, unknown>) {
  const versions = metadataArray(metadata, "versions")
  const currentId = metadata["current-version-id"]
  return versions.find((version) => version["version-id"] === currentId) ?? versions.at(-1) ?? null
}

function currentSchema(metadata: Record<string, unknown>, version: Record<string, unknown> | null) {
  const schemas = metadataArray(metadata, "schemas")
  const schemaId = version?.["schema-id"]
  return schemas.find((schema) => schema["schema-id"] === schemaId) ?? schemas.at(-1) ?? {}
}

function versionRepresentations(version: Record<string, unknown> | null) {
  const representations = version?.representations
  return Array.isArray(representations)
    ? representations.filter((item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object" && !Array.isArray(item)),
      )
    : []
}

export function ViewDetailDialog({
  open,
  bucket,
  catalogPrefix,
  identifier,
  canReplace = false,
  canDelete = false,
  onOpenChange,
  onRequestEdit,
  onRequestDelete,
}: ViewDetailDialogProps) {
  const { t } = useTranslation()
  const { loadView } = useTableCatalog(catalogPrefix)
  const [view, setView] = React.useState<LoadedView | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const requestId = React.useRef(0)

  const loadDetails = React.useCallback(async () => {
    if (!open || !bucket || !identifier) return
    const currentRequest = ++requestId.current
    setLoading(true)
    setError("")
    try {
      const result = await loadView(bucket, identifier.namespace, identifier.name)
      if (currentRequest !== requestId.current) return
      setView(result)
    } catch (loadError) {
      if (currentRequest !== requestId.current) return
      setView(null)
      setError(loadError instanceof Error && loadError.message ? loadError.message : t("Unable to load view"))
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [bucket, identifier, loadView, open, t])

  React.useEffect(() => {
    if (open) void loadDetails()
    else requestId.current += 1
  }, [loadDetails, open])

  const metadata = view?.metadata ?? {}
  const versions = metadataArray(metadata, "versions")
  const activeVersion = currentVersion(metadata)
  const representations = versionRepresentations(activeVersion)
  const title = identifier?.name ?? t("View details")
  const namespaceLabel = identifier ? displayNamespace(identifier.namespace) : ""
  const location = stringValue(metadata.location)
  const uuid = stringValue(metadata["view-uuid"])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onOpenChange(false)
      }}
      disablePointerDismissal={loading}
    >
      <DialogContent
        className="max-h-[min(92dvh,54rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl"
        aria-busy={loading}
      >
        <DialogHeader className="border-b px-4 py-4 pe-12 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <DialogTitle className="min-w-0 truncate font-mono text-base">{title}</DialogTitle>
            <Badge variant="outline">VIEW</Badge>
          </div>
          <DialogDescription className="break-all font-mono">
            {bucket} / {namespaceLabel}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <Spinner className="size-5" aria-hidden />
            {t("Loading view details…")}
          </div>
        ) : error ? (
          <div className="space-y-4 p-4" role="alert">
            <div className="border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-2">
                <RiAlertLine className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium text-destructive">{t("Unable to load view")}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => void loadDetails()}>
              <RiRefreshLine className="size-4" aria-hidden />
              {t("Retry")}
            </Button>
          </div>
        ) : view ? (
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <Tabs defaultValue="overview" className="flex min-h-full flex-col gap-0">
              <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b px-4 pt-2 sm:px-6">
                <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
                <TabsTrigger value="versions">{t("View versions")}</TabsTrigger>
                <TabsTrigger value="schema">{t("Schema")}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-5 p-4 sm:px-6">
                <section aria-labelledby="view-detail-metadata-heading" className="space-y-3">
                  <h3 id="view-detail-metadata-heading" className="text-sm font-semibold">
                    {t("View metadata")}
                  </h3>
                  <dl className="divide-y border-y">
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("Format version")}</dt>
                      <dd className="font-mono">{stringValue(metadata["format-version"])}</dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("View UUID")}</dt>
                      <dd className="flex min-w-0 items-start gap-1 font-mono">
                        <span className="min-w-0 break-all">{uuid}</span>
                        {uuid !== "--" ? <CopyButton value={uuid} iconOnly /> : null}
                      </dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("Current view version")}</dt>
                      <dd className="font-mono">{stringValue(metadata["current-version-id"])}</dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("Metadata location")}</dt>
                      <dd className="flex min-w-0 items-start gap-1 font-mono">
                        <span className="min-w-0 break-all">{view.metadataLocation || "--"}</span>
                        {view.metadataLocation ? <CopyButton value={view.metadataLocation} iconOnly /> : null}
                      </dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("Location")}</dt>
                      <dd className="break-all font-mono">{location}</dd>
                    </div>
                  </dl>
                </section>

                <section aria-labelledby="view-detail-sql-heading" className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 id="view-detail-sql-heading" className="text-sm font-semibold">
                      {t("SQL representations")}
                    </h3>
                    <Badge variant="outline">{representations.length}</Badge>
                  </div>
                  {representations.length ? (
                    <div className="divide-y border-y">
                      {representations.map((representation, index) => (
                        <div key={`${String(representation.dialect)}-${index}`} className="space-y-2 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{stringValue(representation.dialect)}</Badge>
                            <span className="text-xs text-muted-foreground">{stringValue(representation.type)}</span>
                          </div>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words border bg-muted/30 p-3 font-mono text-[0.7rem] leading-5">
                            {stringValue(representation.sql)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title={t("No SQL representations")}
                      description={t("This view has no SQL definition.")}
                    />
                  )}
                </section>
              </TabsContent>

              <TabsContent value="versions" className="space-y-4 p-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{t("View versions")}</h3>
                    <p className="text-sm text-muted-foreground">{t("Version history stored in view metadata.")}</p>
                  </div>
                  <Badge variant="outline">{versions.length}</Badge>
                </div>
                {versions.length ? (
                  <div className="divide-y border-y">
                    {versions.map((version, index) => {
                      const versionId = version["version-id"]
                      const current = String(versionId) === String(metadata["current-version-id"])
                      return (
                        <div
                          key={`${String(versionId)}-${index}`}
                          className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm">{String(versionId ?? "--")}</span>
                              {current ? <Badge variant="secondary">{t("Current")}</Badge> : null}
                            </div>
                            <p className="mt-1 break-all text-xs text-muted-foreground">
                              {versionRepresentations(version)
                                .map(
                                  (representation) =>
                                    `${stringValue(representation.dialect)}: ${stringValue(representation.sql)}`,
                                )
                                .join(" · ") || "--"}
                            </p>
                          </div>
                          <time className="text-xs text-muted-foreground">
                            {typeof version["timestamp-ms"] === "number"
                              ? new Date(version["timestamp-ms"] as number).toLocaleString()
                              : "--"}
                          </time>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState title={t("No view versions")} description={t("This view has no version history.")} />
                )}
              </TabsContent>

              <TabsContent value="schema" className="space-y-3 p-4 sm:px-6">
                <h3 className="text-sm font-semibold">{t("View schema")}</h3>
                <pre className="max-h-[32rem] overflow-auto border bg-muted/30 p-3 font-mono text-[0.7rem] leading-5 whitespace-pre-wrap break-words">
                  {formatJson(currentSchema(metadata, activeVersion))}
                </pre>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}

        {view && !loading ? (
          <DialogFooter className="border-t bg-muted/20 px-4 py-3 sm:px-6">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => identifier && onRequestEdit?.(identifier)}
              disabled={!identifier || !canReplace}
              title={!canReplace ? t("You do not have permission to update views.") : undefined}
            >
              <RiEditLine className="size-4" aria-hidden />
              {t("Edit view")}
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => identifier && onRequestDelete?.(identifier)}
              disabled={!identifier || !canDelete}
              title={!canDelete ? t("You do not have permission to delete views.") : undefined}
            >
              <RiDeleteBin5Line className="size-4" aria-hidden />
              {t("Drop view")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
