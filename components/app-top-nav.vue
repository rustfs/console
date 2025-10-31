<template>
  <header
    class="flex h-16 shrink-0 items-center gap-2 justify-between border-b bg-background transition-[height] ease-linear backdrop-blur group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
  >
    <div class="flex items-center gap-2">
      <SidebarTrigger class="-ml-1" />
    </div>
    <div class="flex items-center gap-2">
      <LanguageSwitcher />
      <ThemeSwitcher />
      <LinksGithub />
      <LinksX />
      <UserDropdown />
    </div>
  </header>
</template>
