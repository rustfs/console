"use client"

import { Button } from "@/components/ui/button"
import { RiGithubLine } from "@remixicon/react"
import { getThemeManifest } from "@/lib/theme/manifest"
import { withUtm } from "@/lib/utm"

export function LinksGithub() {
  const github = getThemeManifest().links.github
  if (!github) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      nativeButton={false}
      render={<a href={withUtm(github, "top-nav")} target="_blank" rel="noopener noreferrer" aria-label="GitHub" />}
    >
      <RiGithubLine className="size-4" aria-hidden />
    </Button>
  )
}
