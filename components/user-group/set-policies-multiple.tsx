"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  const [policies, setPolicies] = React.useState<PolicyItem[]>([])
  const [checked, setChecked] = React.useState<string[]>([])

  const filteredPolicies = React.useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return policies
    return policies.filter((p) => p.name.toLowerCase().includes(keyword))
  }, [policies, searchTerm])

  const allVisibleSelected =
    filteredPolicies.length > 0 &&
    filteredPolicies.every((p) => checked.includes(p.name))

  const isSelected = (name: string) => checked.includes(name)

  const toggleSelection = (name: string, value: boolean) => {
    setChecked((prev) =>
      value ? (prev.includes(name) ? prev : [...prev, name]) : prev.filter((p) => p !== name)
    )
  }

  const toggleSelectAll = (value: boolean) => {
    const visibleNames = filteredPolicies.map((p) => p.name)
    if (!visibleNames.length) return
    setChecked((prev) =>
      value
        ? Array.from(new Set([...prev, ...visibleNames]))
        : prev.filter((n) => !visibleNames.includes(n))
    )
  }

  const columns: ColumnDef<PolicyItem>[] = React.useMemo(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={
              allVisibleSelected
                ? true
                : checked.length > 0 && !allVisibleSelected
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(v) => toggleSelectAll(v === true)}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <Checkbox
            checked={isSelected(row.original.name)}
            onCheckedChange={(v) =>
              toggleSelection(row.original.name, v === true)
            }
          />
        ),
        meta: { maxWidth: "3rem" },
      },
      {
        id: "name",
        header: () => t("Name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
        filterFn: (row, _columnId, filterValue) => {
          if (!filterValue) return true
          return row.original.name
            .toLowerCase()
            .includes(String(filterValue).toLowerCase())
        },
      },
    ],
    [t, allVisibleSelected, checked]
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
    if (open) {
      setChecked([])
      setSearchTerm("")
      listPolicies()
        .then((res: Record<string, unknown>) => {
          setPolicies(
            Object.entries(res ?? {}).map(([key, content]) => ({
              name: key,
              content,
            }))
          )
        })
        .catch(() => message.error(t("Failed to get data")))
    }
  }, [open, listPolicies, message, t])

  const changePolicies = async () => {
    if (!checked.length || !checkedKeys.length) return
    setSubmitting(true)
    try {
      await Promise.all(
        checkedKeys.map((item) =>
          setUserOrGroupPolicy({
            policyName: checked,
            userOrGroup: item,
            isGroup: true,
          })
        )
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("Batch allocation policies")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t("Search Policy")}
                clearable
                className="w-full"
              />
            </div>
            <Button
              variant="outline"
              disabled={!checkedKeys.length || submitting}
              onClick={changePolicies}
            >
              {t("Submit")}
            </Button>
          </div>
          <DataTable table={table} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
