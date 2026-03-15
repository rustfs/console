"use client"

import { Button } from "@/components/ui/button"
import { RiGithubLine } from "@remixicon/react"
import { getThemeManifest } from "@/lib/theme/manifest"

export function LinksGithub() {
  const github = getThemeManifest().links.github
  if (!github) return null

  return (
    <Button variant="link" asChild>
      <a href={github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
        <RiGithubLine className="size-4" />
      </a>
    </Button>
  )
}
