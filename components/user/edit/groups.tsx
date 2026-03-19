"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
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

  const toggleGroup = (group: string) => {
    if (value.includes(group)) {
      onChange(value.filter((item) => item !== group))
      return
    }
    onChange([...value, group])
  }

  return (
    <Field>
      <FieldLabel>{t("Groups")}</FieldLabel>
      <FieldContent>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 w-full justify-between gap-2"
              aria-label={t("Groups")}
              disabled={disabled}
            >
              <span className="truncate">{value.length ? value.join(", ") : t("Select Group")}</span>
              <RiArrowDownSLine className="size-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder={t("Search Group")} />
              <CommandList>
                <CommandEmpty>{t("No Data")}</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem key={option.value} value={option.label} onSelect={() => toggleGroup(option.value)}>
                      <RiCheckLine
                        className={cn("me-2 size-4", value.includes(option.value) ? "opacity-100" : "opacity-0")}
                      />
                      <span>{option.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {value.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {value.map((group) => (
              <Badge key={group} variant="secondary">
                {group}
              </Badge>
            ))}
          </div>
        )}
      </FieldContent>
    </Field>
  )
}
