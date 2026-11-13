"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { RiArrowRightSLine, RiExternalLinkLine } from "@remixicon/react"
import { getIconComponent } from "@/lib/icon-map"
import navs, { footerNavs } from "@/config/navs"
import type { NavItem } from "@/types/app-config"
import { usePermissions } from "@/hooks/use-permissions"
import { useFirstAccessibleDashboardRoute } from "@/hooks/use-first-accessible-dashboard-route"
import { canAccessDashboardRoute } from "@/lib/dashboard-route-meta"
import { getVisibleNavigation, groupNavigation, isExternalNav, isNavigationItemActive } from "@/lib/sidebar-navigation"
import { SidebarVersion } from "@/components/sidebars/version"
import { useDirection } from "@/components/ui/direction"
import { getThemeManifest } from "@/lib/theme/manifest"
import { withUtm } from "@/lib/utm"
import { ThemeLogo } from "@/components/theme/logo"

const theme = getThemeManifest()
const APP_NAME = theme.brand.name

function NavIcon({ name }: { name?: string }) {
  const Icon = getIconComponent(name)
  if (!Icon) return null
  return (
    // eslint-disable-next-line react-hooks/static-components -- icon from static map
    <Icon className="size-4 shrink-0" aria-hidden />
  )
}

function NavigationLink({ item, sub = false }: { item: NavItem; sub?: boolean }) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const external = isExternalNav(item)
  const active = isNavigationItemActive(item, pathname)
  const content = (
    <>
      <NavIcon name={item.icon} />
      <span className="flex-1 truncate">{t(item.label)}</span>
      {external ? <RiExternalLinkLine className="size-3.5 text-muted-foreground" aria-hidden /> : null}
    </>
  )
  const link = external ? (
    <a
      href={withUtm(item.to ?? "/", "sidebar")}
      target="_blank"
      rel="noopener noreferrer"
      title={t(item.label)}
      className="flex w-full items-center gap-3"
    >
      {content}
    </a>
  ) : (
    <Link
      href={item.to ?? "/"}
      aria-current={active ? "page" : undefined}
      title={t(item.label)}
      onNavigate={() => setOpenMobile(false)}
      className="flex w-full items-center gap-3"
    >
      {content}
    </Link>
  )
  return sub ? (
    <SidebarMenuSubButton size="sm" className="min-h-11 md:min-h-0" isActive={active} render={link} />
  ) : (
    <SidebarMenuButton isActive={active} tooltip={t(item.label)} render={link} />
  )
}

function NavigationGroup({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const active = isNavigationItemActive(item, pathname)
  const label = t(item.label)

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton isActive={active} tooltip={label} aria-label={label}>
                <NavIcon name={item.icon} />
                <span>{label}</span>
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent side="inline-end" align="start" className="min-w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{label}</DropdownMenuLabel>
              {item.children?.map((child) => (
                <DropdownMenuItem
                  key={child.to}
                  render={
                    <Link
                      href={child.to!}
                      aria-current={isNavigationItemActive(child, pathname) ? "page" : undefined}
                      onNavigate={() => setOpenMobile(false)}
                    >
                      <NavIcon name={child.icon} />
                      {t(child.label)}
                    </Link>
                  }
                />
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible
      key={`${item.label}-${active}`}
      defaultOpen={active}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton isActive={active} tooltip={label} className="gap-3">
            <NavIcon name={item.icon} />
            <span className="flex-1 truncate">{label}</span>
            <RiArrowRightSLine
              className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180"
              aria-hidden
            />
          </SidebarMenuButton>
        }
      />
      <CollapsibleContent>
        <SidebarMenuSub className="border-l-0 border-s rtl:-translate-x-px">
          {item.children?.map((child) => (
            <SidebarMenuSubItem key={child.to}>
              <NavigationLink item={child} sub />
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const isCollapsed = state === "collapsed" && !isMobile
  const dir = useDirection()
  const { isAdmin, canAccessPath, hasResolvedAdmin, hasFetchedPolicy } = usePermissions()
  const { route: homeRoute } = useFirstAccessibleDashboardRoute()
  if (!hasResolvedAdmin || (!isAdmin && !hasFetchedPolicy)) return null

  const canAccess = (path: string) => canAccessDashboardRoute(path, { isAdmin, canAccessPath })
  const groups = groupNavigation(getVisibleNavigation(navs, canAccess))
  const footer = getVisibleNavigation(footerNavs, canAccess)

  return (
    <Sidebar
      collapsible="icon"
      side={dir === "rtl" ? "right" : "left"}
      className="workspace-navigation **:data-[sidebar=menu-button]:text-start! **:data-[sidebar=menu-sub-button]:text-start!"
    >
      <SidebarHeader>
        <Link href={homeRoute ?? "/"} onNavigate={() => setOpenMobile(false)} className="flex items-center gap-3">
          {isCollapsed && theme.id === "default" ? (
            <ThemeLogo compact alt={APP_NAME} width={32} height={32} className="size-8 shrink-0" />
          ) : isCollapsed ? (
            <div className="flex size-8 items-center justify-center rounded-none bg-primary text-sm font-semibold text-primary-foreground">
              <span>{APP_NAME.charAt(0).toUpperCase()}</span>
            </div>
          ) : (
            <div className="flex min-w-0 items-baseline gap-2 px-3 py-4">
              <ThemeLogo width={112} height={22} className="shrink-0" alt={APP_NAME} priority />
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="flex-1 pe-1">
          <nav className="flex flex-col gap-3 pb-4" aria-label={t("Main navigation")}>
            {groups.map((group) => (
              <SidebarGroup key={group.label} className="gap-1 py-0">
                {group.label && !isCollapsed ? (
                  <SidebarGroupLabel className="h-auto min-h-6 py-1 whitespace-normal">
                    {t(group.label)}
                  </SidebarGroupLabel>
                ) : null}
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0">
                    {group.items.map((item) =>
                      item.children?.length ? (
                        <NavigationGroup key={item.label} item={item} />
                      ) : (
                        <SidebarMenuItem key={item.key ?? item.to}>
                          <NavigationLink item={item} />
                        </SidebarMenuItem>
                      ),
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </nav>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="mt-auto px-2 pb-2">
        <SidebarMenu>
          {footer.map((item) => (
            <SidebarMenuItem key={item.to}>
              <NavigationLink item={item} />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarVersion appName={APP_NAME} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
