"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiFileCopyLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { copyToClipboard } from "@/lib/clipboard"
import { useMessage } from "@/lib/feedback/message"
import { cn } from "@/lib/utils"

interface CopyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value?: string
  onChange?: (value: string) => void
  readonly?: boolean
  copyIcon?: boolean
  copyLabel?: string
  className?: string
}

export function CopyInput({
  value = "",
  onChange,
  readonly = false,
  copyIcon = false,
  copyLabel,
  className,
  ...props
}: CopyInputProps) {
  const { t } = useTranslation()
  const message = useMessage()
  const resolvedCopyLabel = copyLabel ?? t("Copy")

  const handleCopy = async () => {
    try {
      await copyToClipboard(value)
      message.success(t("Copy Success"))
    } catch {
      message.error(t("Copy Failed"))
    }
  }

  return (
    <div className={cn("flex h-full items-center gap-2", className)}>
      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readonly}
        aria-label={props["aria-label"] ?? t("Copy")}
        className="flex-1"
        {...props}
      />
      {!copyIcon ? (
        <Button type="button" variant="default" onClick={handleCopy}>
          {resolvedCopyLabel}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 outline"
          title={resolvedCopyLabel}
          aria-label={resolvedCopyLabel}
          onClick={handleCopy}
        >
          <RiFileCopyLine className="size-4" aria-hidden />
          <span className="sr-only">{resolvedCopyLabel}</span>
        </Button>
      )}
    </div>
  )
}
