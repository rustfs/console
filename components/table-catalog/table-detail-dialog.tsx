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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CopyButton } from "@/components/copy-button"
import { useTableCatalog, type LoadedTable, type TableIdentifier, type TableRefs } from "@/hooks/use-table-catalog"
import { displayNamespace } from "@/lib/table-catalog-paths"

interface TableDetailDialogProps {
  open: boolean
  bucket: string
  identifier: TableIdentifier | null
  canCommit?: boolean
  canDelete?: boolean
  onOpenChange: (open: boolean) => void
  onRequestCommit?: (identifier: TableIdentifier) => void
  onRequestDelete?: (identifier: TableIdentifier) => void
}

interface SchemaField {
  id?: number
  name?: string
  required?: boolean
  type?: unknown
  doc?: string
}

function metadataArray(value: unknown, key: string): Record<string, unknown>[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  const candidate = (value as Record<string, unknown>)[key]
  if (!Array.isArray(candidate)) return []
  return candidate.filter((item): item is Record<string, unknown> =>
    Boolean(item && typeof item === "object" && !Array.isArray(item)),
  )
}

function currentSchema(metadata: Record<string, unknown>): Record<string, unknown> | null {
  const schemas = metadataArray(metadata, "schemas")
  const currentId = metadata["current-schema-id"]
  const selected = schemas.find((schema) => schema["schema-id"] === currentId)
  return selected ?? schemas.at(-1) ?? null
}

function schemaFields(metadata: Record<string, unknown>): SchemaField[] {
  const schema = currentSchema(metadata)
  const fields = schema?.fields
  if (!Array.isArray(fields)) return []
  return fields.filter((field): field is SchemaField =>
    Boolean(field && typeof field === "object" && !Array.isArray(field)),
  )
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return "{}"
  }
}

function snapshotTimestamp(snapshot: Record<string, unknown>) {
  const value = snapshot["timestamp-ms"]
  return typeof value === "number" || typeof value === "string" ? value : undefined
}

function metadataValue(table: LoadedTable | null, key: string) {
  const value = table?.metadata[key]
  if (value === undefined || value === null || value === "") return "--"
  return typeof value === "string" ? value : String(value)
}

