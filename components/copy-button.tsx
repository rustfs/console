"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { RiFileCopyLine } from "@remixicon/react"
import { Button, type ButtonProps } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"
import { useMessage } from "@/lib/feedback/message"
import { cn } from "@/lib/utils"

interface CopyButtonProps extends ButtonProps {
  /** 要复制的文本内容 */
  value: string
  /** 是否只显示图标模式（默认为 false，即显示文字按钮） */
  iconOnly?: boolean
  /** 自定义成功提示词 */
  successMessage?: string
}

export function CopyButton({
  value = "",
  iconOnly = false,
  successMessage,
  className,
  children,
  ...props
}: CopyButtonProps) {
  const { t } = useTranslation()
  const message = useMessage()

  const handleCopy = async (e: React.MouseEvent) => {
    // 阻止事件冒泡，防止在表格或卡片中使用时触发父级点击事件
    e.stopPropagation()

    if (!value) return

    try {
      await copyToClipboard(value)
      message.success(successMessage || t("Copy Success"))
    } catch {
      message.error(t("Copy Failed"))
    }
  }

  return (
    <Button
      type="button"
      variant={iconOnly ? "ghost" : "default"}
      size={iconOnly ? "sm" : "default"}
      className={cn(iconOnly && "shrink-0 outline h-8 w-8 p-0", className)}
      title={t("Copy")}
      onClick={handleCopy}
      {...props}
    >
      {iconOnly ? (
        <>
          <RiFileCopyLine className="size-[18px]" />
          <span className="sr-only">{t("Copy")}</span>
        </>
      ) : (
        children || t("Copy")
      )}
    </Button>
  )
}
