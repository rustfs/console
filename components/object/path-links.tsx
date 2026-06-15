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

  const displaySegments: Segment[] =
    segments.length <= 6 ? segments : [...segments.slice(0, 3), { value: "…", index: -1 }, ...segments.slice(-3)]

  const handleClick = (segment: Segment) => {
    if (segment.index === -1) return
    const path = segments
      .slice(0, segment.index + 1)
      .map((s) => s.value)
      .join("/")
    onClick(path)
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-wrap items-center">
        {displaySegments.map((segment) => (
          <React.Fragment key={segment.index}>
            <span className="text-muted-foreground">&nbsp;/&nbsp;</span>
            {segment.index > -1 ? (
              <button
                type="button"
                onClick={() => handleClick(segment)}
                className="max-w-full break-all text-start text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                {segment.value}
              </button>
            ) : (
              <span className="break-all text-muted-foreground">{segment.value}</span>
            )}
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
