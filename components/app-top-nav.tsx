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
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 sm:px-8 xl:px-10">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarTrigger className="-ms-1 size-11 shrink-0 sm:size-8" />
        <TopNavBreadcrumb />
      </div>
      <div className="flex shrink-0 items-center gap-1 [&>[data-slot=button]]:size-11 sm:gap-2 sm:[&>[data-slot=button]]:size-9">
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
