"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/search-input"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { UserSelector } from "@/components/user/selector"
import { useGroups } from "@/hooks/use-groups"
import { useMessage } from "@/lib/feedback/message"
import type { ColumnDef } from "@tanstack/react-table"

interface MemberItem {
  name: string
}

interface UserGroupMembersProps {
  group: { name: string; members?: string[] }
  onSearch: () => void
}

export function UserGroupMembers({ group, onSearch }: UserGroupMembersProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { updateGroupMembers } = useGroups()

  const [editStatus, setEditStatus] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [members, setMembers] = React.useState<string[]>([])

  const membersData = React.useMemo<MemberItem[]>(
    () => (group?.members ?? []).map((name) => ({ name })),
    [group?.members]
  )

  const columns: ColumnDef<MemberItem>[] = React.useMemo(
    () => [
      {
        id: "name",
        header: () => t("Name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
    ],
    [t]
  )

  const { table } = useDataTable<MemberItem>({
    data: membersData,
    columns,
    getRowId: (row) => row.name,
  })

  React.useEffect(() => {
    const col = table.getColumn("name")
    if (col) col.setFilterValue(searchTerm || undefined)
  }, [searchTerm, table])

  React.useEffect(() => {
    setMembers([...(group?.members ?? [])])
  }, [group?.members])

  React.useEffect(() => {
    setEditStatus(false)
  }, [group?.name])

  const startEditing = () => {
    setMembers([...(group?.members ?? [])])
    setEditStatus(true)
  }

  const changeMembers = async () => {
    try {
      const currentMembers = group?.members ?? []
      const nowRemoveMembers = currentMembers.filter(
        (item) => !members.includes(item)
      )

      if (nowRemoveMembers.length) {
        await updateGroupMembers({
          group: group.name,
          members: nowRemoveMembers,
          isRemove: true,
          groupStatus: "enabled",
        })
      }

      await updateGroupMembers({
        group: group.name,
        members,
        isRemove: false,
        groupStatus: "enabled",
      })

      message.success(t("Edit Success"))
      setEditStatus(false)
      onSearch()
    } catch {
      message.error(t("Edit Failed"))
    }
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardContent className="space-y-4 pt-6">
          {!editStatus ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-xs">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={t("Search User")}
                  clearable
                  className="w-full"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="inline-flex items-center gap-2"
                onClick={startEditing}
              >
                <RiAddLine className="size-4" />
                {t("Edit User")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex w-full flex-col gap-2">
                <UserSelector
                  value={members}
                  onChange={setMembers}
                  label={t("Select user group members")}
                  placeholder={t("Select user group members")}
                />
              </div>
              <div className="flex items-center gap-2 sm:self-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={changeMembers}
                >
                  {t("Submit")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {editStatus && members.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {members.map((v) => (
            <Badge key={v} variant="secondary">
              {v}
            </Badge>
          ))}
        </div>
      )}
      <DataTable table={table} />
    </div>
  )
}
