"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import dayjs from "dayjs"
import { RiAddLine, RiDeleteBin5Line, RiEdit2Line, RiGroup2Fill } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/search-input"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { UserNewForm } from "@/components/user/new-form"
import { UserEditForm } from "@/components/user/edit-form"
import { useUsers } from "@/hooks/use-users"
import { useDialog } from "@/lib/feedback/dialog"
import { useMessage } from "@/lib/feedback/message"
import type { ColumnDef } from "@tanstack/react-table"

interface UserRow {
  accessKey: string
  policyName?: string
  status: string
  memberOf?: string[]
  updatedAt?: string
  [key: string]: unknown
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-"
  let d = dayjs(dateStr)
  if (d.isValid()) return d.format("YYYY-MM-DD HH:mm:ss")
  const [date, timeRaw, offsetRaw] = (dateStr || "").split(" ")
  if (date && timeRaw && offsetRaw) {
    const time = timeRaw.substring(0, 12)
    const offset = offsetRaw.substring(0, 6)
    const isoStr = `${date}T${time}${offset}`
    d = dayjs(isoStr)
    if (d.isValid()) return d.format("YYYY-MM-DD HH:mm:ss")
  }
  return "-"
}

export default function UsersPage() {
  const { t } = useTranslation()
  const message = useMessage()
  const dialog = useDialog()
  const { listUsers, deleteUser } = useUsers()

  const [data, setData] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [newFormOpen, setNewFormOpen] = useState(false)
  const [editFormOpen, setEditFormOpen] = useState(false)
  const [editRow, setEditRow] = useState<UserRow | null>(null)

  const getDataList = async () => {
    setLoading(true)
    try {
      const res = (await listUsers()) as Record<string, Record<string, unknown>>
      const users: UserRow[] = Object.entries(res ?? {}).map(([username, info]) => ({
        accessKey: username,
        ...(typeof info === "object" ? info : {}),
      })) as UserRow[]
      setData(users)
    } catch (error) {
      message.error(t("Failed to get data"))
    } finally {
      setLoading(false)
      table.resetRowSelection()
    }
  }

  useEffect(() => {
    getDataList()
  }, [])

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter((row) => row.accessKey.toLowerCase().includes(term))
  }, [data, searchTerm])

  const columns: ColumnDef<UserRow>[] = [
    {
      accessorKey: "accessKey",
      header: () => t("Name"),
      cell: ({ row }) => <span className="font-medium">{row.original.accessKey}</span>,
    },
    {
      accessorKey: "policyName",
      header: () => t("Policy Name"),
      cell: ({ row }) => <span>{row.original.policyName || ""}</span>,
    },
    {
      accessorKey: "status",
      header: () => t("Status"),
      cell: ({ row }) => (
        <Badge variant={row.original.status === "enabled" ? "secondary" : "outline"}>
          {row.original.status === "enabled" ? t("Enabled") : row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "memberOf",
      header: () => t("Member Of"),
      cell: ({ row }) => <span>{row.original.memberOf?.join(", ") || ""}</span>,
    },
    {
      accessorKey: "updatedAt",
      header: () => t("Updated At"),
      cell: ({ row }) => <span>{formatDate(row.original.updatedAt)}</span>,
    },
    {
      id: "actions",
      header: () => t("Actions"),
      enableSorting: false,
      enableHiding: false,
      meta: { width: 200 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => openEditItem(row.original)}>
            <RiEdit2Line className="size-4" />
            <span>{t("Edit")}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => confirmDelete(row.original)}>
            <RiDeleteBin5Line className="size-4" />
            <span>{t("Delete")}</span>
          </Button>
        </div>
      ),
    },
  ]

  const { table, selectedRowIds } = useDataTable<UserRow>({
    data: filteredData,
    columns,
    getRowId: (row) => row.accessKey,
    enableRowSelection: true,
    initialSorting: [{ id: "updatedAt", desc: true }],
  })

  const selectedKeys = selectedRowIds

  const openEditItem = (row: UserRow) => {
    setEditRow(row)
    setEditFormOpen(true)
  }

  const confirmDelete = (row: UserRow) => {
    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to delete this user?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: () => deleteItem(row),
    })
  }

  const deleteItem = async (row: UserRow) => {
    try {
      await deleteUser(row.accessKey)
      message.success(t("Delete Success"))
      table.resetRowSelection()
      await getDataList()
    } catch (error) {
      message.error(t("Delete Failed"))
    }
  }

  const deleteByList = () => {
    if (!selectedKeys.length) return
    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to delete all selected users?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: async () => {
        try {
          await Promise.all(selectedKeys.map((key) => deleteUser(key)))
          message.success(t("Delete Success"))
          table.resetRowSelection()
          await getDataList()
        } catch (error) {
          message.error(t("Delete Failed"))
        }
      },
    })
  }

  const addToGroup = () => {
    message.error(t("Add to Group") + " - " + t("Coming soon"))
  }

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t("Search Access User")}
              clearable
              className="max-w-xs"
            />
            <Button type="button" variant="outline" disabled={!selectedKeys.length} onClick={deleteByList}>
              <RiDeleteBin5Line className="size-4" />
              {t("Delete Selected")}
            </Button>
            <Button type="button" variant="outline" disabled={!selectedKeys.length} onClick={addToGroup}>
              <RiGroup2Fill className="size-4" />
              {t("Add to Group")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setNewFormOpen(true)}>
              <RiAddLine className="size-4" />
              {t("Add User")}
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Users")}</h1>
      </PageHeader>

      <div className="space-y-4">
        <DataTable
          table={table}
          isLoading={loading}
          emptyTitle={t("No Data")}
          emptyDescription={t("Create a user to get started")}
          tableClass="min-w-full"
        />
        <DataTablePagination table={table} />

        <UserNewForm open={newFormOpen} onOpenChange={setNewFormOpen} onSuccess={getDataList} />
        <UserEditForm open={editFormOpen} onOpenChange={setEditFormOpen} row={editRow} onSuccess={getDataList} />
      </div>
    </Page>
  )
}
