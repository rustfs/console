<script setup lang="ts">
import { Icon } from '#components';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import LanguageSwitcher from '@/components/language-switcher.vue';
import ThemeSwitcher from '@/components/theme-switcher.vue';
import UserDropdown from '@/components/user-dropdown.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, RouterLink } from 'vue-router';
import type { AppConfig, NavItem } from '~/types/app-config';
import { icon } from '~/utils/ui';

const appConfig = useAppConfig() as unknown as AppConfig;
const route = useRoute();
const { t } = useI18n();
const { state } = useSidebar();

const isCollapsed = computed(() => state.value === 'collapsed');

const navGroups = computed(() => {
  const groups: NavItem[][] = [];
  let current: NavItem[] = [];

  for (const nav of appConfig.navs) {
    if (nav.type === 'divider') {
      if (current.length) {
        groups.push(current);
        current = [];
      }
      continue;
    }

    current.push(nav);
  }

  if (current.length) {
    groups.push(current);
  }

  return groups;
});

const normalizeTo = (item: NavItem) => item.to || '/';

const isExternalLink = (item: NavItem) => Boolean(item.target) || /^https?:/i.test(item.to || '');

const isRouteActive = (item: NavItem): boolean => {
  if (!item.to) {
    if (item.children?.length) {
      return item.children.some(child => isRouteActive(child));
    }

    return false;
  }

  if (item.children?.length) {
    return item.children.some(child => isRouteActive(child));
  }

  if (isExternalLink(item)) {
    return false;
  }

  return route.path.startsWith(item.to);
};

const renderLabel = (item: NavItem) => t(item.label);

const renderIcon = (item: NavItem) => {
  if (!item.icon) {
    return null;
  }

  return icon(item.icon);
};
</script>

<template>
  <Sidebar collapsible="icon" class="bg-sidebar text-sidebar-foreground">
    <SidebarHeader class="border-b border-sidebar-border px-4 py-3">
      <div class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          <span v-if="isCollapsed">{{ appConfig.name.substring(0, 1) }}</span>
          <img v-else src="~/assets/logo.svg" alt="RustFS" class="h-8" />
        </div>
        <div v-if="!isCollapsed" class="flex flex-col">
          <span class="text-sm font-semibold leading-tight">{{ appConfig.name }}</span>
          <span class="text-xs text-muted-foreground">{{ appConfig.description }}</span>
        </div>
      </div>
      <SidebarTrigger class="ml-auto" />
    </SidebarHeader>

    <SidebarContent class="px-2 py-4">
      <div class="flex flex-col gap-6">
        <template v-for="(group, groupIndex) in navGroups" :key="groupIndex">
          <SidebarMenu>
            <SidebarMenuItem v-for="item in group" :key="item.label">
              <component
                v-if="item.children?.length"
                :is="SidebarMenuButton"
                :is-active="isRouteActive(item)"
                class="items-start"
              >
                <component
                  :is="isExternalLink(item) ? 'a' : RouterLink"
                  :to="isExternalLink(item) ? undefined : normalizeTo(item)"
                  :href="isExternalLink(item) ? normalizeTo(item) : undefined"
                  :target="item.target"
                  class="flex flex-1 items-center gap-3"
                >
                  <component :is="renderIcon(item)" v-if="item.icon" />
                  <span class="flex-1 text-sm font-medium">{{ renderLabel(item) }}</span>
                </component>
              </component>
              <SidebarMenuSub v-if="item.children?.length">
                <SidebarMenuSubItem v-for="child in item.children" :key="child.label">
                  <SidebarMenuSubButton
                    as-child
                    size="sm"
                    :is-active="isRouteActive(child)"
                  >
                    <component
                      :is="isExternalLink(child) ? 'a' : RouterLink"
                      :to="isExternalLink(child) ? undefined : normalizeTo(child)"
                      :href="isExternalLink(child) ? normalizeTo(child) : undefined"
                      :target="child.target"
                      class="flex flex-1 items-center gap-2"
                    >
                      <component :is="renderIcon(child)" v-if="child.icon" />
                      <span>{{ renderLabel(child) }}</span>
                    </component>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
              <SidebarMenuButton v-else as-child :is-active="isRouteActive(item)">
                <component
                  :is="isExternalLink(item) ? 'a' : RouterLink"
                  :to="isExternalLink(item) ? undefined : normalizeTo(item)"
                  :href="isExternalLink(item) ? normalizeTo(item) : undefined"
                  :target="item.target"
                  class="flex w-full items-center gap-3"
                >
                  <component :is="renderIcon(item)" v-if="item.icon" />
                  <span class="flex-1 truncate text-sm font-medium">{{ renderLabel(item) }}</span>
                  <Icon
                    v-if="isExternalLink(item)"
                    name="ri:external-link-line"
                    class="h-3.5 w-3.5 text-muted-foreground"
                  />
                </component>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <div v-if="groupIndex !== navGroups.length - 1" class="border-t border-sidebar-border" />
        </template>
      </div>
    </SidebarContent>

    <SidebarFooter class="mt-auto border-t border-sidebar-border px-4 py-4">
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-1 gap-2" :class="{ 'grid-cols-1': isCollapsed, 'grid-cols-2': !isCollapsed }">
          <LanguageSwitcher />
          <ThemeSwitcher v-if="!isCollapsed" />
        </div>
        <UserDropdown :is-collapsed="isCollapsed" />
      </div>
    </SidebarFooter>
  </Sidebar>
  <SidebarRail />
</template>
