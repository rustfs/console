"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { TopNavBreadcrumb } from "@/components/top-nav-breadcrumb"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { LanguageSwitcher } from "@/components/language-switcher"
import { LinksGithub } from "@/components/links/github"
import { LinksX } from "@/components/links/x"
import { UserDropdown } from "@/components/user/dropdown"

export function AppTopNav() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background transition-[height] ease-linear backdrop-blur sm:h-16 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarTrigger className="-ms-1 shrink-0" />
        <TopNavBreadcrumb />
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
        <div className="hidden items-center gap-1 sm:flex sm:gap-2">
          <LinksGithub />
          <LinksX />
        </div>
        <UserDropdown />
      </div>
    </header>
  )
}
