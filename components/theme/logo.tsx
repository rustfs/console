"use client"

import Image, { type ImageProps } from "next/image"
import { useTheme } from "next-themes"
import { getThemeManifest } from "@/lib/theme/manifest"
import logoLight from "@/assets/logo.svg"
import logoDark from "@/assets/logo-dark.svg"

type ThemeLogoProps = Omit<ImageProps, "src" | "alt"> & {
  alt?: string
}

export function ThemeLogo({ alt, onError, ...props }: ThemeLogoProps) {
  const { resolvedTheme } = useTheme()
  const theme = getThemeManifest()
  const src = resolvedTheme === "dark" ? logoDark : logoLight

  return <Image {...props} src={src} alt={alt ?? theme.brand.name} onError={onError} />
}
