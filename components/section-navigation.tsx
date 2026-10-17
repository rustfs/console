"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

/** Shared by long configuration and reference pages; sections stay mounted. */
export function SectionNavigation({
  items,
  className,
}: {
  items: { href: string; label: string }[]
  className?: string
}) {
  const { t } = useTranslation()
  const [active, setActive] = useState(items[0]?.href)
  const ids = items.map((item) => item.href.slice(1)).join("\n")

  useEffect(() => {
    const sections = ids
      .split("\n")
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section))
    let frame = 0
    const update = () => {
      frame = 0
      const atBottom =
        window.scrollY > 0 &&
        Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2
      const current = atBottom
        ? sections.at(-1)
        : (sections.filter((section) => section.getBoundingClientRect().top <= 128).at(-1) ?? sections[0])
      if (current) setActive(`#${current.id}`)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [ids])

  return (
    <nav
      aria-label={t("Jump to section")}
      className={cn("section-navigation min-w-0 lg:sticky lg:top-24 lg:self-start", className)}
    >
      <div className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={active === item.href ? "location" : undefined}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              const section = document.getElementById(item.href.slice(1))
              if (!section) return
              event.preventDefault()
              window.history.replaceState(window.history.state, "", item.href)
              section.scrollIntoView({ block: "start" })
              if (event.detail === 0) {
                if (!section.hasAttribute("tabindex")) section.tabIndex = -1
                section.focus({ preventScroll: true })
              }
              setActive(item.href)
            }}
            className="shrink-0 border-s-2 border-transparent px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring lg:whitespace-normal"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
