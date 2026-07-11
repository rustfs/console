"use client"

import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList } from "@/components/ui/command"
import { MultiSelectCommandItem } from "@/components/user/multi-select-command-item"
import { cn } from "@/lib/utils"

interface OptionItem {
  label: string
  value: string
}

interface UserEditGroupsProps {
  value: string[]
  options: OptionItem[]
  disabled?: boolean
  onChange: (value: string[]) => void
}

export function UserEditGroups({ value, options, disabled = false, onChange }: UserEditGroupsProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const triggerId = useId()
  const selectionSummaryId = `${triggerId}-selection`
  const selectionSummary = value.length ? value.join(", ") : t("Select Group")

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  const toggleGroup = (group: string) => {
    if (disabled) return
    if (value.includes(group)) {
      onChange(value.filter((item) => item !== group))
      return
    }
    onChange([...value, group])
  }

  return (
    <Field>
      <FieldLabel htmlFor={triggerId}>{t("Groups")}</FieldLabel>
      <FieldContent>
        <Popover open={open} onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}>
          <PopoverTrigger
            render={
              <Button
                id={triggerId}
                type="button"
                variant="outline"
                className="min-h-10 w-full min-w-0 justify-between gap-2"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`${t("Groups")}: ${selectionSummary}`}
                aria-describedby={selectionSummaryId}
                disabled={disabled}
              >
                <span id={selectionSummaryId} className="truncate">
                  {selectionSummary}
                </span>
                <RiArrowDownSLine className="size-4 text-muted-foreground" aria-hidden />
              </Button>
            }
          />
          <PopoverContent className="w-(--anchor-width) max-w-(--available-width) p-0" align="start">
            <Command>
              <CommandInput aria-label={t("Search Group")} placeholder={t("Search Group")} />
              <CommandList role="listbox" aria-label={t("Groups")} aria-multiselectable="true">
                <CommandEmpty>{t("No Data")}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <MultiSelectCommandItem
                      key={option.value}
                      value={option.label}
                      selected={value.includes(option.value)}
                      onSelect={() => toggleGroup(option.value)}
                    >
                      <RiCheckLine
                        className={cn("me-2 size-4", value.includes(option.value) ? "opacity-100" : "opacity-0")}
                      />
                      <span className="min-w-0 break-all">{option.label}</span>
                    </MultiSelectCommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {value.map((group) => (
              <Badge key={group} variant="secondary" className="h-auto max-w-full whitespace-normal">
                <span className="break-all">{group}</span>
              </Badge>
            ))}
          </div>
        )}
      </FieldContent>
    </Field>
  )
}
