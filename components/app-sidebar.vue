<script setup lang="ts">
import { Icon } from '#components'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
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
} from '@/components/ui/sidebar'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import type { AppConfig, NavItem } from '~/types/app-config'

const appConfig = useAppConfig() as unknown as AppConfig
const route = useRoute()
const { t } = useI18n()
const { state } = useSidebar()
const { isAdmin, canAccessPath } = usePermissions()
const isCollapsed = computed(() => state.value === 'collapsed')
const brandInitial = computed(() => appConfig.name?.charAt(0)?.toUpperCase() ?? 'R')

const navGroups = computed(() => {
  const groups: NavItem[][] = []
  let current: NavItem[] = []

  for (const nav of appConfig.navs) {
    // Check children visibility
    let visibleChildren: NavItem[] = []
    if (nav.children?.length) {
      visibleChildren = nav.children.filter(child => {
        if (child.to && !canAccessPath(child.to)) return false
        
        // If child is admin only and user is not admin, but has permission (checked above), allow it.
        // If child has no path (unlikely for leaf) and is admin only, hide it.
        if (child.isAdminOnly && !isAdmin.value && !child.to) return false
        
        return true
      })

      // If no children are visible and parent has no link, skip
      if (visibleChildren.length === 0 && !nav.to) {
        continue
      }
    } else {
      // No children, check self
      if (nav.to && !canAccessPath(nav.to)) {
        continue
      }
      
      // If no path and no children (e.g. divider), check isAdminOnly
      if (!nav.to && nav.isAdminOnly && !isAdmin.value) {
         continue
      }
    }

    // Create a copy to avoid mutating original config
    const navItem = { ...nav }
    if (visibleChildren.length > 0) {
      navItem.children = visibleChildren
    } else {
      // If we kept the parent but filtered all children (and parent has link), remove children prop
      delete navItem.children
    }

    if (nav.type === 'divider') {
      if (current.length) {
        groups.push(current)
        current = []
      }
      continue
    }

    current.push(navItem)
  }

  if (current.length) {
    groups.push(current)
  }

  return groups
})

const hasChildren = (item: NavItem) => Array.isArray(item.children) && item.children.length > 0

const normalizedTo = (item: NavItem) => item.to || '/'

const isExternal = (item: NavItem) => Boolean(item.target) || /^https?:/i.test(item.to || '')

const isRouteActive = (item: NavItem): boolean => {
  if (hasChildren(item)) {
    return item.children!.some(child => isRouteActive(child))
  }

  if (!item.to || isExternal(item)) {
    return false
  }

  return route.path.startsWith(item.to)
}

const getLabel = (item: NavItem) => t(item.label)
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <NuxtLink to="/" class="flex items-center gap-3">
        <div
          v-if="isCollapsed"
          class="flex size-8 items-center justify-center rounded-lg bg-primary text-md font-semibold text-primary-foreground"
        >
          <span>{{ brandInitial }}</span>
        </div>
        <div v-if="!isCollapsed" class="flex min-w-0 flex-col px-3 py-4">
          <img src="~/assets/logo.svg" alt="RustFS" class="h-4" />
        </div>
      </NuxtLink>
    </SidebarHeader>

    <SidebarContent>
      <ScrollArea class="flex-1 pr-1">
        <div class="flex flex-col gap-4">
          <SidebarGroup v-for="(group, groupIndex) in navGroups" :key="groupIndex" class="gap-4 py-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <template v-for="item in group" :key="item.label">
                  <Collapsible
                    v-if="hasChildren(item)"
                    as-child
                    :default-open="isRouteActive(item)"
                    class="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger as-child>
                        <SidebarMenuButton :is-active="isRouteActive(item)" :tooltip="getLabel(item)" class="gap-3">
                          <Icon v-if="item.icon" :name="item.icon" class="size-4 shrink-0" />
                          <span class="flex-1 truncate">{{ getLabel(item) }}</span>
                          <Icon
                            name="ri:arrow-right-s-line"
                            class="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem v-for="child in item.children" :key="child.label">
                            <SidebarMenuSubButton v-if="isExternal(child)" as-child size="sm">
                              <a
                                :href="normalizedTo(child)"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="flex w-full items-center gap-2"
                              >
                                <Icon v-if="child.icon" :name="child.icon" class="size-3.5 shrink-0" />
                                <span class="truncate">{{ getLabel(child) }}</span>
                                <Icon name="ri:external-link-line" class="ml-auto size-3 text-muted-foreground" />
                              </a>
                            </SidebarMenuSubButton>
                            <SidebarMenuSubButton v-else as-child size="sm" :is-active="isRouteActive(child)">
                              <NuxtLink :to="normalizedTo(child)" class="flex w-full items-center gap-2">
                                <Icon v-if="child.icon" :name="child.icon" class="size-3.5 shrink-0" />
                                <span class="truncate">{{ getLabel(child) }}</span>
                              </NuxtLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                  <SidebarMenuItem v-else>
                    <SidebarMenuButton v-if="isExternal(item)" as-child :tooltip="getLabel(item)">
                      <a
                        :href="normalizedTo(item)"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex w-full items-center gap-3"
                      >
                        <Icon v-if="item.icon" :name="item.icon" class="size-4 shrink-0" />
                        <span class="flex-1 truncate">{{ getLabel(item) }}</span>
                        <Icon name="ri:external-link-line" class="size-3.5 text-muted-foreground" />
                      </a>
                    </SidebarMenuButton>
                    <SidebarMenuButton v-else as-child :is-active="isRouteActive(item)" :tooltip="getLabel(item)">
                      <NuxtLink :to="normalizedTo(item)" class="flex w-full items-center gap-3">
                        <Icon v-if="item.icon" :name="item.icon" class="size-4 shrink-0" />
                        <span class="flex-1 truncate">{{ getLabel(item) }}</span>
                      </NuxtLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </template>
              </SidebarMenu>
            </SidebarGroupContent>
            <SidebarSeparator v-if="groupIndex !== navGroups.length - 1" class="mx-2" />
          </SidebarGroup>
        </div>
      </ScrollArea>
    </SidebarContent>

    <SidebarFooter class="mt-auto flex flex-col gap-3 px-2 pb-2">
      <!--添加一块显示版本的地方  -->
      <div class="text-sm border-t py-2 text-center">RUSTFS {{ $siteConfig?.release?.version || '' }}</div>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>
</template>
