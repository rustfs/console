"use client"

import * as React from "react"
import { CommandItem } from "@/components/ui/command"

type MultiSelectCommandItemProps = Omit<React.ComponentProps<typeof CommandItem>, "aria-selected" | "data-checked"> & {
  selected: boolean
}

export function MultiSelectCommandItem({ selected, children, ...props }: MultiSelectCommandItemProps) {
  const itemRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const item = itemRef.current
    if (!item) return

    const syncSelection = () => {
      if (item.getAttribute("aria-selected") !== String(selected)) {
        item.setAttribute("aria-selected", String(selected))
      }
    }

    syncSelection()
    const observer = new MutationObserver(syncSelection)
    observer.observe(item, { attributes: true, attributeFilter: ["aria-selected"] })
    return () => observer.disconnect()
  }, [selected])

  return (
    <CommandItem ref={itemRef} {...props} data-checked={selected} aria-selected={selected}>
      {children}
    </CommandItem>
  )
}
