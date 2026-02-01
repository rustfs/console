"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiArrowDownSLine, RiCheckLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { SearchInput } from "@/components/search-input"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { usePolicies } from "@/hooks/use-policies"
import { useMessage } from "@/lib/feedback/message"
import { cn } from "@/lib/utils"
import type { ColumnDef } from "@tanstack/react-table"

interface PolicyItem {
  name: string
}

interface UserGroupPoliciesProps {
  group: { name: string; policy?: string }
  onSearch: () => void
}

export function UserGroupPolicies({ group, onSearch }: UserGroupPoliciesProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const { listPolicies, setUserOrGroupPolicy } = usePolicies()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [editStatus, setEditStatus] = React.useState(false)
  const [policySelectorOpen, setPolicySelectorOpen] = React.useState(false)
  const [policies, setPolicies] = React.useState<{ label: string; value: string }[]>([])
  const [selectedPolicies, setSelectedPolicies] = React.useState<string[]>([])

  const policyStr = group?.policy
  const currentPolicies = React.useMemo(() => {
    if (!policyStr) return []
    return policyStr
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }, [policyStr])

  const policiesData = React.useMemo<PolicyItem[]>(
    () => currentPolicies.map((name) => ({ name })),
    [currentPolicies]
  )

  const columns: ColumnDef<PolicyItem>[] = React.useMemo(
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

  const { table } = useDataTable<PolicyItem>({
    data: policiesData,
    columns,
    getRowId: (row) => row.name,
  })

  React.useEffect(() => {
    const col = table.getColumn("name")
    if (col) col.setFilterValue(searchTerm || undefined)
  }, [searchTerm, table])

  React.useEffect(() => {
    if (!editStatus) {
      setSelectedPolicies([...currentPolicies])
    }
  }, [group?.policy, editStatus, currentPolicies])

  React.useEffect(() => {
    listPolicies()
      .then((res: Record<string, unknown>) => {
        setPolicies(
          Object.keys(res ?? {})
            .sort((a, b) => a.localeCompare(b))
            .map((key) => ({ label: key, value: key }))
        )
      })
      .catch(() => message.error(t("Failed to get data")))
  }, [listPolicies, message, t])

  const startEditing = () => {
    setSelectedPolicies([...currentPolicies])
    setPolicySelectorOpen(false)
    setEditStatus(true)
  }

  const cancelEditing = () => {
    setSelectedPolicies([...currentPolicies])
    setPolicySelectorOpen(false)
    setEditStatus(false)
  }

  const togglePolicy = (value: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    )
  }

  const changePolicies = async () => {
    try {
      await setUserOrGroupPolicy({
        policyName: selectedPolicies,
        userOrGroup: group?.name ?? "",
        isGroup: true,
      })
      message.success(t("Edit Success"))
      setEditStatus(false)
      setPolicySelectorOpen(false)
      onSearch()
    } catch {
      message.error(t("Edit Failed"))
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
              placeholder={t("Search Policy")}
              clearable
              className="w-full"
            />
          </div>
          <Button
            variant="outline"
            className="inline-flex items-center gap-2"
            onClick={startEditing}
          >
            <RiAddLine className="size-4" />
            {t("Edit Policy")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Field className="flex w-full flex-col gap-2">
            <FieldLabel className="text-sm font-medium">
              {t("Select user group policies")}
            </FieldLabel>
            <FieldContent className="space-y-2">
              <Popover
                open={policySelectorOpen}
                onOpenChange={setPolicySelectorOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10 justify-between gap-2"
                    aria-label={t("Select user group policies")}
                  >
                    <span className="truncate">
                      {selectedPolicies.length
                        ? selectedPolicies.join(", ")
                        : t("Select user group policies")}
                    </span>
                    <RiArrowDownSLine className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("Search Policy")} />
                    <CommandList>
                      <CommandEmpty>{t("No Data")}</CommandEmpty>
                      <CommandGroup>
                        {policies.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.label}
                            onSelect={() => togglePolicy(option.value)}
                          >
                            <RiCheckLine
                              className={cn(
                                "mr-2 size-4",
                                selectedPolicies.includes(option.value)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span>{option.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </FieldContent>
          </Field>
          <div className="flex items-center gap-2 sm:self-end">
            <Button variant="ghost" onClick={cancelEditing}>
              {t("Cancel")}
            </Button>
            <Button variant="outline" onClick={changePolicies}>
              {t("Submit")}
            </Button>
          </div>
        </div>
      )}
      {editStatus && selectedPolicies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPolicies.map((value) => (
            <Badge key={value} variant="secondary">
              {value}
            </Badge>
          ))}
        </div>
      )}
      <DataTable table={table} />
    </div>
  )
}
