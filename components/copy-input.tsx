"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiFileCopyLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMessage } from "@/lib/ui/message"
import { cn } from "@/lib/utils"

interface CopyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value?: string
  onChange?: (value: string) => void
  readonly?: boolean
  copyIcon?: boolean
  className?: string
}

export function CopyInput({
  value = "",
  onChange,
  readonly = false,
  copyIcon = false,
  className,
  ...props
}: CopyInputProps) {
  const { t } = useTranslation()
  const message = useMessage()

  const handleCopy = async () => {
    try {
      if (!value) throw new Error("No value to copy")
      await navigator.clipboard.writeText(value)
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
        className="flex-1"
        {...props}
      />
      {!copyIcon ? (
        <Button type="button" variant="default" onClick={handleCopy}>
          {t("Copy")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 outline"
          title={t("Copy")}
          onClick={handleCopy}
        >
          <RiFileCopyLine className="size-[18px]" />
          <span className="sr-only">{t("Copy")}</span>
        </Button>
      )}
    </div>
  )
}
