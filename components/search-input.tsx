"use client"

import * as React from "react"
import { RiSearchLine, RiCloseLine } from "@remixicon/react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

interface SearchInputProps extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  clearable?: boolean
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "",
  clearable = false,
  className,
  ...props
}: SearchInputProps) {
  const showClear = clearable && Boolean(value)

  const handleClear = () => {
    onChange("")
  }

  return (
    <InputGroup className={cn("w-full", className)} {...props}>
      <InputGroupAddon className="text-muted-foreground">
        <RiSearchLine className="size-4" />
      </InputGroupAddon>
      <InputGroupInput value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {showClear && (
        <InputGroupButton variant="ghost" size="icon-xs" type="button" aria-label="Clear" onClick={handleClear}>
          <RiCloseLine className="size-4" />
        </InputGroupButton>
      )}
    </InputGroup>
  )
}
