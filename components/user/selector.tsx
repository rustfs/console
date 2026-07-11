"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiArrowDownSLine, RiCheckLine, RiRefreshLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from "@/components/ui/command"
import { Spinner } from "@/components/ui/spinner"
import { MultiSelectCommandItem } from "@/components/user/multi-select-command-item"
import { useUsers } from "@/hooks/use-users"
import { cn } from "@/lib/utils"

interface UserSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  autoLoad?: boolean
}

export function UserSelector({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  autoLoad = true,
}: UserSelectorProps) {
  const { t } = useTranslation()
  const { listUsers } = useUsers()
  const [open, setOpen] = React.useState(false)
  const [users, setUsers] = React.useState<{ label: string; value: string }[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [loadVersion, setLoadVersion] = React.useState(0)
  const triggerId = React.useId()

  React.useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  React.useEffect(() => {
    if (!autoLoad || !open) return
    let cancelled = false

    setUsers([])
    setLoadError("")
    setLoading(true)
    listUsers()
      .then((res: Record<string, unknown> | null) => {
        if (cancelled) return
        setUsers(
          Object.keys(res ?? {})
            .sort((a, b) => a.localeCompare(b))
            .map((username) => ({ label: username, value: username })),
        )
      })
      .catch((error) => {
        if (cancelled) return
        setLoadError((error as Error)?.message || t("Failed to get data"))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [autoLoad, open, listUsers, loadVersion, t])

  const displayLabel = label ?? t("Users")
  const displayPlaceholder = placeholder ?? t("Select user group members")
  const selectionSummaryId = `${triggerId}-selection`
  const selectionSummary = value.length ? value.join(", ") : displayPlaceholder

  const toggleUser = (v: string) => {
    if (disabled || loading) return
    onChange(value.includes(v) ? value.filter((item) => item !== v) : [...value, v])
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!disabled) setOpen(nextOpen)
  }

  return (
    <Field>
      <FieldLabel htmlFor={triggerId} className="text-sm font-medium">
        {displayLabel}
      </FieldLabel>
      <FieldContent>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger
            render={
              <Button
                id={triggerId}
                type="button"
                variant="outline"
                className="min-h-10 w-full min-w-0 justify-between gap-2"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`${displayLabel}: ${selectionSummary}`}
                aria-describedby={selectionSummaryId}
              >
                <span id={selectionSummaryId} className="truncate">
                  {selectionSummary}
                </span>
                <RiArrowDownSLine className="size-4 text-muted-foreground" aria-hidden />
              </Button>
            }
          />
          <PopoverContent
            className="w-(--anchor-width) max-w-(--available-width) p-0"
            align="start"
            aria-busy={loading}
          >
            <Command shouldFilter={!loading && !loadError}>
              <CommandInput
                aria-label={t("Search User")}
                placeholder={t("Search User")}
                disabled={loading || Boolean(loadError)}
              />
              {loading ? (
                <div
                  className="flex min-h-24 items-center justify-center gap-2 text-sm text-muted-foreground"
                  role="status"
                >
                  <Spinner className="size-4" aria-hidden />
                  {t("Loading…")}
                </div>
              ) : loadError ? (
                <div className="flex min-h-24 flex-col items-center justify-center gap-3 p-4 text-center" role="alert">
                  <p className="max-w-full break-words text-sm text-destructive">{loadError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setLoadVersion((v) => v + 1)}>
                    <RiRefreshLine className="size-4" aria-hidden />
                    {t("Refresh")}
                  </Button>
                </div>
              ) : (
                <CommandList role="listbox" aria-label={displayLabel} aria-multiselectable="true">
                  <CommandEmpty>{t("No Data")}</CommandEmpty>
                  <CommandGroup>
                    {users.map((option) => {
                      const selected = value.includes(option.value)
                      return (
                        <MultiSelectCommandItem
                          key={option.value}
                          value={option.label}
                          selected={selected}
                          onSelect={() => toggleUser(option.value)}
                        >
                          <RiCheckLine className={cn("me-2 size-4", selected ? "opacity-100" : "opacity-0")} />
                          <span className="min-w-0 break-all">{option.label}</span>
                        </MultiSelectCommandItem>
                      )
                    })}
                  </CommandGroup>
                </CommandList>
              )}
            </Command>
          </PopoverContent>
        </Popover>
      </FieldContent>
    </Field>
  )
}
