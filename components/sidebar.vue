<script lang="ts" setup>
import { RouterLink, useRouter } from 'vue-router'
import { useSidebarStore } from '~/store/sidebar'
import type { SiteConfig } from '~/types/config'
const appConfig = useAppConfig()
const siteConfig = useNuxtApp().$siteConfig as unknown as SiteConfig
const router = useRouter()
const sidebarStore = useSidebarStore()
const isCollapsed = computed(() => sidebarStore.isCollapsed)

const toggleSidebar = () => {
  sidebarStore.toggleSidebar()
}

const options = computed(() => {
  return appConfig.navs.map(
    (nav: {
      label: string
      to?: string
      icon?: string
      target?: string
      children?: {
        label: string
        to: string
        icon?: string
      }[]
    }) => {
      let item: {
        key: string
        label: () => string | VNode
        icon?: () => VNode
        children?: any[]
      } = {
        key: nav.label,
        label: () =>
          nav.to
            ? nav.target
              ? h(
                'a',
                {
                  href: nav.to,
                  target: '_blank'
                },
                { default: () => nav.label }
              )
              : h(RouterLink, { to: nav.to }, { default: () => nav.label })
            : nav.label,
        icon: nav.icon ? iconRender(nav.icon) : undefined
      }

      if (nav['children']) {
        item.children = nav['children'].map((child) => {
          return {
            key: child.label,
            type: 'item',
            label: () =>
              h(RouterLink, { to: child.to }, { default: () => child.label }),
            icon: child.icon ? iconRender(child.icon) : undefined
          }
        })
      }

      return item
    }
  )
})
</script>
<template>
  <n-layout-sider bordered class="min-h-full" collapse-mode="width" :collapsed-width="64" :width="240" :native-scrollbar="false" :collapsed="isCollapsed">
    <div class="flex flex-col h-screen overflow-hidden gap-4 relative">
      <div class="border-b dark:border-neutral-800 flex flex-wrap h-16 items-center p-4" :class="isCollapsed ? 'justify-center' : 'justify-between'">
        <div>
          <n-avatar v-if="isCollapsed" class="text-center text-2xl leading-none">
            {{ appConfig.name.substring(0, 1) }}
          </n-avatar>
          <h2 v-else class="text-center text-2xl flex">
            <img src="~/assets/logo.svg" class="max-w-28" alt="" />
            <img src="~/assets/pro.svg" v-if="siteConfig.license.name &&siteConfig.license.expired !=0 " class="ms-1">
            <img src="~/assets/OSS.svg" v-else class="ms-1">

            <span class="sr-only">{{ appConfig.name }}</span>
          </h2>
        </div>
        <div v-if="!isCollapsed" class="px-4 flex items-center -mr-4">
          <Icon name="ri:menu-fold-fill" class="cursor-pointer text-xl" @click="toggleSidebar" />
        </div>
      </div>

      <div class="overflow-y-auto flex-1">
        <n-menu :indent="26" :root-indent="12" :collapsed-width="64" :collapsed-icon-size="22" :options="options" default-expand-all class="flex-1" />
      </div>

      <div v-if="isCollapsed" class="w-full flex items-center justify-center py-4">
        <Icon name="ri:menu-unfold-fill" class="cursor-pointer text-xl" @click="toggleSidebar" />
      </div>

      <!-- <div v-if="!isCollapsed" class="flex flex-col p-4 text-gray-500">
        <div class="flex items-center gap-2">
          <Icon name="ri-server-line" />
          <span>当前版本: {{ siteConfig.release.version }}</span>
        </div>
        <div class="flex items-center gap-2">
          <Icon name="ri-calendar-line" />
          <span>构建日期：{{ siteConfig.release.date }}</span>
        </div>
        <div class="flex items-center gap-2">
          <Icon name="ri-verified-badge-line" />
          <span>授权协议：{{ siteConfig.license.name }}</span>
        </div>
      </div> -->

      <div class="p-4 sticky bottom-0 left-0 right-0">
        <UserDropdown :isCollapsed="isCollapsed" />
      </div>
    </div>
  </n-layout-sider>
</template>
