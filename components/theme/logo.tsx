"use client"

import Image, { type ImageProps } from "next/image"
import { useTheme } from "next-themes"
import { getThemeManifest } from "@/lib/theme/manifest"
import logoLight from "@/assets/logo.svg"
import logoDark from "@/assets/logo-dark.svg"
import symbolLight from "@/assets/logo-symbol.svg"
import symbolDark from "@/assets/logo-symbol-dark.svg"

type ThemeLogoProps = Omit<ImageProps, "src" | "alt"> & {
  alt?: string
  compact?: boolean
}

export function ThemeLogo({ alt, compact = false, onError, style, ...props }: ThemeLogoProps) {
  const { resolvedTheme } = useTheme()
  const theme = getThemeManifest()
  const src = compact
    ? resolvedTheme === "dark"
      ? symbolDark
      : symbolLight
    : resolvedTheme === "dark"
      ? logoDark
      : logoLight
  const width = typeof props.width === "number" ? `${props.width}px` : props.width
  const height = typeof props.height === "number" ? `${props.height}px` : props.height

  return (
    <Image
      {...props}
      src={src}
      alt={alt ?? theme.brand.name}
      style={{ width, height, objectFit: "contain", ...style }}
      onError={onError}
    />
  )
}
