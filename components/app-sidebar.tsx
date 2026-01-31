"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  RiArrowRightSLine,
  RiExternalLinkLine,
} from "@remixicon/react"
import { getIconComponent } from "@/lib/icon-map"
import navs from "@/config/navs"
import type { NavItem } from "@/types/app-config"

const APP_NAME = "RustFS"
const RELEASE_VERSION = process.env.NEXT_PUBLIC_VERSION ?? ""

function NavIcon({ name }: { name?: string }) {
  const Icon = getIconComponent(name)
  if (!Icon) return null
  return <Icon className="size-4 shrink-0" />
}

function hasChildren(item: NavItem) {
  return Array.isArray(item.children) && item.children.length > 0
}

function isExternal(item: NavItem) {
  return Boolean(item.target) || /^https?:/i.test(item.to ?? "")
}

function normalizedTo(item: NavItem) {
  return item.to ?? "/"
}

export function AppSidebar() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const brandInitial = APP_NAME.charAt(0).toUpperCase() ?? "R"

  // Phase 0: show all nav items (no auth/permission filtering yet)
  const isAdmin = true
  const canAccessPath = (_path: string) => true

  const navGroups: NavItem[][] = []
  let current: NavItem[] = []

  for (const nav of navs) {
    let visibleChildren: NavItem[] = []
    if (nav.children?.length) {
      visibleChildren = nav.children.filter((child) => {
        if (child.to && !canAccessPath(child.to)) return false
        if (child.isAdminOnly && !isAdmin && !child.to) return false
        return true
      })
      if (visibleChildren.length === 0 && !nav.to) continue
    } else {
      if (nav.to && !canAccessPath(nav.to)) continue
      if (!nav.to && nav.isAdminOnly && !isAdmin) continue
    }

    const navItem = { ...nav }
    if (visibleChildren.length > 0) {
      navItem.children = visibleChildren
    } else {
      delete navItem.children
    }

    if (nav.type === "divider") {
      if (current.length) {
        navGroups.push(current)
        current = []
      }
      continue
    }

    current.push(navItem)
  }

  if (current.length) {
    navGroups.push(current)
  }

  const isRouteActive = (item: NavItem): boolean => {
    if (hasChildren(item)) {
      return item.children!.some((child) => isRouteActive(child))
    }
    if (!item.to || isExternal(item)) return false
    return pathname.startsWith(item.to)
  }

  const getLabel = (item: NavItem) => item.label

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-3">
          {isCollapsed ? (
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-md font-semibold text-primary-foreground">
              <span>{brandInitial}</span>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col px-3 py-4">
              <Image
                src="/logo.svg"
                alt="RustFS"
                width={64}
                height={16}
                className="h-4 w-auto"
              />
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="flex-1 pr-1">
          <div className="flex flex-col gap-4">
            {navGroups.map((group, groupIndex) => (
              <SidebarGroup key={groupIndex} className="gap-4 py-0">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.map((item) => (
                      <Collapsible
                        key={item.label}
                        asChild
                        defaultOpen={hasChildren(item) && isRouteActive(item)}
                        className="group/collapsible"
                      >
                        {hasChildren(item) ? (
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                isActive={isRouteActive(item)}
                                tooltip={getLabel(item)}
                                className="gap-3"
                              >
                                <NavIcon name={item.icon} />
                                <span className="flex-1 truncate">
                                  {getLabel(item)}
                                </span>
                                <RiArrowRightSLine className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.children!.map((child) => (
                                  <SidebarMenuSubItem key={child.label}>
                                    {isExternal(child) ? (
                                      <SidebarMenuSubButton asChild size="sm">
                                        <a
                                          href={normalizedTo(child)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex w-full items-center gap-2"
                                        >
                                          <NavIcon name={child.icon} />
                                          <span className="truncate">
                                            {getLabel(child)}
                                          </span>
                                          <RiExternalLinkLine className="ml-auto size-3 text-muted-foreground" />
                                        </a>
                                      </SidebarMenuSubButton>
                                    ) : (
                                      <SidebarMenuSubButton
                                        asChild
                                        size="sm"
                                        isActive={isRouteActive(child)}
                                      >
                                        <Link
                                          href={normalizedTo(child)}
                                          className="flex w-full items-center gap-2"
                                        >
                                          <NavIcon name={child.icon} />
                                          <span className="truncate">
                                            {getLabel(child)}
                                          </span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    )}
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        ) : (
                          <SidebarMenuItem>
                            {isExternal(item) ? (
                              <SidebarMenuButton asChild tooltip={getLabel(item)}>
                                <a
                                  href={normalizedTo(item)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex w-full items-center gap-3"
                                >
                                  <NavIcon name={item.icon} />
                                  <span className="flex-1 truncate">
                                    {getLabel(item)}
                                  </span>
                                  <RiExternalLinkLine className="size-3.5 text-muted-foreground" />
                                </a>
                              </SidebarMenuButton>
                            ) : (
                              <SidebarMenuButton
                                asChild
                                isActive={isRouteActive(item)}
                                tooltip={getLabel(item)}
                              >
                                <Link
                                  href={normalizedTo(item)}
                                  className="flex w-full items-center gap-3"
                                >
                                  <NavIcon name={item.icon} />
                                  <span className="flex-1 truncate">
                                    {getLabel(item)}
                                  </span>
                                </Link>
                              </SidebarMenuButton>
                            )}
                          </SidebarMenuItem>
                        )}
                      </Collapsible>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
                {groupIndex !== navGroups.length - 1 ? (
                  <SidebarSeparator className="mx-2" />
                ) : null}
              </SidebarGroup>
            ))}
          </div>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="mt-auto flex flex-col gap-3 px-2 pb-2">
        <div className="border-t py-2 text-center text-sm">
          RUSTFS {RELEASE_VERSION}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
