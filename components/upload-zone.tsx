"use client"

import { useState, type ReactNode } from "react"
import { RiUploadCloud2Line } from "@remixicon/react"
import { cn } from "@/lib/utils"

interface UploadZoneProps {
  accept?: string
  disabled?: boolean
  className?: string
  icon?: React.ComponentType<{ className?: string }>
  children: ReactNode
  onChange?: (file: File | null) => void
}

export function UploadZone({
  accept,
  disabled = false,
  className,
  icon: Icon = RiUploadCloud2Line,
  children,
  onChange,
}: UploadZoneProps) {
  const [hovering, setHovering] = useState(false)

  const handleFiles = (files?: FileList | null) => {
    if (!files || files.length === 0) {
      onChange?.(null)
      return
    }
    onChange?.(files[0] ?? null)
  }

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files)
    event.target.value = ""
  }

  const onDrop = (event: React.DragEvent) => {
    if (disabled) return
    event.preventDefault()
    setHovering(false)
    handleFiles(event.dataTransfer?.files)
  }

  const onDragOver = (event: React.DragEvent) => {
    if (disabled) return
    event.preventDefault()
    setHovering(true)
  }

  const onDragLeave = () => {
    setHovering(false)
  }

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 px-6 py-10 text-center transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        hovering && !disabled && "border-primary bg-primary/5",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input type="file" accept={accept} className="hidden" disabled={disabled} onChange={onInputChange} />
      <Icon className="h-12 w-12 text-muted-foreground" />
      {children}
    </label>
  )
}
