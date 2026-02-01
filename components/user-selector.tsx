"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiArrowDownSLine, RiCheckLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
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
import { useMessage } from "@/lib/ui/message"
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
  const message = useMessage()
  const { listUsers } = useUsers()
  const [open, setOpen] = React.useState(false)
  const [users, setUsers] = React.useState<{ label: string; value: string }[]>([])

  React.useEffect(() => {
    if (autoLoad && open) {
      listUsers()
        .then((res: Record<string, unknown>) => {
          setUsers(
            Object.entries(res ?? {}).map(([username]) => ({
              label: username,
              value: username,
            }))
          )
        })
        .catch(() => message.error(t("Failed to get data")))
    }
  }, [autoLoad, open, listUsers, message, t])

  const displayLabel = label ?? t("Users")
  const displayPlaceholder = placeholder ?? t("Select user group members")

  const toggleUser = (v: string) => {
    onChange(
      value.includes(v) ? value.filter((item) => item !== v) : [...value, v]
    )
  }

  return (
    <Field>
      <FieldLabel className="text-sm font-medium">{displayLabel}</FieldLabel>
      <FieldContent>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 w-full justify-between gap-2"
              disabled={disabled}
              aria-label={displayLabel}
            >
              <span className="truncate">
                {value.length ? value.join(", ") : displayPlaceholder}
              </span>
              <RiArrowDownSLine className="size-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder={t("Search User")} />
              <CommandList>
                <CommandEmpty>{t("No Data")}</CommandEmpty>
                <CommandGroup>
                  {users.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => toggleUser(option.value)}
                    >
                      <RiCheckLine
                        className={cn(
                          "mr-2 size-4",
                          value.includes(option.value) ? "opacity-100" : "opacity-0"
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
  )
}
