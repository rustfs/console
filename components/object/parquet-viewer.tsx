"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { parquetMetadata, parquetReadObjects, parquetSchema } from "hyparquet"
import { compressors } from "hyparquet-compressors"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ParquetViewerProps {
  url: string
  sizeBytes?: number
}

const MAX_FETCH_BYTES = 1024 * 1024 * 50
const MAX_ROWS = 100

interface ParquetData {
  columns: string[]
  rows: Record<string, unknown>[]
  totalRows: number
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "bigint") return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value
    return `[${bytes.byteLength} bytes]`
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, (_key, val) => (typeof val === "bigint" ? val.toString() : val))
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function getTopLevelColumns(metadata: ReturnType<typeof parquetMetadata>): string[] {
  return parquetSchema(metadata).children.map((child) => child.element.name)
}

export function ParquetViewer({ url, sizeBytes }: ParquetViewerProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<ParquetData | null>(null)

  React.useEffect(() => {
    if (!url) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setData(null)

      if (typeof sizeBytes === "number" && sizeBytes > MAX_FETCH_BYTES) {
        setError(t("File is too large to preview, please download to view"))
        setLoading(false)
        return
      }

      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const buffer = await response.arrayBuffer()
        if (cancelled) return

        const metadata = parquetMetadata(buffer)
        const totalRows = Number(metadata.num_rows ?? 0)
        const rows = await parquetReadObjects({
          file: buffer,
          metadata,
          compressors,
          rowStart: 0,
          rowEnd: Math.min(totalRows, MAX_ROWS),
        })
        if (cancelled) return

        const columns = getTopLevelColumns(metadata)
        const resolvedColumns =
          columns.length > 0 ? columns : Array.from(new Set(rows.flatMap((row) => Object.keys(row))))

        setData({ columns: resolvedColumns, rows, totalRows })
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : t("Preview unavailable"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [url, sizeBytes, t])

  if (!url) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        {t("Preview unavailable")}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <div className="flex h-[60vh] items-center justify-center p-4 text-sm text-destructive">{error}</div>
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        {t("No data to display")}
      </div>
    )
  }

  const truncated = data.totalRows > data.rows.length

  return (
    <div className="flex w-full min-w-0 max-h-[70vh] flex-1 flex-col gap-2">
      <div className="min-h-0 w-full min-w-0 flex-1 overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead className="w-12 text-muted-foreground">#</TableHead>
              {data.columns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell className="text-muted-foreground tabular-nums">{rowIndex + 1}</TableCell>
                {data.columns.map((column) => {
                  const text = formatCell(row[column])
                  return (
                    <TableCell key={column} className="max-w-[320px] truncate font-mono" title={text}>
                      {text}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="shrink-0 text-xs text-muted-foreground">
        {truncated
          ? t("Showing first {shown} of {total} rows", { shown: data.rows.length, total: data.totalRows })
          : t("{shown} rows", { shown: data.rows.length })}
      </div>
    </div>
  )
}
