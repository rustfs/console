"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  arMA,
  de,
  enUS,
  es,
  fr,
  id,
  it,
  ja,
  ko,
  ptBR,
  ru,
  tr,
  vi,
  zhCN,
  type Locale as DateFnsLocale,
} from "date-fns/locale"
import { RiCalendarLine, RiCloseLine, RiTimeLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  applyDateTimeBounds,
  formatDisplayDateTime,
  getDateFnsLocaleCode,
  getHtmlLocale,
  toIsoDateTimeValue,
  toPickerDate,
  toTimeInputValue,
} from "@/lib/datetime-picker.js"
import { cn } from "@/lib/utils"

const DATE_FNS_LOCALES: Record<string, DateFnsLocale> = {
  "ar-MA": arMA,
  de,
  "en-US": enUS,
  es,
  fr,
  id,
  it,
  ja,
  ko,
  "pt-BR": ptBR,
  ru,
  tr,
  vi,
  "zh-CN": zhCN,
}

interface DateTimePickerProps extends Omit<React.ComponentProps<typeof Button>, "value" | "onChange"> {
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
  disabled,
  id,
  ...props
}: DateTimePickerProps) {
  const { i18n, t } = useTranslation()
  const localeCode = getDateFnsLocaleCode(i18n.resolvedLanguage ?? i18n.language)
  const htmlLocale = getHtmlLocale(i18n.resolvedLanguage ?? i18n.language)
  const calendarLocale = DATE_FNS_LOCALES[localeCode] ?? enUS
  const selectedDate = toPickerDate(value)
  const timeValue = toTimeInputValue(value)
  const [hoursValue = "00", minutesValue = "00"] = timeValue.split(":")
  const displayValue = formatDisplayDateTime(value, htmlLocale)
  const minDate = toPickerDate(min)
  const maxDate = toPickerDate(max)
  const disabledDays = [...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]

  const clearValue = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onChange?.(null)
  }

  const updateDate = (date: Date | undefined) => {
    onChange?.(applyDateTimeBounds(toIsoDateTimeValue(date, timeValue), min, max))
  }

  const updateTime = (nextTime: string) => {
    onChange?.(applyDateTimeBounds(toIsoDateTimeValue(selectedDate ?? new Date(), nextTime), min, max))
  }

  const updateHours = (event: React.ChangeEvent<HTMLInputElement>) => {
    const hours = Math.min(23, Math.max(0, Number(event.target.value) || 0))
    updateTime(`${String(hours).padStart(2, "0")}:${minutesValue}`)
  }

  const updateMinutes = (event: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = Math.min(59, Math.max(0, Number(event.target.value) || 0))
    updateTime(`${hoursValue}:${String(minutes).padStart(2, "0")}`)
  }

  return (
    <Popover>
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-8 w-full justify-start px-2.5 text-left font-normal",
              displayValue && "pe-8",
              !displayValue && "text-muted-foreground",
              className,
            )}
            {...props}
          >
            <span className="flex min-w-0 items-center gap-2">
              <RiCalendarLine className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{displayValue || placeholder || t("Please select expiry date")}</span>
            </span>
          </Button>
        </PopoverTrigger>
        {displayValue && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-1 right-1 text-muted-foreground hover:text-foreground"
            onClick={clearValue}
            aria-label={t("Remove")}
          >
            <RiCloseLine className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      <PopoverContent align="start" className="w-auto p-0" lang={htmlLocale}>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={updateDate}
          disabled={disabledDays}
          locale={calendarLocale}
          captionLayout="dropdown"
        />
        <div className="flex items-center gap-2 border-t p-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <RiTimeLine className="size-4 text-muted-foreground" aria-hidden />
            <Input
              inputMode="numeric"
              value={hoursValue}
              onChange={updateHours}
              aria-label={t("Hours")}
              className="w-14 text-center"
              maxLength={2}
            />
            <span className="text-muted-foreground">:</span>
            <Input
              inputMode="numeric"
              value={minutesValue}
              onChange={updateMinutes}
              aria-label={t("Minutes")}
              className="w-14 text-center"
              maxLength={2}
            />
          </div>
          {displayValue ? (
            <Button type="button" variant="ghost" size="icon" onClick={clearValue} aria-label={t("Remove")}>
              <RiCloseLine className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
