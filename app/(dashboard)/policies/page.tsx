"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiDeleteBin5Line, RiEdit2Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/search-input"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { PolicyForm, type PolicyItem } from "@/components/policies/form"
import { usePolicies } from "@/hooks/use-policies"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import type { ColumnDef } from "@tanstack/react-table"

export default function PoliciesPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { listPolicies: fetchPolicies, removePolicy } = usePolicies()

  const [data, setData] = useState<PolicyItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showPolicyForm, setShowPolicyForm] = useState(false)
  const [currentPolicy, setCurrentPolicy] = useState<PolicyItem | null>(null)

  const listPolicies = async () => {
    setLoading(true)
    try {
      const res = (await fetchPolicies()) as Record<string, unknown>
      const policies: PolicyItem[] = Object.keys(res ?? {})
        .sort((a, b) => a.localeCompare(b))
        .map((key) => ({
          name: key,
          content: res[key] as string | object,
        }))
      setData(policies)
    } catch (error) {
      console.error(error)
      message.error(t("Failed to fetch data"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    listPolicies()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter((row) => row.name.toLowerCase().includes(term))
  }, [data, searchTerm])

  const handleEdit = (row: PolicyItem) => {
    setCurrentPolicy({ ...row })
    setShowPolicyForm(true)
  }

  const confirmDelete = (row: PolicyItem) => {
    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to delete this policy?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: () => deleteItem(row),
    })
  }

  const columns: ColumnDef<PolicyItem>[] = [
    {
      accessorKey: "name",
      header: () => t("Name"),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: "actions",
      header: () => t("Actions"),
      enableSorting: false,
      enableHiding: false,
      meta: { width: 200 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            <RiEdit2Line className="size-4" />
            <span>{t("Edit")}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => confirmDelete(row.original)}
          >
            <RiDeleteBin5Line className="size-4" />
            <span>{t("Delete")}</span>
          </Button>
        </div>
      ),
    },
  ]

  const { table } = useDataTable<PolicyItem>({
    data: filteredData,
    columns,
    getRowId: (row) => row.name,
  })

  const handleNew = () => {
    setCurrentPolicy({ name: "", content: "{}" })
    setShowPolicyForm(true)
  }

  const handleShowChange = (show: boolean) => {
    setShowPolicyForm(show)
    if (!show) setCurrentPolicy(null)
  }

  const deleteItem = async (row: PolicyItem) => {
    try {
      await removePolicy(row.name)
      message.success(t("Delete Success"))
      await listPolicies()
    } catch (error) {
      console.error(error)
      message.error(t("Delete Failed"))
    }
  }

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t("Search")}
              clearable
              className="max-w-sm"
            />
            <Button variant="outline" onClick={handleNew}>
              <RiAddLine className="size-4" />
              <span>{t("New Policy")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("IAM Policies")}</h1>
      </PageHeader>

      <div className="space-y-3">
        <DataTable
          table={table}
          isLoading={loading}
          emptyTitle={t("No Policies")}
          emptyDescription={t("Create a policy to manage access control templates.")}
        />
        <DataTablePagination table={table} className="px-2 py-3" />
      </div>

      <PolicyForm
        show={showPolicyForm}
        onShowChange={handleShowChange}
        policy={currentPolicy}
        onSaved={listPolicies}
      />
    </Page>
  )
}
