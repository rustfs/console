"use client"

import * as React from "react"
import dayjs from "dayjs"
import { cn } from "@/lib/utils"

interface DateTimePickerProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value?: string | null
  onChange?: (value: string | null) => void
  placeholder?: string
  min?: string
  max?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  min,
  max,
  className,
  ...props
}: DateTimePickerProps) {
  const inputValue =
    value && dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DDTHH:mm") : ""

  const minValue = min && dayjs(min).isValid() ? dayjs(min).format("YYYY-MM-DDTHH:mm") : undefined
  const maxValue = max && dayjs(max).isValid() ? dayjs(max).format("YYYY-MM-DDTHH:mm") : undefined

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) {
      onChange?.(null)
      return
    }
    const date = dayjs(val)
    onChange?.(date.isValid() ? date.toISOString() : null)
  }

  return (
    <input
      type="datetime-local"
      value={inputValue}
      onChange={handleChange}
      placeholder={placeholder}
      min={minValue}
      max={maxValue}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
