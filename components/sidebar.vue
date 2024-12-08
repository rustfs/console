<script lang="ts" setup>
import { RouterLink } from 'vue-router'
import { useSidebarStore } from '~/store/sidebar'
const appConfig = useAppConfig()
const sidebarStore = useSidebarStore();
const isCollapsed = computed(() => sidebarStore.isCollapsed);

const toggleSidebar = () => {
  sidebarStore.toggleSidebar();
};

const options = computed(() => {
  return appConfig.navs.map((nav) => {
    let item: { key: string; label: () => string | VNode; icon?: () => VNode; children?: any[] } = {
      key: nav.label,
      label: () => nav.to ? h(RouterLink, { to: nav.to }, { default: () => nav.label }) : nav.label,
      icon: nav.icon ? iconRender(nav.icon) : undefined
    }

    if (nav['children']) {
      item.children = nav['children'].map((child) => {
        return {
          key: child.label,
          type: 'item',
          label: () => h(RouterLink, { to: child.to }, { default: () => child.label }),
          icon: child.icon ? iconRender(child.icon) : undefined
        }
      })
    }

    return item
  })
})

</script>
<template>
  <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" :native-scrollbar="false" :collapsed="isCollapsed">
    <div class="flex flex-col min-h-screen gap-4">
      <div class="border-b dark:border-gray-600 flex flex-wrap items-center p-4" :class="isCollapsed ? 'justify-center' : 'justify-between'">
        <div>
          <n-avatar v-if="isCollapsed" class="text-center text-2xl">{{ appConfig.name.substring(0, 1) }}</n-avatar>
          <h2 v-else class="text-center text-2xl">{{ appConfig.name }}</h2>
        </div>
        <div v-if="!isCollapsed" class="px-4 flex items-center -mr-4">
          <Icon name="ri:menu-fold-fill" class="cursor-pointer text-xl" @click="toggleSidebar" />
        </div>
      </div>

      <n-menu :indent="26" :root-indent="12" :collapsed-width="64" :collapsed-icon-size="22" :options="options" default-expand-all class="flex-1" />

      <div v-if="isCollapsed" class="w-full flex items-center justify-center py-4">
        <Icon name="ri:menu-unfold-fill" class="cursor-pointer text-xl" @click="toggleSidebar" />
      </div>

      <div class="p-4">
        <UserDropdown :isCollapsed="isCollapsed" />
      </div>
    </div>
  </n-layout-sider>
</template>
