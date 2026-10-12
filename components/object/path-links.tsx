"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { copyToClipboard } from "@/lib/clipboard"
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react"

interface Segment {
  value: string
  index: number
}

interface ObjectPathLinksProps {
  objectKey: string
  bucketName?: string
  onClick: (path: string) => void
}

function useClipboard(value: string, copiedDuring = 3000) {
  const [copied, setCopied] = React.useState(false)

  const copy = React.useCallback(async () => {
    try {
      await copyToClipboard(value)
      setCopied(true)
      setTimeout(() => setCopied(false), copiedDuring)
    } catch {
      setCopied(false)
    }
  }, [value, copiedDuring])

  return { copy, copied }
}

export function ObjectPathLinks({ objectKey, bucketName, onClick }: ObjectPathLinksProps) {
  const { t } = useTranslation()
  const fullPath = bucketName ? `${bucketName}/${objectKey}` : objectKey
  const { copy, copied } = useClipboard(fullPath)

  const segments: Segment[] = objectKey
    .split("/")
    .filter(Boolean)
    .map((item, index) => ({ value: item, index }))

  const handleClick = (segment: Segment) => {
    const path = segments
      .slice(0, segment.index + 1)
      .map((s) => s.value)
      .join("/")
    onClick(path)
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div
        className="flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
        role="region"
        aria-label={t("Path")}
        tabIndex={0}
      >
        {segments.map((segment) => (
          <React.Fragment key={segment.index}>
            <span className="shrink-0 text-muted-foreground">&nbsp;/&nbsp;</span>
            <button
              type="button"
              onClick={() => handleClick(segment)}
              className="shrink-0 whitespace-nowrap text-start text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            >
              {segment.value}
            </button>
          </React.Fragment>
        ))}
      </div>
      {objectKey ? (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={copy} title={t("Copy Path")}>
          {copied ? (
            <RiCheckLine className="size-4 text-primary" aria-hidden />
          ) : (
            <RiFileCopyLine className="size-4" aria-hidden />
          )}
          <span className="sr-only">{t("Copy Path")}</span>
        </Button>
      ) : null}
    </div>
  )
}
