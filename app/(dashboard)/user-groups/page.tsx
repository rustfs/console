"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiDeleteBin5Line, RiEdit2Line, RiGroup2Fill } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/search-input"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { UserGroupNewForm } from "@/components/user-group/new-form"
import { UserGroupEditForm } from "@/components/user-group/edit-form"
import { UserGroupSetPoliciesMultiple } from "@/components/user-group/set-policies-multiple"
import { useGroups } from "@/hooks/use-groups"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import type { ColumnDef } from "@tanstack/react-table"

interface GroupRow {
  name: string
}

export default function UserGroupsPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { listGroup, getGroup, removeGroup } = useGroups()

  const [data, setData] = useState<GroupRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [newFormOpen, setNewFormOpen] = useState(false)
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [editRow, setEditRow] = useState<GroupRow | null>(null)
  const [policiesDialogOpen, setPoliciesDialogOpen] = useState(false)

  const getDataList = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = (await listGroup()) as string[] | undefined
      setData(
        (res ?? []).map((name) => ({
          name,
        })),
      )
    } catch {
      message.error(t("Failed to get data"))
    } finally {
      setLoading(false)
    }
  }, [listGroup, message, t])

  useEffect(() => {
    getDataList()
  }, [getDataList])

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter((row) => row.name.toLowerCase().includes(term))
  }, [data, searchTerm])

  const openEditItem = React.useCallback((row: GroupRow) => {
    setEditRow(row)
    setEditFormOpen(true)
  }, [])

  const deleteItem = React.useCallback(
    async (row: GroupRow) => {
      try {
        const info = (await getGroup(row.name)) as { members?: string[] }
        if (info?.members?.length) {
          message.error(t("Please remove members first"))
          return
        }
        await removeGroup(row.name)
        message.success(t("Delete Success"))
        await getDataList()
      } catch {
        message.error(t("Delete Failed"))
      }
    },
    [getGroup, removeGroup, message, t, getDataList],
  )

  const confirmDelete = React.useCallback(
    (row: GroupRow) => {
      dialog.error({
        title: t("Confirm Delete"),
        content: "",
        positiveText: t("Delete"),
        negativeText: t("Cancel"),
        onPositiveClick: () => deleteItem(row),
      })
    },
    [dialog, t, deleteItem],
  )

  const columns: ColumnDef<GroupRow>[] = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: () => t("Name"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        filterFn: "includesString",
      },
      {
        id: "actions",
        header: () => t("Actions"),
        enableSorting: false,
        enableHiding: false,
        meta: { width: 200 },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => openEditItem(row.original)}>
              <RiEdit2Line className="size-4" />
              <span>{t("Edit")}</span>
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => confirmDelete(row.original)}>
              <RiDeleteBin5Line className="size-4" />
              <span>{t("Delete")}</span>
            </Button>
          </div>
        ),
      },
    ],
    [t, openEditItem, confirmDelete],
  )

  const { table, selectedRowIds } = useDataTable<GroupRow>({
    data: filteredData,
    columns,
    getRowId: (row) => row.name,
    enableRowSelection: true,
  })

  const selectedKeys = Array.from(selectedRowIds)

  React.useEffect(() => {
    table.resetRowSelection()
  }, [data, table])

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t("Search User Group")}
              clearable
              className="max-w-md"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!selectedKeys.length}
              onClick={() => setPoliciesDialogOpen(true)}
            >
              <RiGroup2Fill className="size-4" />
              {t("Assign Policy")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setNewFormOpen(true)}>
              <RiAddLine className="size-4" />
              {t("Add User Group")}
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("User Groups")}</h1>
      </PageHeader>

      <div className="space-y-4">
        <DataTable
          table={table}
          isLoading={loading}
          emptyTitle={t("No Data")}
          emptyDescription={t("Create user groups to organize permissions")}
          tableClass="min-w-full"
        />
        <DataTablePagination table={table} />

        <UserGroupNewForm open={newFormOpen} onOpenChange={setNewFormOpen} onSuccess={getDataList} />
        <UserGroupEditForm open={editFormOpen} onOpenChange={setEditFormOpen} row={editRow} onSuccess={getDataList} />
        <UserGroupSetPoliciesMultiple
          checkedKeys={selectedKeys}
          open={policiesDialogOpen}
          onOpenChange={setPoliciesDialogOpen}
          onChangePoliciesSuccess={getDataList}
        />
      </div>
    </Page>
  )
}
