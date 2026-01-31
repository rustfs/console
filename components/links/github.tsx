"use client"

import { Button } from "@/components/ui/button"
import { RiGithubLine } from "@remixicon/react"

export function LinksGithub() {
  return (
    <Button variant="link" asChild>
      <a
        href="https://github.com/rustfs/console"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1"
      >
        <RiGithubLine className="size-4" />
      </a>
    </Button>
  )
}
