"use client"

import { useEffect, useMemo, useState } from "react"
import Image, { type ImageProps } from "next/image"
import { useTheme } from "next-themes"
import { resolveThemeAssetPath, themedPath } from "@/lib/theme/assets"

type ThemeImageProps = Omit<ImageProps, "src"> & {
  src: string
}

export function ThemeImage({ src, alt = "", onError, ...props }: ThemeImageProps) {
  const { resolvedTheme } = useTheme()
  const preferredSrc = useMemo(() => themedPath(src, { dark: resolvedTheme === "dark" }), [resolvedTheme, src])
  const fallbackSrc = useMemo(() => resolveThemeAssetPath(src), [src])
  const [currentSrc, setCurrentSrc] = useState(preferredSrc)

  useEffect(() => {
    setCurrentSrc(preferredSrc)
  }, [preferredSrc])

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={(event) => {
        setCurrentSrc((current) => (current === fallbackSrc ? current : fallbackSrc))
        onError?.(event)
      }}
    />
  )
}
