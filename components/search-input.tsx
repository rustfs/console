"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
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
  "aria-label": ariaLabel,
  type = "search",
  autoComplete = "off",
  spellCheck = false,
  ...inputProps
}: SearchInputProps) {
  const { t } = useTranslation()
  const showClear = clearable && Boolean(value)

  const handleClear = () => {
    onChange("")
  }

  return (
    <InputGroup className={cn("w-full", className)}>
      <InputGroupAddon className="text-muted-foreground">
        <RiSearchLine className="size-4" aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        {...inputProps}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={(ariaLabel ?? placeholder) || "Search"}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
      />
      {showClear && (
        <InputGroupButton
          variant="ghost"
          size="icon-xs"
          type="button"
          aria-label={t("Clear search")}
          onClick={handleClear}
        >
          <RiCloseLine className="size-4" aria-hidden />
        </InputGroupButton>
      )}
    </InputGroup>
  )
}
