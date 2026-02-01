"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiDeleteBin5Line, RiEdit2Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/search-input"
import { Page } from "@/components/page"
import { PageHeader } from "@/components/page-header"
import { DataTable } from "@/components/data-table/data-table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { AccessKeysNewItem } from "@/components/access-keys/access-keys-new-item"
import { AccessKeysEditItem } from "@/components/access-keys/access-keys-edit-item"
import { UserNotice } from "@/components/user/user-notice"
import { useAccessKeys } from "@/hooks/use-access-keys"
import { useDialog } from "@/lib/ui/dialog"
import { useMessage } from "@/lib/ui/message"
import type { ColumnDef } from "@tanstack/react-table"
import dayjs from "dayjs"

interface RowData {
  accessKey: string
  expiration: string | null
  name: string
  description: string
  accountStatus: string
}

export default function AccessKeysPage() {
  const { t } = useTranslation()
  const dialog = useDialog()
  const message = useMessage()
  const { listUserServiceAccounts, deleteServiceAccount } = useAccessKeys()

  const [data, setData] = useState<RowData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [newItemVisible, setNewItemVisible] = useState(false)
  const [editItemOpen, setEditItemOpen] = useState(false)
  const [editItemRow, setEditItemRow] = useState<RowData | null>(null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeData, setNoticeData] = useState<{ credentials?: { accessKey?: string; secretKey?: string }; url?: string } | null>(null)

  const listUserAccounts = async () => {
    setLoading(true)
    try {
      const res = (await listUserServiceAccounts({})) as { accounts?: RowData[] }
      setData(res?.accounts ?? [])
    } catch (error) {
      console.error(error)
      message.error(t("Get Data Failed"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    listUserAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data
    const term = searchTerm.toLowerCase()
    return data.filter((row) => row.accessKey.toLowerCase().includes(term))
  }, [data, searchTerm])

  const columns: ColumnDef<RowData>[] = [
    {
      accessorKey: "accessKey",
      header: () => t("Access Key"),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.accessKey}</span>
      ),
    },
    {
      accessorKey: "expiration",
      header: () => t("Expiration"),
      cell: ({ row }) =>
        row.original.expiration &&
        row.original.expiration !== "9999-01-01T00:00:00Z"
          ? dayjs(row.original.expiration).format("YYYY-MM-DD HH:mm")
          : "-",
    },
    {
      accessorKey: "accountStatus",
      header: () => t("Status"),
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.accountStatus === "on" ? "secondary" : "destructive"
          }
        >
          {row.original.accountStatus === "on"
            ? t("Available")
            : t("Disabled")}
        </Badge>
      ),
    },
    {
      accessorKey: "name",
      header: () => t("Name"),
      cell: ({ row }) => <span>{row.original.name || "-"}</span>,
    },
    {
      id: "description",
      header: () => t("Description"),
      cell: ({ row }) => <span>{row.original.description || "-"}</span>,
    },
    {
      id: "actions",
      header: () => t("Actions"),
      enableSorting: false,
      enableHiding: false,
      meta: { width: 200 },
      cell: ({ row }) => (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditItem(row.original)}
          >
            <RiEdit2Line className="size-4" />
            <span>{t("Edit")}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => confirmDeleteSingle(row.original)}
          >
            <RiDeleteBin5Line className="size-4" />
            <span>{t("Delete")}</span>
          </Button>
        </div>
      ),
    },
  ]

  const { table, selectedRowIds } = useDataTable<RowData>({
    data: filteredData,
    columns,
    getRowId: (row) => row.accessKey,
    enableRowSelection: true,
  })

  const selectedKeys = selectedRowIds

  const openEditItem = (row: RowData) => {
    setEditItemRow(row)
    setEditItemOpen(true)
  }

  const confirmDeleteSingle = (row: RowData) => {
    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to delete this key?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: () => deleteItem(row.accessKey),
    })
  }

  const deleteItem = async (accessKey: string) => {
    try {
      await deleteServiceAccount(accessKey)
      message.success(t("Delete Success"))
      await listUserAccounts()
    } catch (error) {
      console.error(error)
      message.error(t("Delete Failed"))
    }
  }

  const deleteSelected = () => {
    if (!selectedKeys.length) {
      message.error(t("Please select at least one item"))
      return
    }

    dialog.error({
      title: t("Warning"),
      content: t("Are you sure you want to delete all selected keys?"),
      positiveText: t("Confirm"),
      negativeText: t("Cancel"),
      onPositiveClick: async () => {
        try {
          await Promise.all(selectedKeys.map((key) => deleteServiceAccount(key)))
          message.success(t("Delete Success"))
          table.resetRowSelection()
          await listUserAccounts()
        } catch (error) {
          console.error(error)
          message.error(t("Delete Failed"))
        }
      },
    })
  }

  const handleNotice = (data: unknown) => {
    setNoticeData(data as { credentials?: { accessKey?: string; secretKey?: string }; url?: string })
    setNoticeOpen(true)
  }

  const handleNoticeClose = () => {
    setNoticeData(null)
    listUserAccounts()
  }

  return (
    <Page>
      <PageHeader
        actions={
          <>
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t("Search Access Key")}
              clearable
              className="max-w-xs"
            />
            {selectedKeys.length > 0 && (
              <Button
                variant="outline"
                disabled={!selectedKeys.length}
                onClick={deleteSelected}
              >
                <RiDeleteBin5Line className="size-4" />
                <span>{t("Delete Selected")}</span>
              </Button>
            )}
            <Button variant="outline" onClick={() => setNewItemVisible(true)}>
              <RiAddLine className="size-4" />
              <span>{t("Add Access Key")}</span>
            </Button>
          </>
        }
      >
        <h1 className="text-2xl font-bold">{t("Access Keys")}</h1>
      </PageHeader>

      <div className="space-y-3">
        <DataTable
          table={table}
          isLoading={loading}
          emptyTitle={t("No Access Keys")}
          emptyDescription={t("Create a new access key to get started.")}
          className="overflow-hidden"
          tableClass="min-w-full"
        />
        <DataTablePagination table={table} className="px-2 py-3" />
      </div>

      <AccessKeysNewItem
        visible={newItemVisible}
        onVisibleChange={setNewItemVisible}
        onSuccess={listUserAccounts}
        onNotice={handleNotice}
      />

      <AccessKeysEditItem
        open={editItemOpen}
        onOpenChange={setEditItemOpen}
        row={editItemRow}
        onSuccess={listUserAccounts}
      />

      <UserNotice
        open={noticeOpen}
        onOpenChange={setNoticeOpen}
        data={noticeData}
        onClose={handleNoticeClose}
      />
    </Page>
  )
}
