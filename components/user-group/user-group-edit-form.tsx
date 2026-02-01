"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useGroups } from "@/hooks/use-groups"
import { UserGroupMembers } from "./user-group-members"
import { UserGroupPolicies } from "./user-group-policies"

interface GroupInfo {
  name: string
  members: string[]
  status: string
  policy?: string
}

interface UserGroupEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: { name: string } | null
  onSuccess: () => void
}

export function UserGroupEditForm({
  open,
  onOpenChange,
  row,
  onSuccess,
}: UserGroupEditFormProps) {
  const { t } = useTranslation()
  const { getGroup, updateGroupStatus } = useGroups()

  const [group, setGroup] = React.useState<GroupInfo>({
    name: "",
    members: [],
    status: "enabled",
  })
  const [activeTab, setActiveTab] = React.useState("users")
  const [statusBoolean, setStatusBoolean] = React.useState(true)

  React.useEffect(() => {
    if (open && row?.name) {
      getGroupData(row.name)
      setActiveTab("users")
    }
  }, [open, row?.name])

  React.useEffect(() => {
    setStatusBoolean(group.status === "enabled")
  }, [group.status])

  const getGroupData = async (name: string) => {
    const data = (await getGroup(name)) as GroupInfo
    setGroup(data)
  }

  const handleGroupStatusChange = async (status: string) => {
    if (status === group.status) return
    await updateGroupStatus(group.name, { ...group, status })
    await getGroupData(group.name)
  }

  const handleStatusToggle = async (checked: boolean) => {
    const nextStatus = checked ? "enabled" : "disabled"
    try {
      await handleGroupStatusChange(nextStatus)
    } catch {
      setStatusBoolean(group.status === "enabled")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{group.name || t("Members")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="text-sm text-muted-foreground">{t("Status")}</span>
            <Switch
              checked={statusBoolean}
              onCheckedChange={handleStatusToggle}
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
            <TabsList className="justify-start overflow-x-auto">
              <TabsTrigger value="users">{t("Members")}</TabsTrigger>
              <TabsTrigger value="policy">{t("Policies")}</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-0">
              <UserGroupMembers
                group={group}
                onSearch={() => getGroupData(group.name)}
              />
            </TabsContent>
            <TabsContent value="policy" className="mt-0">
              <UserGroupPolicies
                group={group}
                onSearch={() => getGroupData(group.name)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
