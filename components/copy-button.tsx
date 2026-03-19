"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiFileCopyLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"
import { useMessage } from "@/lib/feedback/message"
import { cn } from "@/lib/utils"

export function CopyButton({ value = "", iconOnly = false }) {
  const { t } = useTranslation()
  const message = useMessage()

  const handleCopy = async (e: React.MouseEvent) => {
    // 阻止事件冒泡，防止在表格或卡片中使用时触发父级点击事件
    e.stopPropagation()

    if (!value) return

    try {
      await copyToClipboard(value)
      message.success(t("Copy Success"))
    } catch {
      message.error(t("Copy Failed"))
    }
  }

  return (
    <Button
      type="button"
      variant={iconOnly ? "ghost" : "default"}
      size={iconOnly ? "sm" : "default"}
      className={cn(iconOnly && "shrink-0 outline h-8 w-8 p-0")}
      title={t("Copy")}
      onClick={handleCopy}
    >
      {iconOnly ? (
        <>
          <RiFileCopyLine className="size-[18px]" />
          <span className="sr-only">{t("Copy")}</span>
        </>
      ) : (
        t("Copy")
      )}
    </Button>
  )
}
