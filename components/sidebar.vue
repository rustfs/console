<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { useSidebarStore } from '~/store/sidebar';
import type { AppConfig, NavItem } from '~/types/app-config';
import type { SiteConfig } from '~/types/config';

const { t } = useI18n();
const appConfig = useAppConfig() as unknown as AppConfig;
const route = useRoute();
const sidebarStore = useSidebarStore();
const isCollapsed = computed(() => sidebarStore.isCollapsed);

// 安全地获取 siteConfig，如果失败则使用默认值
let siteConfig: SiteConfig;
try {
  siteConfig = useNuxtApp().$siteConfig as SiteConfig;
} catch (error) {
  console.warn('Failed to load siteConfig, using defaults:', error);
  siteConfig = {
    serverHost: window.location.origin,
    api: { baseURL: `${window.location.origin}/rustfs/admin/v3` },
    s3: {
      endpoint: window.location.origin,
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
    },
  };
}

const toggleSidebar = () => {
  sidebarStore.toggleSidebar();
};

// 缓存导航配置的生成逻辑，避免每次重新计算
const navOptions = computed(() => {
  return appConfig.navs.map((nav: NavItem) => {
    let item: {
      key: string;
      type?: string;
      label: () => string | VNode;
      icon?: () => VNode;
      children?: any[];
    } = {
      key: nav.label,
      label: () =>
        nav.to
          ? nav.target
            ? h(
                'a',
                {
                  href: nav.to,
                  target: '_blank',
                },
                { default: () => t(nav.label) }
              )
            : h(RouterLink, { to: nav.to }, { default: () => t(nav.label) })
          : t(nav.label),
      icon: nav.icon ? iconRender(nav.icon) : undefined,
      type: nav.type,
    };

    if (nav['children']) {
      item.children = nav['children'].map(child => {
        return {
          key: child.label,
          type: 'item',
          label: () => h(RouterLink, { to: child.to || '/' }, { default: () => t(child.label) }),
          icon: child.icon ? iconRender(child.icon) : undefined,
        };
      });
    }

    return item;
  });
});

// 直接使用计算属性，不需要 readonly 包装
const menuOptions = navOptions;
</script>
<template>
  <n-layout-sider
    bordered
    class="min-h-full"
    collapse-mode="width"
    :collapsed-width="64"
    :width="240"
    :native-scrollbar="false"
    :collapsed="isCollapsed"
    v-if="route.path.startsWith('/auth') === false"
  >
    <div class="flex flex-col h-screen overflow-hidden gap-2 relative">
      <div
        class="border-b dark:border-neutral-800 flex flex-wrap h-16 items-center p-4"
        :class="isCollapsed ? 'justify-center' : 'justify-between'"
      >
        <div>
          <n-avatar v-if="isCollapsed" class="text-center text-2xl leading-none">
            {{ appConfig.name.substring(0, 1) }}
          </n-avatar>
          <h2 v-else class="text-center text-2xl flex">
            <img src="~/assets/logo.svg" class="max-w-28" alt="" />
            <span class="sr-only">{{ appConfig.name }}</span>
          </h2>
        </div>
        <div v-if="!isCollapsed" class="px-4 flex items-center -mr-4">
          <Icon name="ri:menu-fold-fill" class="cursor-pointer text-xl" @click="toggleSidebar" :title="t('Collapse')" />
        </div>
      </div>

      <div class="overflow-y-auto flex-1">
        <n-menu
          :indent="26"
          :root-indent="12"
          :collapsed-width="64"
          :collapsed-icon-size="22"
          :options="menuOptions"
          class="flex-1"
        />
      </div>

      <div v-if="isCollapsed" class="w-full flex items-center justify-center py-4">
        <Icon name="ri:menu-unfold-fill" class="cursor-pointer text-xl" @click="toggleSidebar" :title="t('Expand')" />
      </div>

      <div class="border-t dark:border-neutral-800 p-2" :class="{ 'flex justify-between items-center': !isCollapsed }">
        <!-- 语言切换组件 -->
        <div class="px-2 py-2">
          <div v-if="isCollapsed" class="flex justify-center">
            <n-tooltip placement="right" trigger="hover">
              <template #trigger>
                <div @click="toggleSidebar" class="cursor-pointer">
                  <Icon :name="isCollapsed ? 'ri:translate-2' : 'ri:translate'" class="text-xl" />
                </div>
              </template>
              {{ t('Language') }}
            </n-tooltip>
          </div>
          <language-switcher v-else />
        </div>

        <!-- 主题切换组件 -->
        <div class="px-2 py-2">
          <div v-if="isCollapsed" class="flex justify-center">
            <n-tooltip placement="right" trigger="hover">
              <template #trigger>
                <div @click="toggleSidebar" class="cursor-pointer">
                  <Icon name="ri:contrast-2-line" class="text-xl" />
                </div>
              </template>
              {{ t('Theme') }}
            </n-tooltip>
          </div>
          <theme-switcher v-else />
        </div>
      </div>

      <div class="sticky bottom-0 left-0 right-0">
        <UserDropdown :isCollapsed="isCollapsed" />
      </div>
    </div>
  </n-layout-sider>
</template>
