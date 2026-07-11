"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { SearchInput } from "@/components/search-input"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { usePolicies } from "@/hooks/use-policies"
import { useMessage } from "@/lib/feedback/message"
import type { ColumnDef } from "@tanstack/react-table"

interface PolicyItem {
  name: string
  content: unknown
}

interface UserGroupSetPoliciesMultipleProps {
  checkedKeys: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onChangePoliciesSuccess: () => void
}

export function UserGroupSetPoliciesMultiple({
  checkedKeys,
  open,
  onOpenChange,
  onChangePoliciesSuccess,
}: UserGroupSetPoliciesMultipleProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { listPolicies, setUserOrGroupPolicy } = usePolicies()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [loadVersion, setLoadVersion] = React.useState(0)
  const [policies, setPolicies] = React.useState<PolicyItem[]>([])
  const [checked, setChecked] = React.useState<string[]>([])

  const filteredPolicies = React.useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return policies
    return policies.filter((p) => p.name.toLowerCase().includes(keyword))
  }, [policies, searchTerm])

  const allVisibleSelected = filteredPolicies.length > 0 && filteredPolicies.every((p) => checked.includes(p.name))

  const isSelected = React.useCallback((name: string) => checked.includes(name), [checked])

  const toggleSelection = React.useCallback((name: string, value: boolean) => {
    setChecked((prev) => (value ? (prev.includes(name) ? prev : [...prev, name]) : prev.filter((p) => p !== name)))
  }, [])

  const toggleSelectAll = React.useCallback(
    (value: boolean) => {
      const visibleNames = filteredPolicies.map((p) => p.name)
      if (!visibleNames.length) return
      setChecked((prev) =>
        value ? Array.from(new Set([...prev, ...visibleNames])) : prev.filter((n) => !visibleNames.includes(n)),
      )
    },
    [filteredPolicies],
  )

  const columns: ColumnDef<PolicyItem>[] = React.useMemo(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            aria-label={`${t("Select")} ${t("Policies")}`}
            checked={allVisibleSelected}
            indeterminate={!allVisibleSelected && checked.length > 0}
            onCheckedChange={(v) => toggleSelectAll(v === true)}
            disabled={loading || submitting}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <Checkbox
            aria-label={`${t("Select")} ${row.original.name}`}
            checked={isSelected(row.original.name)}
            onCheckedChange={(v) => toggleSelection(row.original.name, v === true)}
            disabled={loading || submitting}
          />
        ),
        meta: { maxWidth: "3rem" },
      },
      {
        id: "name",
        header: () => t("Name"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true
          return row.original.name.toLowerCase().includes(String(filterValue).toLowerCase())
        },
      },
    ],
    [t, allVisibleSelected, checked, isSelected, loading, submitting, toggleSelectAll, toggleSelection],
  )

  const { table } = useDataTable<PolicyItem>({
    data: filteredPolicies,
    columns,
    getRowId: (row) => row.name,
  })

  React.useEffect(() => {
    const col = table.getColumn("name")
    if (col) col.setFilterValue(searchTerm || undefined)
  }, [searchTerm, table])

  React.useEffect(() => {
    if (!open) return

    setChecked([])
    setSearchTerm("")
  }, [open])

  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    setPolicies([])
    setLoadError("")
    setLoading(true)
    listPolicies()
      .then((res: Record<string, unknown>) => {
        if (cancelled) return
        setPolicies(
          Object.entries(res ?? {}).map(([key, content]) => ({
            name: key,
            content,
          })),
        )
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError((error as Error)?.message || t("Failed to get data"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [listPolicies, loadVersion, open, t])

  const changePolicies = async () => {
    if (!checked.length || !checkedKeys.length || loading || loadError || submitting) return
    setSubmitting(true)
    try {
      await Promise.all(
        checkedKeys.map((item) =>
          setUserOrGroupPolicy({
            policyName: checked,
            userOrGroup: item,
            isGroup: true,
          }),
        ),
      )
      message.success(t("Edit Success"))
      onOpenChange(false)
      onChangePoliciesSuccess()
    } catch {
      message.error(t("Edit Failed"))
    } finally {
      setSubmitting(false)
    }
  }

  const closeModal = () => onOpenChange(false)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!submitting || nextOpen) onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogContent
        className="max-h-[min(90dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-xl"
        aria-busy={loading || submitting}
      >
        <DialogHeader className="border-b px-4 py-3 pe-12">
          <DialogTitle>{t("Batch allocation policies")}</DialogTitle>
        </DialogHeader>

        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault()
            void changePolicies()
          }}
        >
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain p-4">
            <div className="w-full sm:max-w-xs">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t("Search Policy")}
                clearable
                className="w-full"
                disabled={loading || submitting}
              />
            </div>

            {loadError ? (
              <div
                className="flex min-h-48 flex-col items-center justify-center gap-3 border border-dashed p-6 text-center"
                role="alert"
              >
                <p className="max-w-md text-sm text-destructive">{loadError}</p>
                <Button type="button" variant="outline" onClick={() => setLoadVersion((current) => current + 1)}>
                  <RiRefreshLine className="size-4" aria-hidden />
                  {t("Refresh")}
                </Button>
              </div>
            ) : (
              <DataTable table={table} isLoading={loading} />
            )}
          </div>

          <DialogFooter className="border-t bg-muted/20 px-4 py-3">
            <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!checked.length || !checkedKeys.length || loading || Boolean(loadError) || submitting}
            >
              {submitting ? <Spinner className="size-4" /> : null}
              {t("Submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
