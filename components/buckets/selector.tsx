"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { useBucket } from "@/hooks/use-bucket"
import { cn } from "@/lib/utils"

interface BucketSelectorProps {
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: boolean
  selectorClass?: string
  cacheKey?: string
  layout?: "inline" | "stacked"
  label?: string
  description?: string
}

export function BucketSelector({
  value,
  onChange,
  placeholder = "Please select bucket",
  disabled = false,
  selectorClass,
  layout = "inline",
  label,
  description,
}: BucketSelectorProps) {
  const { t } = useTranslation()
  const { listBuckets } = useBucket()

  const [buckets, setBuckets] = useState<Array<{ label: string; value: string }>>([])
  const [loading, setLoading] = useState(true)
  const hasAutoSelected = useRef(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const response = await listBuckets()
        const list = (response?.Buckets ?? [])
          .filter((b): b is { Name: string } => Boolean(b?.Name))
          .map((b) => ({
            label: b.Name,
            value: b.Name,
          }))
          .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
        if (!cancelled) setBuckets(list)
      } catch {
        if (!cancelled) setBuckets([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [listBuckets])

  useEffect(() => {
    if (!loading && buckets.length > 0 && value === null && !hasAutoSelected.current) {
      hasAutoSelected.current = true
      onChange(buckets[0].value)
    }
  }, [loading, buckets, value, onChange])

  const isLoading = loading
  const displayLabel = label || t("Bucket")

  const containerClasses = layout === "inline" ? "flex items-center gap-3" : "flex flex-col gap-2"

  const controlWrapperClasses = layout === "inline" ? "flex min-w-[220px] flex-col gap-1" : "flex flex-col gap-1"

  return (
    <div className={cn(containerClasses)}>
      <div className={controlWrapperClasses}>
        <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)} disabled={disabled || isLoading}>
          <SelectTrigger className={cn("min-w-[200px]", selectorClass)}>
            <SelectValue placeholder={t(placeholder)}>
              {value ? `${displayLabel}: ${buckets.find((b) => b.value === value)?.label ?? value}` : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {buckets.length ? (
              buckets.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-3 text-sm text-muted-foreground">{t("No options available")}</div>
            )}
          </SelectContent>
        </Select>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {isLoading && layout === "inline" && <Spinner className="size-4 text-muted-foreground" />}
    </div>
  )
}
