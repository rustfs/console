"use client"

import { useState, type ReactNode } from "react"
import { RiUploadCloud2Line } from "@remixicon/react"
import { cn } from "@/lib/utils"

interface UploadZoneProps {
  accept?: string
  disabled?: boolean
  name?: string
  className?: string
  icon?: React.ComponentType<{ className?: string }>
  children: ReactNode
  onChange?: (file: File | null) => void
}

export function UploadZone({
  accept,
  disabled = false,
  name = "upload-file",
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
        "flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed border-border/70 px-6 py-10 text-center transition hover:border-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        hovering && !disabled && "border-primary bg-primary/5",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input type="file" name={name} accept={accept} className="sr-only" disabled={disabled} onChange={onInputChange} />
      <Icon className="size-12 text-muted-foreground" aria-hidden />
      {children}
    </label>
  )
}