export function TableDetailDialog({
  open,
  bucket,
  identifier,
  canCommit = false,
  canDelete = false,
  onOpenChange,
  onRequestCommit,
  onRequestDelete,
}: TableDetailDialogProps) {
  const { t } = useTranslation()
  const { loadTable, getTableRefs } = useTableCatalog()
  const [table, setTable] = React.useState<LoadedTable | null>(null)
  const [refs, setRefs] = React.useState<TableRefs | null>(null)
  const [refsError, setRefsError] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const requestId = React.useRef(0)

  const loadDetails = React.useCallback(async () => {
    if (!identifier || !bucket) return
    const currentRequest = ++requestId.current
    setLoading(true)
    setError("")
    setRefsError("")
    try {
      const [tableResult, refsResult] = await Promise.allSettled([
        loadTable(bucket, identifier.namespace, identifier.name),
        getTableRefs(bucket, identifier.namespace, identifier.name),
      ])
      if (currentRequest !== requestId.current) return
      if (tableResult.status === "rejected") throw tableResult.reason
      setTable(tableResult.value)
      if (refsResult.status === "fulfilled") {
        setRefs(refsResult.value)
        setRefsError("")
      } else {
        setRefs(null)
        setRefsError(
          refsResult.reason instanceof Error && refsResult.reason.message
            ? refsResult.reason.message
            : t("Snapshot references are unavailable."),
        )
      }
    } catch (loadError) {
      if (currentRequest !== requestId.current) return
      setTable(null)
      setRefs(null)
      setRefsError("")
      setError(loadError instanceof Error && loadError.message ? loadError.message : t("Unable to load table details"))
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [bucket, getTableRefs, identifier, loadTable, t])

  React.useEffect(() => {
    if (open) void loadDetails()
    else requestId.current += 1
  }, [loadDetails, open])

  const title = identifier?.name ?? t("Table details")
  const namespaceLabel = identifier ? displayNamespace(identifier.namespace) : ""
  const fields = table ? schemaFields(table.metadata) : []
  const snapshots = table ? metadataArray(table.metadata, "snapshots") : []
  const currentSnapshotId = metadataValue(table, "current-snapshot-id")
  const warehouseLocation = table?.config["warehouse-location"] ?? metadataValue(table, "location")
  const credentialMode = table?.config["rustfs.credential-mode"]

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onOpenChange(false)
      }}
      disablePointerDismissal={loading}
    >
      <DialogContent
        className="max-h-[min(92dvh,56rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-4xl"
        aria-busy={loading}
      >
        <DialogHeader className="border-b px-4 py-4 pe-12 text-start sm:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <DialogTitle className="min-w-0 truncate font-mono text-base">{title}</DialogTitle>
            <Badge variant="outline">ICEBERG</Badge>
          </div>
          <DialogDescription className="break-all font-mono">
            {bucket} / {namespaceLabel}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
            <Spinner className="size-5" aria-hidden />
            {t("Loading table details…")}
          </div>
        ) : error ? (
          <div className="space-y-4 p-4" role="alert">
            <div className="border border-destructive/50 bg-destructive/10 p-4">
              <div className="flex items-start gap-2">
                <RiAlertLine className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium text-destructive">{t("Unable to load table details")}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => void loadDetails()}>
              <RiRefreshLine className="size-4" aria-hidden />
              {t("Retry")}
            </Button>
          </div>
        ) : table ? (
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <Tabs defaultValue="overview" className="flex min-h-full flex-col gap-0">
              <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b px-4 pt-2 sm:px-6">
                <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
                <TabsTrigger value="schema">{t("Schema")}</TabsTrigger>
                <TabsTrigger value="snapshots">{t("Snapshots")}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 p-4 sm:px-6">
                <section aria-labelledby="table-detail-metadata-heading" className="space-y-3">
                  <h3 id="table-detail-metadata-heading" className="text-sm font-semibold">
                    {t("Table metadata")}
                  </h3>
                  <dl className="divide-y border-y">
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("Format version")}</dt>
                      <dd className="font-mono">{metadataValue(table, "format-version")}</dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("Table UUID")}</dt>
                      <dd className="break-all font-mono">{metadataValue(table, "table-uuid")}</dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("Current snapshot")}</dt>
                      <dd className="font-mono">{currentSnapshotId}</dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("Warehouse location")}</dt>
                      <dd className="flex min-w-0 items-start gap-1 font-mono">
                        <span className="min-w-0 break-all">{warehouseLocation || "--"}</span>
                        {warehouseLocation && warehouseLocation !== "--" ? (
                          <CopyButton value={warehouseLocation} iconOnly />
                        ) : null}
                      </dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("Metadata location")}</dt>
                      <dd className="flex min-w-0 items-start gap-1 font-mono">
                        <span className="min-w-0 break-all">{table.metadataLocation || "--"}</span>
                        {table.metadataLocation ? <CopyButton value={table.metadataLocation} iconOnly /> : null}
                      </dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                      <dt className="text-muted-foreground">{t("Credentials")}</dt>
                      <dd className="flex flex-wrap items-center gap-2">
                        <Badge variant={credentialMode?.includes("client-provided") ? "outline" : "secondary"}>
                          {credentialMode || t("Unknown")}
                        </Badge>
                        {table.storageCredentials.length > 0 ? (
                          <span className="text-muted-foreground">{t("Scoped credentials available")}</span>
                        ) : null}
                      </dd>
                    </div>
                  </dl>
                </section>

                {refsError ? (
                  <div className="border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="status">
                    <p className="font-medium">{t("Snapshot references are unavailable.")}</p>
                    <p className="mt-1 break-words text-muted-foreground">{refsError}</p>
                  </div>
                ) : null}

                {refs ? (
                  <section aria-labelledby="table-detail-refs-heading" className="space-y-3">
                    <h3 id="table-detail-refs-heading" className="text-sm font-semibold">
                      {t("Snapshot references")}
                    </h3>
                    <div className="grid grid-cols-2 divide-x border-y sm:grid-cols-3">
                      <div className="space-y-1 p-3">
                        <p className="text-xs text-muted-foreground">{t("References")}</p>
                        <p className="font-mono text-sm">{Object.keys(refs.refs).length}</p>
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="text-xs text-muted-foreground">{t("Protected")}</p>
                        <p className="font-mono text-sm">{refs.protectedRefCount}</p>
                      </div>
                      <div className="col-span-2 space-y-1 border-t p-3 sm:col-span-1 sm:border-t-0">
                        <p className="text-xs text-muted-foreground">{t("User-defined")}</p>
                        <p className="font-mono text-sm">{refs.userDefinedRefCount}</p>
                      </div>
                    </div>
                  </section>
                ) : null}
              </TabsContent>

              <TabsContent value="schema" className="space-y-4 p-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{t("Schema fields")}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("Current schema")}: {metadataValue(table, "current-schema-id")}
                    </p>
                  </div>
                  <Badge variant="outline">{fields.length}</Badge>
                </div>
                <div className="border">
                  <Table>
                    <caption className="sr-only">{t("Schema fields")}</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("ID")}</TableHead>
                        <TableHead>{t("Name")}</TableHead>
                        <TableHead>{t("Type")}</TableHead>
                        <TableHead>{t("Required")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.length ? (
                        fields.map((field, index) => (
                          <TableRow key={`${field.name ?? "field"}-${index}`}>
                            <TableCell className="font-mono">{field.id ?? "--"}</TableCell>
                            <TableCell className="font-mono">{field.name ?? "--"}</TableCell>
                            <TableCell className="max-w-48 whitespace-normal break-words font-mono">
                              {typeof field.type === "string" ? field.type : formatJson(field.type)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={field.required ? "secondary" : "outline"}>
                                {field.required ? t("Yes") : t("No")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <EmptyState
                              title={t("No schema fields")}
                              description={t("This table has no fields in its current schema.")}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="snapshots" className="space-y-4 p-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{t("Snapshots")}</h3>
                    <p className="text-sm text-muted-foreground">{t("Committed table snapshots from metadata.")}</p>
                  </div>
                  <Badge variant="outline">{snapshots.length}</Badge>
                </div>
                {snapshots.length ? (
                  <div className="divide-y border-y">
                    {snapshots.map((snapshot, index) => {
                      const snapshotId = snapshot["snapshot-id"]
                      const isCurrent = String(snapshotId) === currentSnapshotId
                      return (
                        <div
                          key={`${String(snapshotId)}-${index}`}
                          className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm">{String(snapshotId ?? "--")}</span>
                              {isCurrent ? <Badge variant="secondary">{t("Current")}</Badge> : null}
                            </div>
                            <p className="mt-1 break-all text-xs text-muted-foreground">
                              {String(snapshot["manifest-list"] ?? snapshot["manifest-list-location"] ?? "--")}
                            </p>
                          </div>
                          <time
                            className="text-xs text-muted-foreground"
                            dateTime={String(snapshotTimestamp(snapshot) ?? "")}
                          >
                            {snapshotTimestamp(snapshot)
                              ? new Date(Number(snapshotTimestamp(snapshot))).toLocaleString()
                              : "--"}
                          </time>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState
                    title={t("No snapshots")}
                    description={t("This table has not committed a snapshot yet.")}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : null}

        {table && !loading ? (
          <DialogFooter className="border-t bg-muted/20 px-4 py-3 sm:px-6">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => identifier && onRequestCommit?.(identifier)}
              disabled={!identifier || !canCommit}
              title={!canCommit ? t("You do not have permission to commit table metadata.") : undefined}
            >
              <RiEditLine className="size-4" aria-hidden />
              {t("Commit table")}
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => identifier && onRequestDelete?.(identifier)}
              disabled={!identifier || !canDelete}
              title={!canDelete ? t("You do not have permission to delete tables.") : undefined}
            >
              <RiDeleteBin5Line className="size-4" aria-hidden />
              {t("Drop table")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
