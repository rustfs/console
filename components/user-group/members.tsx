"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
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
  const [submitting, setSubmitting] = React.useState(false)
  const activeGroupRef = React.useRef(group.name)
  const editButtonRef = React.useRef<HTMLButtonElement>(null)
  const editHeadingRef = React.useRef<HTMLHeadingElement>(null)

  const membersData = React.useMemo<MemberItem[]>(
    () => (group.members ?? []).map((name) => ({ name })),
    [group.members],
  )

  const columns: ColumnDef<MemberItem>[] = React.useMemo(
    () => [
      {
        id: "name",
        header: () => t("Name"),
        cell: ({ row }) => <span className="break-all font-medium">{row.original.name}</span>,
      },
    ],
    [t],
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
    activeGroupRef.current = group.name
    setSearchTerm("")
    setEditStatus(false)
    setSubmitting(false)
    setMembers([...(group.members ?? [])])
  }, [group.members, group.name])

  const previousEditStatusRef = React.useRef<boolean | null>(null)

  React.useEffect(() => {
    const previousEditStatus = previousEditStatusRef.current
    previousEditStatusRef.current = editStatus
    if (previousEditStatus === null || previousEditStatus === editStatus) return
    if (editStatus) {
      editHeadingRef.current?.focus()
    } else {
      editButtonRef.current?.focus()
    }
  }, [editStatus])

  const startEditing = () => {
    setMembers([...(group?.members ?? [])])
    setEditStatus(true)
  }

  const cancelEditing = () => {
    setMembers([...(group?.members ?? [])])
    setEditStatus(false)
  }

  const changeMembers = async () => {
    if (submitting) return
    const targetName = group.name
    const currentMembers = group?.members ?? []
    const addedMembers = members.filter((item) => !currentMembers.includes(item))
    const removedMembers = currentMembers.filter((item) => !members.includes(item))
    if (!addedMembers.length && !removedMembers.length) {
      setEditStatus(false)
      return
    }

    setSubmitting(true)
    try {
      if (addedMembers.length) {
        await updateGroupMembers({
          group: targetName,
          members: addedMembers,
          isRemove: false,
          groupStatus: "enabled",
        })
      }

      if (removedMembers.length) {
        await updateGroupMembers({
          group: targetName,
          members: removedMembers,
          isRemove: true,
          groupStatus: "enabled",
        })
      }

      if (activeGroupRef.current !== targetName) return
      message.success(t("Edit Success"))
      setEditStatus(false)
      onSearch()
    } catch {
      if (activeGroupRef.current === targetName) {
        message.error(t("Edit Failed"))
        setEditStatus(false)
        onSearch()
      }
    } finally {
      if (activeGroupRef.current === targetName) setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
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
            ref={editButtonRef}
            type="button"
            variant="outline"
            className="inline-flex items-center gap-2"
            onClick={startEditing}
          >
            <RiAddLine className="size-4" aria-hidden />
            {t("Edit User")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 border bg-muted/20 p-3" aria-busy={submitting}>
          <div className="flex items-center justify-between gap-3">
            <h3 ref={editHeadingRef} tabIndex={-1} className="text-sm font-medium outline-none">
              {t("Edit")} {t("Members")}
            </h3>
            <span className="text-xs tabular-nums text-muted-foreground">{members.length}</span>
          </div>

          <UserSelector
            value={members}
            onChange={setMembers}
            label={t("Select user group members")}
            placeholder={t("Select user group members")}
            disabled={submitting}
          />

          {members.length > 0 ? (
            <div className="flex min-w-0 flex-wrap gap-2">
              {members.slice(0, 5).map((member) => (
                <Badge key={member} variant="secondary" className="h-auto max-w-full whitespace-normal">
                  <span className="break-all">{member}</span>
                </Badge>
              ))}
              {members.length > 5 ? <Badge variant="outline">+{members.length - 5}</Badge> : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button type="button" variant="outline" onClick={cancelEditing} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button type="button" onClick={changeMembers} disabled={submitting}>
              {submitting ? <Spinner className="size-4" /> : null}
              {t("Save")}
            </Button>
          </div>
        </div>
      )}
      {!editStatus ? <DataTable table={table} caption={t("Members")} /> : null}
    </div>
  )
}
