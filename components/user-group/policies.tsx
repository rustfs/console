"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiAddLine, RiArrowDownSLine, RiCheckLine, RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from "@/components/ui/command"
import { SearchInput } from "@/components/search-input"
import { DataTable } from "@/components/data-table/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { usePolicies } from "@/hooks/use-policies"
import { useMessage } from "@/lib/feedback/message"
import { cn } from "@/lib/utils"
import { MultiSelectCommandItem } from "@/components/user/multi-select-command-item"
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
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [loadVersion, setLoadVersion] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)
  const activeGroupRef = React.useRef(group.name)
  const triggerId = React.useId()
  const editButtonRef = React.useRef<HTMLButtonElement>(null)
  const editHeadingRef = React.useRef<HTMLHeadingElement>(null)

  const policyStr = group?.policy
  const currentPolicies = React.useMemo(() => {
    if (!policyStr) return []
    return policyStr
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }, [policyStr])

  const policiesData = React.useMemo<PolicyItem[]>(() => currentPolicies.map((name) => ({ name })), [currentPolicies])

  const columns: ColumnDef<PolicyItem>[] = React.useMemo(
    () => [
      {
        id: "name",
        header: () => t("Name"),
        cell: ({ row }) => <span className="break-all font-medium">{row.original.name}</span>,
      },
    ],
    [t],
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
    activeGroupRef.current = group.name
    setSearchTerm("")
    setEditStatus(false)
    setPolicySelectorOpen(false)
    setPolicies([])
    setSelectedPolicies([...currentPolicies])
    setLoadError("")
    setLoading(false)
    setSubmitting(false)
  }, [currentPolicies, group.name])

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

  React.useEffect(() => {
    if (!editStatus) return
    let cancelled = false
    const targetName = group.name

    setPolicies([])
    setLoadError("")
    setLoading(true)
    listPolicies()
      .then((res: Record<string, unknown>) => {
        if (cancelled || activeGroupRef.current !== targetName) return
        setPolicies(
          Object.keys(res ?? {})
            .sort((a, b) => a.localeCompare(b))
            .map((key) => ({ label: key, value: key })),
        )
      })
      .catch((error) => {
        if (cancelled || activeGroupRef.current !== targetName) return
        setLoadError((error as Error)?.message || t("Failed to get data"))
      })
      .finally(() => {
        if (!cancelled && activeGroupRef.current === targetName) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [editStatus, group.name, listPolicies, loadVersion, t])

  const startEditing = () => {
    setSelectedPolicies([...currentPolicies])
    setPolicySelectorOpen(false)
    setEditStatus(true)
  }

  const cancelEditing = () => {
    if (submitting) return
    setSelectedPolicies([...currentPolicies])
    setPolicySelectorOpen(false)
    setEditStatus(false)
  }

  const togglePolicy = (value: string) => {
    if (loading || loadError || submitting) return
    setSelectedPolicies((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]))
  }

  const changePolicies = async () => {
    if (loading || loadError || submitting || !group.name) return
    const targetName = group.name
    setSubmitting(true)
    try {
      await setUserOrGroupPolicy({
        policyName: selectedPolicies,
        userOrGroup: targetName,
        isGroup: true,
      })
      if (activeGroupRef.current !== targetName) return
      message.success(t("Edit Success"))
      setEditStatus(false)
      setPolicySelectorOpen(false)
      onSearch()
    } catch {
      if (activeGroupRef.current === targetName) message.error(t("Edit Failed"))
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
              placeholder={t("Search Policy")}
              clearable
              className="w-full"
            />
          </div>
          <Button
            ref={editButtonRef}
            variant="outline"
            className="inline-flex items-center gap-2"
            onClick={startEditing}
          >
            <RiAddLine className="size-4" aria-hidden />
            {t("Edit Policy")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4 border bg-muted/20 p-3" aria-busy={loading || submitting}>
          <div className="flex items-center justify-between gap-3">
            <h3 ref={editHeadingRef} tabIndex={-1} className="text-sm font-medium outline-none">
              {t("Edit")} {t("Policies")}
            </h3>
            <span className="text-xs tabular-nums text-muted-foreground">{selectedPolicies.length}</span>
          </div>

          <Field className="flex w-full flex-col gap-2">
            <FieldLabel htmlFor={triggerId} className="text-sm font-medium">
              {t("Select user group policies")}
            </FieldLabel>
            <FieldContent className="space-y-2">
              <Popover
                open={policySelectorOpen}
                onOpenChange={(nextOpen) => !loading && !loadError && !submitting && setPolicySelectorOpen(nextOpen)}
              >
                <PopoverTrigger
                  render={
                    <Button
                      id={triggerId}
                      type="button"
                      variant="outline"
                      className="min-h-10 w-full min-w-0 justify-between gap-2"
                      aria-haspopup="listbox"
                      aria-expanded={policySelectorOpen}
                      aria-label={`${t("Select user group policies")}: ${selectedPolicies.length ? selectedPolicies.join(", ") : t("No Data")}`}
                      disabled={loading || Boolean(loadError) || submitting}
                    >
                      <span className="truncate">
                        {selectedPolicies.length ? selectedPolicies.join(", ") : t("Select user group policies")}
                      </span>
                      <RiArrowDownSLine className="size-4 text-muted-foreground" aria-hidden />
                    </Button>
                  }
                />
                <PopoverContent className="w-(--anchor-width) max-w-(--available-width) p-0" align="start">
                  <Command>
                    <CommandInput aria-label={t("Search Policy")} placeholder={t("Search Policy")} />
                    <CommandList role="listbox" aria-label={t("Policies")} aria-multiselectable="true">
                      <CommandEmpty>{t("No Data")}</CommandEmpty>
                      <CommandGroup>
                        {policies.map((option) => (
                          <MultiSelectCommandItem
                            key={option.value}
                            value={option.label}
                            selected={selectedPolicies.includes(option.value)}
                            onSelect={() => togglePolicy(option.value)}
                          >
                            <RiCheckLine
                              className={cn(
                                "me-2 size-4",
                                selectedPolicies.includes(option.value) ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <span className="min-w-0 break-all">{option.label}</span>
                          </MultiSelectCommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </FieldContent>
          </Field>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Spinner className="size-4" aria-hidden />
              {t("Loading…")}
            </div>
          ) : loadError ? (
            <div className="flex items-center justify-between gap-3 border border-dashed p-3" role="alert">
              <p className="min-w-0 break-words text-sm text-destructive">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setLoadVersion((current) => current + 1)}
              >
                <RiRefreshLine className="size-4" aria-hidden />
                {t("Refresh")}
              </Button>
            </div>
          ) : selectedPolicies.length > 0 ? (
            <div className="flex min-w-0 flex-wrap gap-2">
              {selectedPolicies.slice(0, 5).map((value) => (
                <Badge key={value} variant="secondary" className="h-auto max-w-full whitespace-normal">
                  <span className="break-all">{value}</span>
                </Badge>
              ))}
              {selectedPolicies.length > 5 ? <Badge variant="outline">+{selectedPolicies.length - 5}</Badge> : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <Button type="button" variant="outline" onClick={cancelEditing} disabled={submitting}>
              {t("Cancel")}
            </Button>
            <Button type="button" onClick={changePolicies} disabled={loading || Boolean(loadError) || submitting}>
              {submitting ? <Spinner className="size-4" /> : null}
              {t("Save")}
            </Button>
          </div>
        </div>
      )}
      {!editStatus ? <DataTable table={table} caption={t("Policies")} /> : null}
    </div>
  )
}
